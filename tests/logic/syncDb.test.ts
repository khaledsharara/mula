/**
 * Sync on a real SQLite database (Node's built-in node:sqlite stands in for expo-sqlite): the
 * migration's triggers, per-record pausing while applying remote rows, column-safe upserts,
 * name clashes, and the first-upload queue.
 */
import { saveAccount } from '../../src/modules/accounts/data/accountsRepo';
import { all, first, run } from '../../src/modules/shared/db/client';
import { bootstrap } from '../../src/modules/shared/db/bootstrap';
import { setSetting } from '../../src/modules/shared/settings/settingsStore';
import { applyChange, applyIncoming, attachRows, enqueueAll, outboxEntry, readOutbox, setApplying } from '../../src/modules/sync/data/syncStore';

type MockStmt = { all: (...p: unknown[]) => unknown[]; run: (...p: unknown[]) => { changes: number; lastInsertRowid: number } };
type MockNodeDb = { exec: (s: string) => void; prepare: (s: string) => MockStmt };
type MockNodeSqlite = { DatabaseSync: new (path: string) => MockNodeDb };

jest.mock('expo-sqlite', () => {
  const { DatabaseSync } = (process as unknown as { getBuiltinModule: (m: string) => MockNodeSqlite }).getBuiltinModule('node:sqlite');
  const db = new DatabaseSync(':memory:');
  const args = (p?: unknown[]) => (p ?? []).map((v) => (v === undefined ? null : typeof v === 'boolean' ? (v ? 1 : 0) : v));
  const api = {
    execAsync: async (sql: string) => db.exec(sql.replace(/PRAGMA journal_mode = WAL;/, '')),
    getAllAsync: async (sql: string, p?: unknown[]) => db.prepare(sql).all(...args(p)),
    getFirstAsync: async (sql: string, p?: unknown[]) => db.prepare(sql).all(...args(p))[0] ?? null,
    runAsync: async (sql: string, p?: unknown[]) => {
      const r = db.prepare(sql).run(...args(p));
      return { changes: r.changes, lastInsertRowId: Number(r.lastInsertRowid) };
    },
    withTransactionAsync: async (fn: () => Promise<void>) => {
      db.exec('BEGIN');
      try {
        await fn();
        db.exec('COMMIT');
      } catch (e) {
        db.exec('ROLLBACK');
        throw e;
      }
    },
  };
  return { openDatabaseAsync: async () => api };
});
jest.mock('expo-crypto', () => ({ randomUUID: () => `id-${Math.random().toString(36).slice(2)}` }));

const outbox = () => all<{ tbl: string; pk: string; seq: number }>('SELECT tbl, pk, seq FROM sync_outbox ORDER BY seq');

const account = {
  name: 'CIB',
  type: 'bank' as const,
  currency: 'EGP',
  initialBalance: 0,
  color: '#2F45D0',
  icon: 'landmark',
  defaultPaymentType: 'debit_card' as const,
  identifiers: ['9002'],
  excludeFromStats: false,
  archived: false,
};

beforeAll(async () => {
  await bootstrap();
});

beforeEach(async () => {
  await run('DELETE FROM sync_outbox');
  await run('DELETE FROM payees');
  await run('DELETE FROM accounts');
  await run('DELETE FROM settings');
});

it('records local changes, one entry per record', async () => {
  const id = await saveAccount(account);
  await run('UPDATE accounts SET name = ? WHERE id = ?', ['CIB main', id]);
  const entries = await outbox();
  expect(entries.filter((e) => e.tbl === 'accounts' && e.pk === id)).toHaveLength(1);
  await run('DELETE FROM accounts WHERE id = ?', [id]);
  const [change] = await attachRows([{ tbl: 'accounts', pk: id, at: 1 }]);
  expect(change.row).toBeNull();
});

it('syncs data settings but not device ones', async () => {
  await setSetting('baseCurrency', 'EGP');
  await setSetting('syncCursor', 42);
  await setSetting('appearance', 'dark');
  const keys = (await outbox()).filter((e) => e.tbl === 'settings').map((e) => e.pk);
  expect(keys).toEqual(['baseCurrency']);
});

it('applies a remote record without echoing it, and keeps recording other records', async () => {
  await applyIncoming({ tbl: 'payees', pk: 'p1', at: 1, row: { id: 'p1', name: 'Uber', kind: 'merchant', auto_confirm: 0, created_at: 1 } });
  expect(await first('SELECT name FROM payees WHERE id = ?', ['p1'])).toEqual({ name: 'Uber' });
  expect(await outboxEntry('payees', 'p1')).toBeNull();
  expect(await all('SELECT * FROM sync_incoming')).toEqual([]);
  // A save made right after (or while) applying is still recorded.
  await run("INSERT INTO payees (id, name, kind, auto_confirm, created_at) VALUES ('p2', 'Talabat', 'merchant', 0, 1)");
  expect(await outboxEntry('payees', 'p2')).not.toBeNull();
});

it('touches only the columns it was sent, and ignores unknown ones', async () => {
  await run("INSERT INTO payees (id, name, kind, auto_confirm, note, created_at) VALUES ('p3', 'Carrefour', 'merchant', 0, 'keep me', 1)");
  // As if `note` were a column the sender's (older) app doesn't have yet, and the sender had one we don't.
  await setApplying(true);
  try {
    await applyChange({ tbl: 'payees', pk: 'p3', at: 2, row: { id: 'p3', name: 'Carrefour Express', kind: 'merchant', auto_confirm: 0, created_at: 1, from_a_newer_app: 'x' } });
  } finally {
    await setApplying(false);
  }
  expect(await first('SELECT name, note FROM payees WHERE id = ?', ['p3'])).toEqual({ name: 'Carrefour Express', note: 'keep me' });
});

it('renames a local payee that clashes with a remote one instead of losing it', async () => {
  await run("INSERT INTO payees (id, name, kind, auto_confirm, created_at) VALUES ('local', 'Uber', 'merchant', 0, 1)");
  await run('DELETE FROM sync_outbox');
  await applyIncoming({ tbl: 'payees', pk: 'remote', at: 1, row: { id: 'remote', name: 'uber', kind: 'merchant', auto_confirm: 0, created_at: 1 } });
  expect(await all('SELECT id, name FROM payees ORDER BY id')).toEqual([
    { id: 'local', name: 'Uber (2)' },
    { id: 'remote', name: 'uber' },
  ]);
  // The rename goes to the other side; the remote record isn't echoed.
  expect((await outbox()).map((e) => e.pk)).toEqual(['local']);
});

it('queues everything for a first upload with unique, increasing revisions', async () => {
  await saveAccount(account);
  await saveAccount({ ...account, name: 'Cash', type: 'cash', identifiers: [] });
  await setSetting('baseCurrency', 'EGP');
  await setSetting('lastBackupAt', 5);
  await run('DELETE FROM sync_outbox');
  await enqueueAll();
  const entries = await readOutbox({ limit: 10_000 });
  expect(entries.filter((e) => e.tbl === 'accounts')).toHaveLength(2);
  expect(entries.filter((e) => e.tbl === 'categories').length).toBeGreaterThan(0);
  expect(entries.filter((e) => e.tbl === 'settings').map((e) => e.pk)).toEqual(['baseCurrency']);
  const seqs = entries.map((e) => e.seq);
  expect(new Set(seqs).size).toBe(seqs.length);
  expect([...seqs].sort((a, b) => a - b)).toEqual(seqs);
  // New changes after the queue get later revisions.
  await saveAccount({ ...account, name: 'Savings', identifiers: [] });
  const last = (await readOutbox({ limit: 10_000 })).pop()!;
  expect(last.seq).toBeGreaterThan(Math.max(...seqs));
});
