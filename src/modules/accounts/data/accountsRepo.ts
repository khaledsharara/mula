import { all, bool, first, int, run, transaction, write } from '../../shared/db/client';
import { useLiveQuery } from '../../shared/db/live';
import type { Account, AccountType, ID, Minor, PaymentType } from '../../shared/db/types';
import { newId } from '../../shared/utils/id';

type AccountRow = {
  id: string;
  name: string;
  type: AccountType;
  currency: string;
  initial_balance: number;
  color: string;
  icon: string;
  default_payment_type: PaymentType;
  identifiers: string;
  bank_balance: number | null;
  bank_balance_at: number | null;
  exclude_from_stats: number;
  archived: number;
  sort_order: number;
  created_at: number;
};

export function rowToAccount(r: AccountRow): Account {
  let identifiers: string[] = [];
  try {
    identifiers = JSON.parse(r.identifiers) as string[];
  } catch {
    identifiers = [];
  }
  return {
    id: r.id,
    name: r.name,
    type: r.type,
    currency: r.currency,
    initialBalance: r.initial_balance,
    color: r.color,
    icon: r.icon,
    defaultPaymentType: r.default_payment_type,
    identifiers,
    bankBalance: r.bank_balance,
    bankBalanceAt: r.bank_balance_at,
    excludeFromStats: bool(r.exclude_from_stats),
    archived: bool(r.archived),
    sortOrder: r.sort_order,
    createdAt: r.created_at,
  };
}

export async function listAccounts(includeArchived = false): Promise<Account[]> {
  const rows = await all<AccountRow>(
    `SELECT * FROM accounts ${includeArchived ? '' : 'WHERE archived = 0'} ORDER BY sort_order, created_at`,
  );
  return rows.map(rowToAccount);
}

export async function getAccount(id: ID): Promise<Account | null> {
  const r = await first<AccountRow>('SELECT * FROM accounts WHERE id = ?', [id]);
  return r ? rowToAccount(r) : null;
}

export type AccountInput = Omit<Account, 'id' | 'createdAt' | 'bankBalance' | 'bankBalanceAt' | 'sortOrder'> & {
  id?: ID;
  sortOrder?: number;
};

export async function saveAccount(input: AccountInput): Promise<ID> {
  const id = input.id ?? newId();
  const existing = input.id ? await getAccount(input.id) : null;
  const sortRow = await first<{ n: number }>('SELECT COALESCE(MAX(sort_order), -1) + 1 AS n FROM accounts');
  await write(
    ['accounts'],
    `INSERT OR REPLACE INTO accounts
      (id, name, type, currency, initial_balance, color, icon, default_payment_type, identifiers,
       bank_balance, bank_balance_at, exclude_from_stats, archived, sort_order, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.name.trim(),
      input.type,
      input.currency,
      input.initialBalance,
      input.color,
      input.icon,
      input.defaultPaymentType,
      JSON.stringify(input.identifiers.map((s) => s.trim()).filter(Boolean)),
      existing?.bankBalance ?? null,
      existing?.bankBalanceAt ?? null,
      int(input.excludeFromStats),
      int(input.archived),
      input.sortOrder ?? existing?.sortOrder ?? sortRow?.n ?? 0,
      existing?.createdAt ?? Date.now(),
    ],
  );
  return id;
}

export async function setBankBalance(accountId: ID, balance: Minor, at: number): Promise<void> {
  await write(
    ['accounts'],
    'UPDATE accounts SET bank_balance = ?, bank_balance_at = ? WHERE id = ? AND (bank_balance_at IS NULL OR bank_balance_at <= ?)',
    [balance, at, accountId, at],
  );
}

export async function deleteAccount(id: ID): Promise<void> {
  await transaction(['accounts', 'transactions'], async () => {
    await run('DELETE FROM transactions WHERE account_id = ? OR to_account_id = ?', [id, id]);
    await run('DELETE FROM accounts WHERE id = ?', [id]);
  });
}

export async function reorderAccounts(ids: ID[]): Promise<void> {
  await transaction(['accounts'], async () => {
    for (let i = 0; i < ids.length; i++) await run('UPDATE accounts SET sort_order = ? WHERE id = ?', [i, ids[i]]);
  });
}

/** Account whose identifiers include these last digits (card **9002 or account ****9001). */
export async function findAccountByIdentifier(last4: string | null): Promise<Account | null> {
  if (!last4) return null;
  const accounts = await listAccounts(true);
  return accounts.find((a) => a.identifiers.some((i) => i.endsWith(last4) || last4.endsWith(i))) ?? null;
}

/**
 * The account a name points to: a learned name (like a Wallet card name), then the account's own
 * name, then a name that contains it ("CIB Debit Card" → "CIB").
 */
export async function findAccountByHint(hint: string | null | undefined): Promise<Account | null> {
  const h = hint?.trim().toLowerCase();
  if (!h) return null;
  const accounts = await listAccounts();
  return (
    accounts.find((a) => a.identifiers.some((i) => i.trim().toLowerCase() === h)) ??
    accounts.find((a) => a.name.trim().toLowerCase() === h) ??
    accounts.find((a) => a.name.trim().length >= 3 && h.includes(a.name.trim().toLowerCase())) ??
    null
  );
}

/** Current balance per account in its own currency. */
export async function getBalances(): Promise<Record<ID, Minor>> {
  const rows = await all<{ id: string; balance: number }>(
    `SELECT a.id,
       a.initial_balance
       + COALESCE((SELECT SUM(CASE t.type WHEN 'income' THEN t.amount ELSE -t.amount END)
                   FROM transactions t WHERE t.account_id = a.id), 0)
       + COALESCE((SELECT SUM(t.to_amount) FROM transactions t
                   WHERE t.type = 'transfer' AND t.to_account_id = a.id), 0) AS balance
     FROM accounts a`,
  );
  const out: Record<ID, Minor> = {};
  for (const r of rows) out[r.id] = r.balance;
  return out;
}

/** Balance as of a moment, e.g. when the bank reported its own balance in an SMS. */
export async function getBalanceAt(accountId: ID, ts: number): Promise<Minor> {
  const r = await first<{ balance: number }>(
    `SELECT a.initial_balance
       + COALESCE((SELECT SUM(CASE t.type WHEN 'income' THEN t.amount ELSE -t.amount END)
                   FROM transactions t WHERE t.account_id = a.id AND t.date <= ?), 0)
       + COALESCE((SELECT SUM(t.to_amount) FROM transactions t
                   WHERE t.type = 'transfer' AND t.to_account_id = a.id AND t.date <= ?), 0) AS balance
     FROM accounts a WHERE a.id = ?`,
    [ts, ts, accountId],
  );
  return r?.balance ?? 0;
}

export type Reconciliation = { accountId: ID; bank: Minor; mula: Minor; gap: Minor; at: number };

/**
 * Compares each account's last bank-reported balance with Mula's balance at that same
 * moment. A positive gap means money left the account without a record.
 */
export async function getReconciliations(maxAgeDays = 14): Promise<Reconciliation[]> {
  const accounts = await listAccounts();
  const out: Reconciliation[] = [];
  for (const a of accounts) {
    if (a.bankBalance == null || a.bankBalanceAt == null) continue;
    if (Date.now() - a.bankBalanceAt > maxAgeDays * 86_400_000) continue;
    // Records are stamped to the minute; the SMS balance already includes that minute.
    const mula = await getBalanceAt(a.id, a.bankBalanceAt + 59_999);
    out.push({ accountId: a.id, bank: a.bankBalance, mula, gap: mula - a.bankBalance, at: a.bankBalanceAt });
  }
  return out;
}

export function useReconciliations() {
  return useLiveQuery(['accounts', 'transactions'], () => getReconciliations());
}

export function useAccounts(includeArchived = false) {
  return useLiveQuery(['accounts'], () => listAccounts(includeArchived), [includeArchived]);
}

export function useBalances() {
  return useLiveQuery(['accounts', 'transactions'], getBalances);
}

export function useAccount(id: ID | null | undefined) {
  return useLiveQuery(['accounts'], async () => (id ? getAccount(id) : null), [id]);
}
