import { useEffect, useRef, useState } from 'react';
import { create } from 'zustand';

import type { TableName } from './types';

type Versions = Record<TableName, number>;

const initial: Versions = {
  accounts: 0,
  categories: 0,
  payees: 0,
  payee_aliases: 0,
  transactions: 0,
  inbox_items: 0,
  recurring: 0,
  templates: 0,
  debts: 0,
  fx_rates: 0,
  settings: 0,
};

const useVersions = create<Versions>(() => initial);

/** Marks tables as changed; every live query reading them re-runs. */
export function notify(tables: TableName[]): void {
  useVersions.setState((s) => {
    const next = { ...s };
    for (const t of tables) next[t] = s[t] + 1;
    return next;
  });
}

/** Calls `listener` after any write anywhere in the app (used to schedule a sync). */
export function subscribeChanges(listener: () => void): () => void {
  return useVersions.subscribe(listener);
}

export type LiveResult<T> = { data: T | undefined; loading: boolean; error: unknown };

/**
 * Runs an async query and re-runs it whenever any of `tables` changes or `deps` change.
 * Keeps the previous data while refreshing so lists don't flash.
 */
export function useLiveQuery<T>(tables: TableName[], query: () => Promise<T>, deps: unknown[] = []): LiveResult<T> {
  const versionKey = useVersions((s) => tables.map((t) => s[t]).join('.'));
  const [state, setState] = useState<LiveResult<T>>({ data: undefined, loading: true, error: null });
  const runId = useRef(0);

  useEffect(() => {
    const id = ++runId.current;
    setState((s) => ({ ...s, loading: true }));
    query().then(
      (data) => {
        if (id === runId.current) setState({ data, loading: false, error: null });
      },
      (error) => {
        if (id === runId.current) setState((s) => ({ ...s, loading: false, error }));
        console.warn('[mula] live query failed', error);
      },
    );
    // `query` is intentionally excluded: callers pass the values it closes over in `deps`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [versionKey, ...deps]);

  return state;
}
