import { createTransaction } from '../../transactions/data/transactionsRepo';
import { instapayFee } from '../../transactions/utils/instapay';
import { all, first, run, transaction, write } from '../../shared/db/client';
import { useLiveQuery } from '../../shared/db/live';
import type { Debt, DebtDirection, DebtStatus, ID, Minor, PaymentType } from '../../shared/db/types';
import { getSettings } from '../../shared/settings/settingsStore';
import { newId } from '../../shared/utils/id';

type DebtRow = {
  id: string;
  direction: DebtDirection;
  payee_id: string;
  account_id: string | null;
  amount: number;
  currency: string;
  date: number;
  due_date: number | null;
  note: string | null;
  status: DebtStatus;
  closed_at: number | null;
  created_at: number;
  repaid?: number;
  payee_name?: string;
};

export type DebtWithProgress = Debt & { repaid: Minor; remaining: Minor; payeeName: string };

const toDebt = (r: DebtRow): DebtWithProgress => {
  const repaid = r.repaid ?? 0;
  return {
    id: r.id,
    direction: r.direction,
    payeeId: r.payee_id,
    accountId: r.account_id,
    amount: r.amount,
    currency: r.currency,
    date: r.date,
    dueDate: r.due_date,
    note: r.note,
    status: r.status,
    closedAt: r.closed_at,
    createdAt: r.created_at,
    repaid,
    remaining: Math.max(0, r.amount - repaid),
    payeeName: r.payee_name ?? '',
  };
};

/** Repayments are the linked transactions flowing the opposite way to the original loan. */
const SELECT = `
  SELECT d.*, p.name AS payee_name,
    COALESCE((SELECT SUM(t.amount) FROM transactions t WHERE t.debt_id = d.id AND t.parent_id IS NULL
      AND t.type = CASE d.direction WHEN 'lent' THEN 'income' ELSE 'expense' END), 0) AS repaid
  FROM debts d LEFT JOIN payees p ON p.id = d.payee_id`;

export async function listDebts(): Promise<DebtWithProgress[]> {
  const rows = await all<DebtRow>(`${SELECT} ORDER BY d.status = 'closed', COALESCE(d.due_date, 9e15), d.date DESC`);
  return rows.map(toDebt);
}

export async function getDebt(id: ID): Promise<DebtWithProgress | null> {
  const r = await first<DebtRow>(`${SELECT} WHERE d.id = ?`, [id]);
  return r ? toDebt(r) : null;
}

export async function openDebtsForPayee(payeeId: ID): Promise<DebtWithProgress[]> {
  const rows = await all<DebtRow>(`${SELECT} WHERE d.payee_id = ? AND d.status = 'open' ORDER BY d.date`, [payeeId]);
  return rows.map(toDebt);
}

export type DebtInput = {
  id?: ID;
  direction: DebtDirection;
  payeeId: ID;
  accountId: ID | null;
  amount: Minor;
  currency: string;
  date: number;
  dueDate: number | null;
  note: string | null;
};

/**
 * Saves a debt. With `recordMovement`, the money leaving (lent) or arriving (borrowed) is
 * also booked on the account, linked to the debt so it never counts as spending or income.
 * Lending over InstaPay adds the transfer fee as a separate expense; receiving has no fee.
 */
export async function saveDebt(
  input: DebtInput,
  opts: { recordMovement?: boolean; paymentType?: PaymentType; instapay?: boolean } = {},
): Promise<ID> {
  const id = input.id ?? newId();
  const existing = input.id ? await getDebt(input.id) : null;
  await write(
    ['debts'],
    `INSERT OR REPLACE INTO debts (id, direction, payee_id, account_id, amount, currency, date, due_date, note, status, closed_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id, input.direction, input.payeeId, input.accountId, input.amount, input.currency, input.date, input.dueDate,
      input.note?.trim() || null, existing?.status ?? 'open', existing?.closedAt ?? null, existing?.createdAt ?? Date.now(),
    ],
  );
  if (!existing && opts.recordMovement && input.accountId) {
    await createTransaction({
      type: input.direction === 'lent' ? 'expense' : 'income',
      amount: input.amount,
      accountId: input.accountId,
      payeeId: input.payeeId,
      paymentType: opts.instapay ? 'instapay' : (opts.paymentType ?? 'cash'),
      date: input.date,
      note: input.note ?? (input.direction === 'lent' ? 'Lent' : 'Borrowed'),
      debtId: id,
      isInstapay: Boolean(opts.instapay),
      fee: opts.instapay && input.direction === 'lent' ? instapayFee(input.amount, getSettings().instapayFee) : null,
    });
  }
  return id;
}

export async function addRepayment(
  debtId: ID,
  r: { amount: Minor; accountId: ID; date: number; paymentType: PaymentType; note?: string | null; fee?: Minor | null; isInstapay?: boolean },
): Promise<void> {
  const debt = await getDebt(debtId);
  if (!debt) throw new Error('Debt not found');
  await createTransaction({
    type: debt.direction === 'lent' ? 'income' : 'expense',
    amount: r.amount,
    accountId: r.accountId,
    payeeId: debt.payeeId,
    paymentType: r.paymentType,
    date: r.date,
    note: r.note ?? 'Repayment',
    debtId,
    fee: r.fee ?? null,
    isInstapay: r.isInstapay,
  });
  const after = await getDebt(debtId);
  if (after && after.remaining <= 0) await setDebtStatus(debtId, 'closed');
}

export async function setDebtStatus(id: ID, status: DebtStatus): Promise<void> {
  await write(['debts'], 'UPDATE debts SET status = ?, closed_at = ? WHERE id = ?', [status, status === 'closed' ? Date.now() : null, id]);
}

export async function deleteDebt(id: ID, opts: { deleteTransactions: boolean }): Promise<void> {
  await transaction(['debts', 'transactions'], async () => {
    if (opts.deleteTransactions) {
      await run('DELETE FROM transactions WHERE parent_id IN (SELECT id FROM transactions WHERE debt_id = ?)', [id]);
      await run('DELETE FROM transactions WHERE debt_id = ?', [id]);
    } else {
      await run('UPDATE transactions SET debt_id = NULL WHERE debt_id = ?', [id]);
    }
    await run('DELETE FROM debts WHERE id = ?', [id]);
  });
}

export type DebtTotals = { owedToMe: Record<string, Minor>; iOwe: Record<string, Minor> };

export function totals(debts: DebtWithProgress[]): DebtTotals {
  const out: DebtTotals = { owedToMe: {}, iOwe: {} };
  for (const d of debts) {
    if (d.status !== 'open') continue;
    const bucket = d.direction === 'lent' ? out.owedToMe : out.iOwe;
    bucket[d.currency] = (bucket[d.currency] ?? 0) + d.remaining;
  }
  return out;
}

/** How many records (the loan itself and repayments) are linked to a debt. */
export async function countDebtRecords(id: ID): Promise<number> {
  const r = await first<{ n: number }>('SELECT COUNT(*) AS n FROM transactions WHERE debt_id = ? AND parent_id IS NULL', [id]);
  return r?.n ?? 0;
}

export function useDebts() {
  return useLiveQuery(['debts', 'transactions', 'payees'], listDebts);
}

export function useDebt(id: ID | null | undefined) {
  return useLiveQuery(['debts', 'transactions', 'payees'], async () => (id ? getDebt(id) : null), [id]);
}
