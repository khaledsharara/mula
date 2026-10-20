import { getAccount } from '../../accounts/data/accountsRepo';
import { getRate } from '../../integrations/utils/fx';
import { learnFromUse } from '../../payees/data/payeesRepo';
import { all, bool, first, int, run, transaction, type Params } from '../../shared/db/client';
import { useLiveQuery } from '../../shared/db/live';
import { SYSTEM_CATEGORIES } from '../../shared/db/seeds/categories';
import type { ID, Nature, PaymentType, Transaction, TxSource, TxType } from '../../shared/db/types';
import { getSettings, setSetting } from '../../shared/settings/settingsStore';
import { newId } from '../../shared/utils/id';
import type { TxFilter, TxInput, TxListItem } from '../types';

export type TxRow = {
  id: string;
  type: TxType;
  amount: number;
  currency: string;
  account_id: string;
  to_account_id: string | null;
  to_amount: number | null;
  category_id: string | null;
  payee_id: string | null;
  payment_type: PaymentType;
  date: number;
  note: string | null;
  is_instapay: number;
  parent_id: string | null;
  nature_override: Nature | null;
  original_amount: number | null;
  original_currency: string | null;
  fx_rate: number | null;
  base_amount: number;
  recurring_id: string | null;
  debt_id: string | null;
  source: TxSource;
  source_ref: string | null;
  created_at: number;
  updated_at: number;
};

export const rowToTx = (r: TxRow): Transaction => ({
  id: r.id,
  type: r.type,
  amount: r.amount,
  currency: r.currency,
  accountId: r.account_id,
  toAccountId: r.to_account_id,
  toAmount: r.to_amount,
  categoryId: r.category_id,
  payeeId: r.payee_id,
  paymentType: r.payment_type,
  date: r.date,
  note: r.note,
  isInstapay: bool(r.is_instapay),
  parentId: r.parent_id,
  natureOverride: r.nature_override,
  originalAmount: r.original_amount,
  originalCurrency: r.original_currency,
  fxRate: r.fx_rate,
  baseAmount: r.base_amount,
  recurringId: r.recurring_id,
  debtId: r.debt_id,
  source: r.source,
  sourceRef: r.source_ref,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

async function toBase(amount: number, currency: string, date: number): Promise<number> {
  const base = getSettings().baseCurrency;
  if (currency === base) return amount;
  const rate = await getRate(currency, base, date);
  return rate == null ? amount : Math.round(amount * rate);
}

async function insertRow(id: ID, t: TxInput, currency: string, baseAmount: number, parentId: ID | null, now: number) {
  await run(
    `INSERT INTO transactions
      (id, type, amount, currency, account_id, to_account_id, to_amount, category_id, payee_id, payment_type, date, note,
       is_instapay, parent_id, nature_override, original_amount, original_currency, fx_rate, base_amount,
       recurring_id, debt_id, source, source_ref, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      t.type,
      Math.abs(t.amount),
      currency,
      t.accountId,
      t.type === 'transfer' ? (t.toAccountId ?? null) : null,
      t.type === 'transfer' ? Math.abs(t.toAmount ?? t.amount) : null,
      t.type === 'transfer' ? null : (t.categoryId ?? null),
      t.payeeId ?? null,
      t.paymentType,
      t.date,
      t.note?.trim() || null,
      int(Boolean(t.isInstapay)),
      parentId,
      t.natureOverride ?? null,
      t.original?.amount ?? null,
      t.original?.currency ?? null,
      t.original?.rate ?? null,
      baseAmount,
      t.recurringId ?? null,
      t.debtId ?? null,
      t.source ?? 'manual',
      t.sourceRef ?? null,
      now,
      now,
    ] as Params,
  );
}

async function writeFee(parentId: ID, t: TxInput, currency: string, now: number) {
  const fee = t.fee ?? 0;
  if (fee <= 0) return;
  const feeInput: TxInput = {
    type: 'expense',
    amount: fee,
    accountId: t.accountId,
    categoryId: SYSTEM_CATEGORIES.fees,
    paymentType: t.paymentType,
    date: t.date,
    note: t.isInstapay ? 'InstaPay fee' : 'Fee',
    isInstapay: t.isInstapay,
    source: t.source,
    debtId: null,
  };
  await insertRow(newId(), feeInput, currency, await toBase(fee, currency, t.date), parentId, now);
}

/** Creates a transaction (plus its fee row) and teaches the payee its category and account. */
export async function createTransaction(t: TxInput): Promise<ID> {
  const account = await getAccount(t.accountId);
  if (!account) throw new Error('Account not found');
  const id = newId();
  const now = Date.now();
  const base = await toBase(Math.abs(t.amount), account.currency, t.date);
  await transaction(['transactions', 'payees'], async () => {
    await insertRow(id, t, account.currency, base, null, now);
    await writeFee(id, t, account.currency, now);
  });
  if (t.payeeId) await learnFromUse(t.payeeId, t.type === 'transfer' ? null : (t.categoryId ?? null), t.accountId);
  if (t.source === 'manual' || !t.source) void setSetting('lastAccountId', t.accountId);
  return id;
}

export async function updateTransaction(id: ID, t: TxInput): Promise<void> {
  const account = await getAccount(t.accountId);
  if (!account) throw new Error('Account not found');
  const existing = await getTransaction(id);
  const now = Date.now();
  const base = await toBase(Math.abs(t.amount), account.currency, t.date);
  await transaction(['transactions', 'payees'], async () => {
    await run('DELETE FROM transactions WHERE parent_id = ?', [id]);
    await run('DELETE FROM transactions WHERE id = ?', [id]);
    await insertRow(id, { ...t, source: existing?.source ?? t.source, sourceRef: existing?.sourceRef ?? t.sourceRef }, account.currency, base, null, now);
    if (existing) await run('UPDATE transactions SET created_at = ? WHERE id = ?', [existing.createdAt, id]);
    await writeFee(id, t, account.currency, now);
  });
  if (t.payeeId) await learnFromUse(t.payeeId, t.type === 'transfer' ? null : (t.categoryId ?? null), t.accountId);
}

export async function deleteTransaction(id: ID): Promise<Transaction | null> {
  const existing = await getTransaction(id);
  await transaction(['transactions', 'inbox_items'], async () => {
    await run('DELETE FROM transactions WHERE parent_id = ? OR id = ?', [id, id]);
    // Detected items that produced this record go back to the inbox instead of vanishing.
    await run("UPDATE inbox_items SET status = 'pending', transaction_id = NULL, resolved_at = NULL WHERE transaction_id = ?", [id]);
  });
  return existing;
}

export async function getTransaction(id: ID): Promise<Transaction | null> {
  const r = await first<TxRow>('SELECT * FROM transactions WHERE id = ?', [id]);
  return r ? rowToTx(r) : null;
}

export async function getFeeTotal(id: ID): Promise<number> {
  const r = await first<{ n: number }>('SELECT COALESCE(SUM(amount), 0) AS n FROM transactions WHERE parent_id = ?', [id]);
  return r?.n ?? 0;
}

function filterSql(f: TxFilter): [string, Params] {
  const where: string[] = ['t.parent_id IS NULL'];
  const params: Params = [];
  if (f.accountId) {
    where.push('(t.account_id = ? OR t.to_account_id = ?)');
    params.push(f.accountId, f.accountId);
  }
  if (f.categoryIds?.length) {
    where.push(`t.category_id IN (${f.categoryIds.map(() => '?').join(',')})`);
    params.push(...f.categoryIds);
  }
  if (f.payeeId) {
    where.push('t.payee_id = ?');
    params.push(f.payeeId);
  }
  if (f.debtId) {
    where.push('t.debt_id = ?');
    params.push(f.debtId);
  }
  if (f.types?.length) {
    where.push(`t.type IN (${f.types.map(() => '?').join(',')})`);
    params.push(...f.types);
  }
  if (f.from != null) {
    where.push('t.date >= ?');
    params.push(f.from);
  }
  if (f.to != null) {
    where.push('t.date <= ?');
    params.push(f.to);
  }
  if (f.search?.trim()) {
    const q = `%${f.search.trim()}%`;
    where.push(`(t.note LIKE ? OR p.name LIKE ? OR c.name LIKE ? OR CAST(t.amount / 100.0 AS TEXT) LIKE ?)`);
    params.push(q, q, q, q);
  }
  return [where.join(' AND '), params];
}

export async function listTransactions(f: TxFilter = {}): Promise<TxListItem[]> {
  const [where, params] = filterSql(f);
  const rows = await all<TxRow & { fee_total: number }>(
    `SELECT t.*, (SELECT COALESCE(SUM(x.amount), 0) FROM transactions x WHERE x.parent_id = t.id) AS fee_total
     FROM transactions t
     LEFT JOIN payees p ON p.id = t.payee_id
     LEFT JOIN categories c ON c.id = t.category_id
     WHERE ${where}
     ORDER BY t.date DESC, t.created_at DESC
     LIMIT ?`,
    [...params, f.limit ?? 500],
  );
  return rows.map((r) => ({ ...rowToTx(r), feeTotal: r.fee_total }));
}

/** Every row in a period, fee rows included, for statistics. */
export async function listForStats(from: number, to: number): Promise<Transaction[]> {
  const rows = await all<TxRow>('SELECT * FROM transactions WHERE date >= ? AND date <= ? ORDER BY date', [from, to]);
  return rows.map(rowToTx);
}

export async function countTransactions(): Promise<number> {
  const r = await first<{ n: number }>('SELECT COUNT(*) AS n FROM transactions WHERE parent_id IS NULL');
  return r?.n ?? 0;
}

/** Recomputes base amounts that were stored before a rate was available (e.g. offline). */
export async function repairBaseAmounts(): Promise<void> {
  const base = getSettings().baseCurrency;
  const rows = await all<TxRow>('SELECT * FROM transactions WHERE currency != ? AND base_amount = amount', [base]);
  if (!rows.length) return;
  await transaction(['transactions'], async () => {
    for (const r of rows) {
      const rate = await getRate(r.currency, base, r.date);
      if (rate != null && rate !== 1) await run('UPDATE transactions SET base_amount = ? WHERE id = ?', [Math.round(r.amount * rate), r.id]);
    }
  });
}

export function useTransactions(f: TxFilter, deps: unknown[]) {
  return useLiveQuery(['transactions', 'payees', 'categories'], () => listTransactions(f), deps);
}

export function useTransaction(id: ID | null | undefined) {
  return useLiveQuery(['transactions'], async () => (id ? getTransaction(id) : null), [id]);
}
