import { findAccountByHint, findAccountByIdentifier, listAccounts, setBankBalance } from '../../accounts/data/accountsRepo';
import { openDebtsForPayee, type DebtWithProgress } from '../../debts/data/debtsRepo';
import { convert } from '../../integrations/utils/fx';
import { findCategoryByHint } from '../../categories/data/categoriesRepo';
import { findOrCreatePayee, resolveAlias, setAlias } from '../../payees/data/payeesRepo';
import { bookingAmounts, getRecurring, matchRecurring } from '../../recurring/data/recurringRepo';
import { createTransaction, listTransactions } from '../../transactions/data/transactionsRepo';
import type { TxInput, TxListItem } from '../../transactions/types';
import { instapayFee } from '../../transactions/utils/instapay';
import { all, first, run, transaction, write } from '../../shared/db/client';
import { notify, useLiveQuery } from '../../shared/db/live';
import { SYSTEM_CATEGORIES } from '../../shared/db/seeds/categories';
import type {
  Account,
  ID,
  InboxItem,
  InboxSource,
  InboxStatus,
  ParsedMessage,
  Payee,
  PaymentType,
  Recurring,
  TxType,
} from '../../shared/db/types';
import { getSettings } from '../../shared/settings/settingsStore';
import { newId } from '../../shared/utils/id';
import { dedupeKey, findHoldPairs, isSamePayment, parseWalletTransaction } from '../utils/matching';
import { isOutflow, parseBankSms, suggestPayeeName } from '../utils/parser';

type InboxRow = {
  id: string;
  source: InboxSource;
  raw_text: string;
  parsed: string | null;
  received_at: number;
  status: InboxStatus;
  transaction_id: string | null;
  recurring_id: string | null;
  note: string | null;
  resolved_at: number | null;
};

const toItem = (r: InboxRow): InboxItem => ({
  id: r.id,
  source: r.source,
  rawText: r.raw_text,
  parsed: r.parsed ? (JSON.parse(r.parsed) as ParsedMessage) : null,
  receivedAt: r.received_at,
  status: r.status,
  transactionId: r.transaction_id,
  recurringId: r.recurring_id,
  note: r.note,
  resolvedAt: r.resolved_at,
});

export async function listInbox(status: InboxStatus | 'all' = 'pending', limit = 300): Promise<InboxItem[]> {
  const rows = await all<InboxRow>(
    `SELECT * FROM inbox_items ${status === 'all' ? '' : 'WHERE status = ?'} ORDER BY received_at DESC LIMIT ?`,
    status === 'all' ? [limit] : [status, limit],
  );
  return rows.map(toItem);
}

export async function getInboxItem(id: ID): Promise<InboxItem | null> {
  const r = await first<InboxRow>('SELECT * FROM inbox_items WHERE id = ?', [id]);
  return r ? toItem(r) : null;
}

export type PendingSummary = { count: number; oldest: number | null };

export async function pendingSummary(): Promise<PendingSummary> {
  const r = await first<{ n: number; oldest: number | null }>(
    "SELECT COUNT(*) AS n, MIN(received_at) AS oldest FROM inbox_items WHERE status = 'pending'",
  );
  return { count: r?.n ?? 0, oldest: r?.oldest ?? null };
}

/* ---------- Ingest ---------- */

export type IngestResult =
  | { result: 'added'; id: ID; autoConfirmed: boolean }
  | { result: 'duplicate' }
  | { result: 'ignored'; reason: string };

async function insertItem(source: InboxSource, rawText: string, parsed: ParsedMessage | null, receivedAt: number): Promise<ID | null> {
  const id = newId();
  const key = parsed ? dedupeKey(parsed, source, rawText) : `${source}|raw|${rawText}`;
  const before = await first<{ n: number }>('SELECT COUNT(*) AS n FROM inbox_items WHERE dedupe_key = ?', [key]);
  if (before?.n) return null;
  await run(
    `INSERT OR IGNORE INTO inbox_items (id, source, raw_text, parsed, received_at, status, dedupe_key)
     VALUES (?, ?, ?, ?, ?, 'pending', ?)`,
    [id, source, rawText, parsed ? JSON.stringify(parsed) : null, receivedAt, key],
  );
  return id;
}

/** Feeds one bank SMS (from Shortcuts, Android capture or pasted) into the inbox. */
export async function ingestSms(text: string, source: InboxSource = 'sms', receivedAt = Date.now(), sender: string | null = null): Promise<IngestResult> {
  const r = parseBankSms(text, receivedAt, { sender });
  if (r.status === 'ignored') return { result: 'ignored', reason: r.reason };
  const parsed = r.status === 'transaction' ? r.parsed : null;
  return ingestParsed(parsed, source, text.trim(), receivedAt);
}

/** Feeds an Apple Pay (Wallet automation) entry; merged into the matching SMS when both arrive. */
export async function ingestWalletTransaction(input: { amount?: string | number | null; merchant?: string | null; card?: string | null }, receivedAt = Date.now()): Promise<IngestResult> {
  const parsed = parseWalletTransaction(input, receivedAt);
  if (!parsed) return { result: 'ignored', reason: 'empty' };
  const raw = `Apple Pay: ${input.merchant ?? 'Unknown'} ${input.amount ?? ''} ${input.card ?? ''}`.trim();
  return ingestParsed(parsed, 'applepay', raw, receivedAt);
}

async function ingestParsed(parsed: ParsedMessage | null, source: InboxSource, rawText: string, receivedAt: number): Promise<IngestResult> {
  const id = await insertItem(source, rawText, parsed, receivedAt);
  if (!id) return { result: 'duplicate' };

  if (parsed?.balance != null && parsed.last4) {
    const account = await findAccountByIdentifier(parsed.last4);
    if (account && parsed.balanceCurrency === account.currency) {
      await setBankBalance(account.id, parsed.balance, parsed.occurredAt ?? receivedAt);
    }
  }

  await tidyInbox(id);
  notify(['inbox_items']);

  const item = await getInboxItem(id);
  if (item?.status === 'pending') {
    const s = await buildSuggestion(item);
    if (s.payee?.autoConfirm && s.ready && !s.possibleDuplicate) {
      await confirmItem(item.id, s.draft as TxInput);
      return { result: 'added', id, autoConfirmed: true };
    }
  }
  return { result: 'added', id, autoConfirmed: false };
}

/** Auto-resolves holds and merges Apple Pay duplicates around a newly added item. */
async function tidyInbox(newId_: ID): Promise<void> {
  const recent = await all<InboxRow>(
    "SELECT * FROM inbox_items WHERE received_at >= ? AND status IN ('pending', 'confirmed') ORDER BY received_at",
    [Date.now() - 3 * 86_400_000],
  );
  const items = recent.map(toItem);
  const fresh = items.find((i) => i.id === newId_);
  if (!fresh?.parsed) return;

  for (const [chargeId, refundId] of findHoldPairs(items)) {
    await run("UPDATE inbox_items SET status = 'dismissed', note = 'Card hold, reversed', resolved_at = ? WHERE id IN (?, ?)", [Date.now(), chargeId, refundId]);
  }

  const window = getSettings().mergeWindowMinutes;
  const other = items.find(
    (i) => i.id !== fresh.id && i.parsed && i.source !== fresh.source && (i.source === 'applepay' || fresh.source === 'applepay') && isSamePayment(i.parsed, fresh.parsed!, window),
  );
  if (other) {
    // Keep the SMS (it has the card, time and balance); drop the Apple Pay copy.
    const dropId = fresh.source === 'applepay' ? fresh.id : other.id;
    await run("UPDATE inbox_items SET status = 'merged', note = 'Same payment as the bank SMS', resolved_at = ? WHERE id = ?", [Date.now(), dropId]);
  }
}

/* ---------- Suggestions ---------- */

export type Suggestion = {
  item: InboxItem;
  draft: Partial<TxInput> & { type: TxType; amount: number; paymentType: PaymentType; date: number };
  account: Account | null;
  toAccount: Account | null;
  payee: Payee | null;
  /** The bank's name for the other side, e.g. "NOUR TEST PERSON" or "PAYMOB Sample Coffee Co". */
  rawName: string | null;
  /** First-time display name for `rawName`. */
  suggestedName: string | null;
  /** Outgoing InstaPay SMS never say who received the money. */
  needsPayee: boolean;
  original: { amount: number; currency: string; rate: number } | null;
  /** A planned payment in another currency than its account's, with no exchange rate yet: `draft.amount` is 0 until it's converted. */
  unconverted: { amount: number; currency: string } | null;
  possibleDuplicate: TxListItem | null;
  recurringMatch: Recurring | null;
  openDebts: DebtWithProgress[];
  /** Enough is known to confirm with one swipe. */
  ready: boolean;
};

const paymentFor: Record<ParsedMessage['kind'], PaymentType> = {
  card_purchase: 'debit_card',
  applepay_purchase: 'apple_pay',
  instapay_out: 'instapay',
  instapay_in: 'instapay',
  atm_withdrawal: 'cash',
  cash_deposit: 'cash',
  refund: 'debit_card',
  unknown_debit: 'debit_card',
  unknown_credit: 'bank_transfer',
};

export async function buildSuggestion(item: InboxItem): Promise<Suggestion> {
  if (item.source === 'recurring' && item.recurringId) return recurringSuggestion(item);
  const p = item.parsed;
  const accounts = await listAccounts();
  const base: Suggestion = {
    item,
    draft: { type: 'expense', amount: 0, paymentType: 'debit_card', date: item.receivedAt, source: 'sms', sourceRef: item.id },
    account: null,
    toAccount: null,
    payee: null,
    rawName: null,
    suggestedName: null,
    needsPayee: false,
    original: null,
    unconverted: null,
    possibleDuplicate: null,
    recurringMatch: null,
    openDebts: [],
    ready: false,
  };
  if (!p) return base;

  const account = (await findAccountByIdentifier(p.last4)) ?? (await findAccountByHint(p.accountHint)) ?? (accounts.length === 1 ? accounts[0] : null);
  const date = p.occurredAt ?? item.receivedAt;
  const out = isOutflow(p.kind);
  let type: TxType = out ? 'expense' : 'income';
  let toAccount: Account | null = null;
  let fromCash: Account | null = null;

  const cash = accounts.find((a) => a.type === 'cash' && a.currency === (account?.currency ?? p.currency)) ?? null;
  if (p.kind === 'atm_withdrawal' && cash && account) {
    type = 'transfer';
    toAccount = cash;
  }
  if (p.kind === 'cash_deposit' && cash && account) {
    type = 'transfer';
    fromCash = cash;
    toAccount = account;
  }
  if (p.toAccountHint) {
    const to = await findAccountByHint(p.toAccountHint);
    if (to && to.id !== account?.id) {
      type = 'transfer';
      toAccount = to;
    }
  }

  // Amount in the account's currency (e.g. a USD card charged in INR, or EGP on the USD card).
  let amount = p.amount;
  let original: Suggestion['original'] = null;
  const accountCcy = account?.currency ?? p.currency;
  if (account && p.currency !== account.currency) {
    const c = await convert(p.amount, p.currency, account.currency, date);
    if (c) {
      amount = c.amount;
      original = { amount: p.amount, currency: p.currency, rate: c.rate };
    }
  }

  const rawName = p.kind === 'atm_withdrawal' || p.kind === 'cash_deposit' ? null : p.counterparty;
  const payee = await resolveAlias(rawName);
  const suggestedName = rawName && !payee ? (p.kind === 'instapay_in' ? suggestPayeeName(rawName) : suggestPayeeName(rawName)) : null;

  let categoryId: string | null = payee?.defaultCategoryId ?? null;
  // A category the source named (Claude) beats the payee's usual one.
  if (p.categoryHint && type !== 'transfer') categoryId = (await findCategoryByHint(p.categoryHint, type === 'income' ? 'income' : 'expense'))?.id ?? categoryId;
  if (!categoryId && p.kind === 'refund') categoryId = SYSTEM_CATEGORIES.refunds;
  if (type === 'transfer') categoryId = null;

  const fee = p.kind === 'instapay_out' ? instapayFee(amount, getSettings().instapayFee) : null;

  const sourceAccount = fromCash ?? account;
  const draft: Suggestion['draft'] = {
    type,
    amount,
    accountId: sourceAccount?.id,
    toAccountId: toAccount?.id ?? null,
    toAmount: type === 'transfer' ? amount : null,
    categoryId,
    payeeId: payee?.id ?? null,
    paymentType: paymentFor[p.kind],
    date,
    isInstapay: p.kind === 'instapay_out' || p.kind === 'instapay_in',
    fee,
    original,
    note: p.note ?? null,
    source: item.source === 'applepay' ? 'applepay' : item.source === 'claude' ? 'claude' : 'sms',
    sourceRef: item.id,
  };

  const possibleDuplicate = sourceAccount ? await findPossibleDuplicate(sourceAccount.id, amount, date, type, original) : null;
  const recurringMatch = out
    ? await matchRecurring(
        { charged: { amount: p.amount, currency: p.currency }, booked: { amount, currency: original ? accountCcy : p.currency } },
        sourceAccount?.id ?? null,
        date,
      )
    : null;
  const openDebts = payee ? await openDebtsForPayee(payee.id) : [];

  const hasWho = Boolean(payee || suggestedName) || type === 'transfer';
  const ready = Boolean(sourceAccount) && (type === 'transfer' ? Boolean(toAccount) : Boolean(categoryId)) && hasWho && accountCcy != null;

  return {
    ...base,
    draft,
    account: sourceAccount,
    toAccount,
    payee,
    rawName,
    suggestedName,
    needsPayee: p.kind === 'instapay_out' && !payee,
    original,
    possibleDuplicate,
    recurringMatch,
    openDebts,
    ready,
  };
}

async function recurringSuggestion(item: InboxItem): Promise<Suggestion> {
  const r = await getRecurring(item.recurringId!);
  const accounts = await listAccounts();
  const account = accounts.find((a) => a.id === r?.accountId) ?? null;
  const toAccount = accounts.find((a) => a.id === r?.toAccountId) ?? null;
  const date = item.receivedAt;
  // Charged in another currency than the account's: book it converted at that day's rate.
  const booked = r && account && r.amount ? await bookingAmounts(r, account, toAccount, date) : null;
  const unconverted = r?.amount && account && !booked ? { amount: r.amount, currency: r.currency ?? account.currency } : null;
  const amount = booked?.amount ?? (unconverted ? 0 : (r?.amount ?? 0));
  const original = booked?.original ?? null;
  const type = r?.type ?? 'expense';
  return {
    item,
    draft: {
      type,
      amount,
      accountId: account?.id,
      toAccountId: toAccount?.id ?? null,
      toAmount: type === 'transfer' ? (booked?.toAmount ?? amount) : null,
      categoryId: r?.categoryId ?? null,
      payeeId: r?.payeeId ?? null,
      paymentType: r?.paymentType ?? 'bank_transfer',
      date,
      note: r?.note ?? r?.name ?? null,
      isInstapay: r?.isInstapay ?? false,
      fee: r?.isInstapay && type !== 'income' ? instapayFee(amount, getSettings().instapayFee) : null,
      original,
      recurringId: r?.id ?? null,
      source: 'recurring',
      sourceRef: item.id,
    },
    account,
    toAccount,
    payee: null,
    rawName: null,
    suggestedName: null,
    needsPayee: false,
    original,
    unconverted,
    possibleDuplicate: account && amount ? await findPossibleDuplicate(account.id, amount, date, type, original) : null,
    recurringMatch: r,
    openDebts: [],
    ready: Boolean(account && amount && (type === 'transfer' ? toAccount : r?.categoryId)),
  };
}

/**
 * A manual entry that already covers this payment (same account, within 3 hours, and the same
 * amount, or the same amount as charged when it was in another currency).
 */
async function findPossibleDuplicate(accountId: ID, amount: number, date: number, type: TxType, original?: Suggestion['original']): Promise<TxListItem | null> {
  const window = 3 * 3_600_000;
  const candidates = await listTransactions({ accountId, from: date - window, to: date + window, types: [type], limit: 20 });
  const same = (t: TxListItem) =>
    t.amount === amount || (original != null && t.originalAmount === original.amount && t.originalCurrency === original.currency);
  return candidates.find((t) => same(t) && (t.source === 'manual' || t.source === 'recurring')) ?? null;
}

/* ---------- Resolve ---------- */

export type ConfirmOptions = {
  /** Save "raw bank name → payee" for next time. */
  alias?: { raw: string; payeeId: ID; relabelPast?: boolean } | null;
};

export async function confirmItem(itemId: ID, input: TxInput, opts: ConfirmOptions = {}): Promise<ID> {
  const item = await getInboxItem(itemId);
  const txId = await createTransaction({
    ...input,
    source: input.source ?? (item?.source === 'applepay' ? 'applepay' : item?.source === 'recurring' ? 'recurring' : 'sms'),
    sourceRef: itemId,
    recurringId: input.recurringId ?? item?.recurringId ?? null,
  });
  if (opts.alias) await setAlias(opts.alias.raw, opts.alias.payeeId, { relabelPast: opts.alias.relabelPast });
  await write(
    ['inbox_items'],
    "UPDATE inbox_items SET status = 'confirmed', transaction_id = ?, resolved_at = ? WHERE id = ?",
    [txId, Date.now(), itemId],
  );
  return txId;
}

/**
 * Creates the payee for a first-seen bank name and remembers the alias, so the next SMS
 * from the same merchant or sender is recognized.
 */
export async function payeeForRawName(name: string, raw: string | null, kind: 'person' | 'merchant'): Promise<Payee> {
  const payee = await findOrCreatePayee(name, kind);
  if (raw) await setAlias(raw, payee.id);
  return payee;
}

export async function linkToExisting(itemId: ID, transactionId: ID): Promise<void> {
  await write(
    ['inbox_items'],
    "UPDATE inbox_items SET status = 'merged', transaction_id = ?, note = 'Linked to an existing record', resolved_at = ? WHERE id = ?",
    [transactionId, Date.now(), itemId],
  );
}

export async function dismissItem(itemId: ID, note: string | null = null): Promise<void> {
  await write(['inbox_items'], "UPDATE inbox_items SET status = 'dismissed', note = COALESCE(?, note), resolved_at = ? WHERE id = ?", [note, Date.now(), itemId]);
}

export async function restoreItem(itemId: ID): Promise<void> {
  await write(['inbox_items'], "UPDATE inbox_items SET status = 'pending', transaction_id = NULL, resolved_at = NULL WHERE id = ?", [itemId]);
}

export async function deleteResolvedOlderThan(days: number): Promise<void> {
  await transaction(['inbox_items'], async () => {
    await run("DELETE FROM inbox_items WHERE status != 'pending' AND resolved_at < ?", [Date.now() - days * 86_400_000]);
  });
}

/* ---------- Hooks ---------- */

export function useInbox(status: InboxStatus | 'all' = 'pending') {
  return useLiveQuery(['inbox_items'], () => listInbox(status), [status]);
}

export function usePendingSummary() {
  return useLiveQuery(['inbox_items'], pendingSummary);
}

export function useSuggestion(item: InboxItem | null | undefined) {
  return useLiveQuery(
    ['inbox_items', 'payees', 'payee_aliases', 'accounts', 'transactions', 'recurring', 'debts'],
    async () => (item ? buildSuggestion(item) : null),
    [item?.id, item?.status],
  );
}
