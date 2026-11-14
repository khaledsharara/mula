import { useEffect, useState } from 'react';

import { getRate } from '../../integrations/utils/fx';
import type { Account, ID, Minor } from '../../shared/db/types';
import { useSettings } from '../../shared/settings/settingsStore';
import { useAccounts, useBalances } from './accountsRepo';

export type NetWorth = {
  /** Sum of the counted accounts (not archived, not left out of statistics), in the base currency. */
  total: Minor | null;
  /** Accounts that count towards totals. */
  accounts: Account[];
  /** Accounts marked "Leave out of statistics" (e.g. a business account): listed apart, never added in. */
  leftOut: Account[];
  balances: Record<ID, Minor>;
  /** Base-currency value of each account (null while its rate is unknown). */
  inBase: Record<ID, Minor | null>;
};

export function useNetWorth(): NetWorth {
  const base = useSettings((s) => s.baseCurrency);
  const { data: accounts } = useAccounts();
  const { data: balances } = useBalances();
  const [rates, setRates] = useState<Record<string, number | null>>({});

  const currencies = [...new Set((accounts ?? []).map((a) => a.currency))].filter((c) => c !== base).join(',');

  useEffect(() => {
    let alive = true;
    const list = currencies ? currencies.split(',') : [];
    void Promise.all(list.map(async (c) => [c, await getRate(c, base)] as const)).then((pairs) => {
      if (alive) setRates(Object.fromEntries(pairs));
    });
    return () => {
      alive = false;
    };
  }, [currencies, base]);

  const inBase: Record<ID, Minor | null> = {};
  let total: Minor | null = 0;
  for (const a of accounts ?? []) {
    const bal = balances?.[a.id] ?? a.initialBalance;
    const rate = a.currency === base ? 1 : rates[a.currency];
    const v = rate == null ? null : Math.round(bal * rate);
    inBase[a.id] = v;
    if (total != null && !a.excludeFromStats) total = v == null ? null : total + v;
  }
  const list = accounts ?? [];
  return {
    total: accounts && balances ? total : null,
    accounts: list.filter((a) => !a.excludeFromStats),
    leftOut: list.filter((a) => a.excludeFromStats),
    balances: balances ?? {},
    inBase,
  };
}
