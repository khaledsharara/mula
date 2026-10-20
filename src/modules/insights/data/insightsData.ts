import { listAccounts } from '../../accounts/data/accountsRepo';
import { listCategories } from '../../categories/data/categoriesRepo';
import { listForStats } from '../../transactions/data/transactionsRepo';
import { useLiveQuery } from '../../shared/db/live';
import type { Account, Transaction } from '../../shared/db/types';
import type { StatsContext } from '../utils/aggregations';

export type StatsBundle = { txs: Transaction[]; ctx: StatsContext; accounts: Account[] };

/** Loads everything the charts need for a period in one pass. */
export async function loadStats(from: number, to: number, accountId?: string | null): Promise<StatsBundle> {
  const [txs, categories, accounts] = await Promise.all([listForStats(from, to), listCategories(true), listAccounts(true)]);
  const filtered = accountId ? txs.filter((t) => t.accountId === accountId) : txs;
  return {
    txs: filtered,
    accounts,
    ctx: {
      categories: new Map(categories.map((c) => [c.id, c])),
      excludedAccounts: new Set(accounts.filter((a) => a.excludeFromStats).map((a) => a.id)),
    },
  };
}

export function useStats(from: number, to: number, accountId?: string | null) {
  return useLiveQuery(['transactions', 'categories', 'accounts'], () => loadStats(from, to, accountId), [from, to, accountId]);
}
