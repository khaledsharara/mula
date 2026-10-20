import { listAccounts } from '../../accounts/data/accountsRepo';
import { convert } from '../../integrations/utils/fx';
import { createTransaction, rowToTx, type TxRow } from '../../transactions/data/transactionsRepo';
import type { TxInput, TxListItem } from '../../transactions/types';
import { instapayFee } from '../../transactions/utils/instapay';
import { all, bool, first, int, run, transaction, write } from '../../shared/db/client';
import { notify, useLiveQuery } from '../../shared/db/live';
import type { Account, Frequency, ID, Minor, PaymentType, Recurring, RecurringEnd, RecurringMode, TxType } from '../../shared/db/types';
import { getSettings } from '../../shared/settings/settingsStore';
import { newId } from '../../shared/utils/id';
import { dueIndexes, nextDue, upcomingDates } from '../utils/recurrence';

type RecurringRow = {
  id: string;
  name: string;
  type: TxType;
  amount: number | null;
  currency: string | null;
  account_id: string | null;
  to_account_id: string | null;
  category_id: string | null;
  payee_id: string | null;
  payment_type: PaymentType | null;
  note: string | null;
  is_instapay: number;
  frequency: Frequency;
  interval: number;
  start_date: number;
  end_type: RecurringEnd;
  end_date: number | null;
  end_count: number | null;
  occurrences: number;
  next_due: number | null;
  mode: RecurringMode;
  remind_days_before: number;
  active: number;
  created_at: number;
};

const toRecurring = (r: RecurringRow): Recurring => ({
  id: r.id,
  name: r.name,
  type: r.type,
  amount: r.amount,
  currency: r.currency,
  accountId: r.account_id,
  toAccountId: r.to_account_id,
  categoryId: r.category_id,
  payeeId: r.payee_id,
  paymentType: r.payment_type,
  note: r.note,
  isInstapay: bool(r.is_instapay),
  frequency: r.frequency,
  interval: r.interval,
  startDate: r.start_date,
  endType: r.end_type,
  endDate: r.end_date,
  endCount: r.end_count,
  occurrences: r.occurrences,
  nextDue: r.next_due,
  mode: r.mode,
  remindDaysBefore: r.remind_days_before,
  active: bool(r.active),
  createdAt: r.created_at,
});

export async function listRecurring(): Promise<Recurring[]> {
  const rows = await all<RecurringRow>('SELECT * FROM recurring ORDER BY active DESC, COALESCE(next_due, 9e15), name');
  return rows.map(toRecurring);
}

export async function getRecurring(id: ID): Promise<Recurring | null> {
  const r = await first<RecurringRow>('SELECT * FROM recurring WHERE id = ?', [id]);
  return r ? toRecurring(r) : null;
}

export type RecurringInput = Omit<Recurring, 'id' | 'occurrences' | 'nextDue' | 'createdAt'> & { id?: ID };

export async function saveRecurring(input: RecurringInput): Promise<ID> {
  const id = input.id ?? newId();
  const existing = input.id ? await getRecurring(input.id) : null;
  // Changing the schedule restarts counting from the new start date.
  const scheduleChanged =
    !existing ||
    existing.startDate !== input.startDate ||
    existing.frequency !== input.frequency ||
    existing.interval !== input.interval;
  const occurrences = scheduleChanged ? 0 : existing.occurrences;
  const due = nextDue(input, occurrences);
  await write(
    ['recurring'],
    `INSERT OR REPLACE INTO recurring
      (id, name, type, amount, currency, account_id, to_account_id, category_id, payee_id, payment_type, note, is_instapay,
       frequency, interval, start_date, end_type, end_date, end_count, occurrences, next_due, mode, remind_days_before, active, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id, input.name.trim(), input.type, input.amount, input.currency, input.accountId, input.toAccountId, input.categoryId,
      input.payeeId, input.paymentType, input.note, int(input.isInstapay), input.frequency, Math.max(1, input.interval),
      input.startDate, input.endType, input.endDate, input.endCount, occurrences, due, input.mode, input.remindDaysBefore,
      int(input.active), existing?.createdAt ?? Date.now(),
    ],
  );
  return id;
}

export async function deleteRecurring(id: ID): Promise<void> {
  await transaction(['recurring', 'inbox_items'], async () => {
    await run("DELETE FROM inbox_items WHERE recurring_id = ? AND status = 'pending'", [id]);
    await run('DELETE FROM recurring WHERE id = ?', [id]);
  });
}

export async function setRecurringActive(id: ID, active: boolean): Promise<void> {
  await write(['recurring'], 'UPDATE recurring SET active = ? WHERE id = ?', [int(active), id]);
}

export type Booking = { amount: Minor; original: TxInput['original']; toAmount: Minor | null };

/**
 * What one occurrence books on its account(s). A series can be charged in another currency
 * than its account's (an EGP subscription on a USD card): that amount is converted at the
 * rate of `date`. Null when a conversion needs a rate that isn't available (offline, nothing cached).
 */
export async function bookingAmounts(
  r: Pick<Recurring, 'type' | 'amount' | 'currency'>,
  from: Account,
  to: Account | null,
  date: number,
): Promise<Booking | null> {
  const charged = r.amount ?? 0;
  const chargeCcy = r.currency ?? from.currency;
  let amount = charged;
  let original: Booking['original'] = null;
  if (chargeCcy !== from.currency) {
    const c = await convert(charged, chargeCcy, from.currency, date);
    if (!c) return null;
    amount = c.amount;
    original = { amount: charged, currency: chargeCcy, rate: c.rate };
  }
  let toAmount: Minor | null = null;
  if (r.type === 'transfer' && to) {
    if (to.currency === from.currency) toAmount = amount;
    else if (to.currency === chargeCcy) toAmount = charged;
    else {
      const c = await convert(amount, from.currency, to.currency, date);
      if (!c) return null;
      toAmount = c.amount;
    }
  }
  return { amount, original, toAmount };
}

/**
 * Catches up every active series: auto-mode occurrences become transactions, confirm-mode
 * ones land in the inbox. Safe to call repeatedly (each occurrence is processed once).
 * An auto-mode payment in another currency that can't be converted yet waits in the inbox
 * instead of being booked at a guessed amount.
 */
export async function processDueRecurring(now = Date.now()): Promise<{ created: number; queued: number }> {
  const series = (await listRecurring()).filter((r) => r.active && r.nextDue != null && r.nextDue <= now);
  if (!series.length) return { created: 0, queued: 0 };
  const accounts = new Map((await listAccounts(true)).map((a) => [a.id, a]));
  let created = 0;
  let queued = 0;
  for (const r of series) {
    const due = dueIndexes(r, r.occurrences, now);
    const from = r.accountId ? accounts.get(r.accountId) : undefined;
    const to = r.toAccountId ? (accounts.get(r.toAccountId) ?? null) : null;
    for (const n of due) {
      const date = nextDue(r, n)!;
      const auto = r.mode === 'auto' && from && r.amount;
      const booked = auto ? await bookingAmounts(r, from, to, date) : null;
      if (booked) {
        await createTransaction({
          type: r.type,
          amount: booked.amount,
          accountId: from!.id,
          toAccountId: r.toAccountId,
          toAmount: booked.toAmount,
          categoryId: r.categoryId,
          payeeId: r.payeeId,
          paymentType: r.paymentType ?? 'bank_transfer',
          date,
          note: r.note ?? r.name,
          isInstapay: r.isInstapay,
          fee: r.isInstapay && r.type !== 'income' ? instapayFee(booked.amount, getSettings().instapayFee) : null,
          original: booked.original,
          recurringId: r.id,
          source: 'recurring',
        });
        created++;
      } else {
        await run(
          `INSERT OR IGNORE INTO inbox_items (id, source, raw_text, parsed, received_at, status, recurring_id, dedupe_key, note)
           VALUES (?, 'recurring', ?, NULL, ?, 'pending', ?, ?, ?)`,
          [newId(), r.name, date, r.id, `recurring|${r.id}|${n}`, auto ? 'Waiting for an exchange rate' : null],
        );
        queued++;
      }
    }
    const done = r.occurrences + due.length;
    await run('UPDATE recurring SET occurrences = ?, next_due = ? WHERE id = ?', [done, nextDue(r, done), r.id]);
  }
  notify(['recurring', 'inbox_items', 'transactions']);
  return { created, queued };
}

export type Upcoming = { recurring: Recurring; date: number };

export async function listUpcoming(days = 30, now = Date.now()): Promise<Upcoming[]> {
  const to = now + days * 86_400_000;
  const out: Upcoming[] = [];
  for (const r of await listRecurring()) {
    if (!r.active) continue;
    for (const date of upcomingDates(r, r.occurrences, now - 86_400_000, to, 3)) out.push({ recurring: r, date });
  }
  return out.sort((a, b) => a.date - b.date);
}

/** A bank charge: as charged (e.g. EGP on a USD card) and as booked on the account. */
export type ChargeAmounts = { charged: { amount: Minor; currency: string }; booked: { amount: Minor; currency: string | null } };

/**
 * A recurring payment the charge probably is (±3 days of a due date, amount within 1%).
 * Compared in the series' own currency: the amount as charged first, else as booked.
 */
export async function matchRecurring(m: ChargeAmounts, accountId: ID | null, at: number): Promise<Recurring | null> {
  const window = 3 * 86_400_000;
  for (const r of await listRecurring()) {
    if (!r.active || !r.amount) continue;
    if (accountId && r.accountId && r.accountId !== accountId) continue;
    const ccy = r.currency ?? m.booked.currency;
    const amount = ccy === m.charged.currency ? m.charged.amount : ccy === m.booked.currency ? m.booked.amount : null;
    if (amount == null || Math.abs(r.amount - amount) > Math.max(100, r.amount * 0.01)) continue;
    const near = [r.nextDue, r.occurrences > 0 ? nextDue(r, r.occurrences - 1) : null].some((d) => d != null && Math.abs(d - at) <= window);
    if (near) return r;
  }
  return null;
}

export function useRecurringList() {
  return useLiveQuery(['recurring'], listRecurring);
}

export function useRecurring(id: ID | null | undefined) {
  return useLiveQuery(['recurring'], async () => (id ? getRecurring(id) : null), [id]);
}

export function useUpcoming(days = 30) {
  return useLiveQuery(['recurring'], () => listUpcoming(days), [days]);
}

/** Records a series has produced (auto-logged or confirmed from the inbox), newest first. */
export async function listRecurringTransactions(recurringId: ID, limit = 200): Promise<TxListItem[]> {
  const rows = await all<TxRow & { fee_total: number }>(
    `SELECT t.*, (SELECT COALESCE(SUM(x.amount), 0) FROM transactions x WHERE x.parent_id = t.id) AS fee_total
     FROM transactions t
     WHERE t.recurring_id = ? AND t.parent_id IS NULL
     ORDER BY t.date DESC, t.created_at DESC
     LIMIT ?`,
    [recurringId, limit],
  );
  return rows.map((r) => ({ ...rowToTx(r), feeTotal: r.fee_total }));
}

export function useRecurringTransactions(id: ID | null | undefined) {
  return useLiveQuery(['transactions', 'recurring', 'payees', 'categories'], async () => (id ? listRecurringTransactions(id) : []), [id]);
}

/** Occurrences that fell due while a series was paused and haven't been processed yet. */
export function missedWhilePaused(r: Recurring, now = Date.now()): number {
  return r.active ? 0 : dueIndexes(r, r.occurrences, now).length;
}

/**
 * Moves a series past its unprocessed occurrences due on or before `now`, without logging
 * or queueing them: used when resuming a paused series, and after an existing series is
 * rescheduled (so dates already logged under the old schedule aren't logged again).
 * Returns how many were skipped.
 */
export async function skipMissedRecurring(id: ID, now = Date.now()): Promise<number> {
  const r = await getRecurring(id);
  if (!r) return 0;
  const missed = dueIndexes(r, r.occurrences, now);
  if (!missed.length) return 0;
  const done = r.occurrences + missed.length;
  await write(['recurring'], 'UPDATE recurring SET occurrences = ?, next_due = ? WHERE id = ?', [done, nextDue(r, done), id]);
  return missed.length;
}
