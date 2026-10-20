import { useMemo } from 'react';

import { useAccounts } from '../../accounts/data/accountsRepo';
import { useCategories } from '../../categories/data/categoriesRepo';
import { usePayees } from '../../payees/data/payeesRepo';
import type { RowLookups } from '../components/TransactionRow';

/** Id → record maps for rendering transaction rows. */
export function useLookups(): RowLookups & { ready: boolean } {
  const accounts = useAccounts(true);
  const categories = useCategories(true);
  const payees = usePayees();
  return useMemo(
    () => ({
      accounts: new Map((accounts.data ?? []).map((a) => [a.id, a])),
      categories: new Map((categories.data ?? []).map((c) => [c.id, c])),
      payees: new Map((payees.data ?? []).map((p) => [p.id, p])),
      ready: Boolean(accounts.data && categories.data && payees.data),
    }),
    [accounts.data, categories.data, payees.data],
  );
}
