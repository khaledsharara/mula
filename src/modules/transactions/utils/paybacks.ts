import type { RowLookups } from '../components/TransactionRow';
import type { Transaction } from '../types';

/** A short name for a record, as its row shows it: the payee, else the category. */
export function recordName(t: Transaction, lookups: RowLookups): string {
  const payee = t.payeeId ? lookups.payees.get(t.payeeId)?.name : undefined;
  if (payee) return payee;
  const cat = t.categoryId ? lookups.categories.get(t.categoryId)?.name : undefined;
  if (cat) return cat;
  return t.type === 'income' ? 'Income' : 'Expense';
}

/** What an expense cost you once paybacks are counted, in the base currency. */
export const afterPaybacks = (t: Pick<Transaction, 'baseAmount'>, paidBack: number): number => Math.max(0, t.baseAmount - paidBack);
