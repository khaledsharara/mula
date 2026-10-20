/**
 * Planned payments charged in another currency than their account's (an EGP subscription on a
 * USD card), on a real SQLite database: booking converts at the day's rate and keeps the
 * original, no rate means the payment waits in the inbox, and bank charges match the series
 * in its own currency.
 */
import { saveAccount } from '../../src/modules/accounts/data/accountsRepo';
import { buildSuggestion, getInboxItem } from '../../src/modules/inbox/data/inboxRepo';
import { matchRecurring, processDueRecurring, saveRecurring, type RecurringInput } from '../../src/modules/recurring/data/recurringRepo';
import { bootstrap } from '../../src/modules/shared/db/bootstrap';
import { all, first, run } from '../../src/modules/shared/db/client';

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

// Fixed rates; `fx.offline` simulates having no rate at all.
const fx = { offline: false };
const RATES: Record<string, number> = { 'EGP-USD': 0.02, 'USD-EGP': 50 };
jest.mock('../../src/modules/integrations/utils/fx', () => {
  const getRate = async (from: string, to: string) => (from === to ? 1 : fx.offline ? null : (RATES[`${from}-${to}`] ?? null));
  return {
    getRate,
    convert: async (minor: number, from: string, to: string) => {
      const rate = await getRate(from, to);
      return rate == null ? null : { amount: Math.round(minor * rate), rate };
    },
    refreshTodayRates: async () => undefined,
  };
});

const DAY = 86_400_000;

const accountInput = (name: string, currency: string) => ({
  name,
  type: 'bank' as const,
  currency,
  initialBalance: 0,
  color: '#2F45D0',
  icon: 'landmark',
  defaultPaymentType: 'debit_card' as const,
  identifiers: [],
  excludeFromStats: false,
  archived: false,
});

let usd = '';
let egp = '';
let category = '';

const series = (patch: Partial<RecurringInput>): RecurringInput => ({
  name: 'Streaming',
  type: 'expense',
  amount: 25_000,
  currency: 'EGP',
  accountId: usd,
  toAccountId: null,
  categoryId: category,
  payeeId: null,
  paymentType: 'debit_card',
  note: null,
  isInstapay: false,
  frequency: 'monthly',
  interval: 1,
  startDate: Date.now() - 5 * DAY,
  endType: 'never',
  endDate: null,
  endCount: null,
  mode: 'auto',
  remindDaysBefore: -1,
  active: true,
  ...patch,
});

type TxRowLite = { amount: number; currency: string; original_amount: number | null; original_currency: string | null; fx_rate: number | null; to_amount: number | null };
const txFor = (recurringId: string) =>
  all<TxRowLite>('SELECT amount, currency, original_amount, original_currency, fx_rate, to_amount FROM transactions WHERE recurring_id = ? AND parent_id IS NULL', [recurringId]);

beforeAll(async () => {
  await bootstrap();
  category = (await first<{ id: string }>("SELECT id FROM categories WHERE kind = 'expense' LIMIT 1"))!.id;
});

beforeEach(async () => {
  fx.offline = false;
  await run('DELETE FROM transactions');
  await run('DELETE FROM inbox_items');
  await run('DELETE FROM recurring');
  await run('DELETE FROM accounts');
  usd = await saveAccount(accountInput('Dollar card', 'USD'));
  egp = await saveAccount(accountInput('Pounds', 'EGP'));
});

it('books an EGP payment on a USD account converted, keeping the amount as charged', async () => {
  const id = await saveRecurring(series({}));
  expect(await processDueRecurring()).toEqual({ created: 1, queued: 0 });
  expect(await txFor(id)).toEqual([{ amount: 500, currency: 'USD', original_amount: 25_000, original_currency: 'EGP', fx_rate: 0.02, to_amount: null }]);
  expect((await first<{ occurrences: number }>('SELECT occurrences FROM recurring WHERE id = ?', [id]))?.occurrences).toBe(1);
});

it('queues an auto payment to the inbox when there is no rate, and converts it once there is', async () => {
  fx.offline = true;
  const id = await saveRecurring(series({}));
  expect(await processDueRecurring()).toEqual({ created: 0, queued: 1 });
  expect(await txFor(id)).toEqual([]);
  expect(await processDueRecurring()).toEqual({ created: 0, queued: 0 });
  const row = await first<{ id: string; note: string }>('SELECT id, note FROM inbox_items WHERE recurring_id = ?', [id]);
  expect(row?.note).toBe('Waiting for an exchange rate');

  const item = (await getInboxItem(row!.id))!;
  const offline = await buildSuggestion(item);
  expect(offline.unconverted).toEqual({ amount: 25_000, currency: 'EGP' });
  expect(offline.draft.amount).toBe(0);
  expect(offline.ready).toBe(false);

  fx.offline = false;
  const online = await buildSuggestion(item);
  expect(online.unconverted).toBeNull();
  expect(online.draft.amount).toBe(500);
  expect(online.draft.original).toEqual({ amount: 25_000, currency: 'EGP', rate: 0.02 });
  expect(online.ready).toBe(true);
});

it('fills the converted amount for confirm-mode payments', async () => {
  const id = await saveRecurring(series({ mode: 'confirm' }));
  expect(await processDueRecurring()).toEqual({ created: 0, queued: 1 });
  const row = await first<{ id: string }>('SELECT id FROM inbox_items WHERE recurring_id = ?', [id]);
  const s = await buildSuggestion((await getInboxItem(row!.id))!);
  expect(s.draft.amount).toBe(500);
  expect(s.original).toEqual({ amount: 25_000, currency: 'EGP', rate: 0.02 });
});

it('matches a bank charge to the series in the series’ own currency', async () => {
  const id = await saveRecurring(series({ mode: 'confirm', startDate: Date.now() + DAY }));
  const at = Date.now();
  const egpCharge = await matchRecurring({ charged: { amount: 25_000, currency: 'EGP' }, booked: { amount: 503, currency: 'USD' } }, usd, at);
  expect(egpCharge?.id).toBe(id);
  // Booked in dollars only (the SMS said USD): 5.03 vs EGP 250 isn't comparable, so no match.
  expect(await matchRecurring({ charged: { amount: 503, currency: 'USD' }, booked: { amount: 503, currency: 'USD' } }, usd, at)).toBeNull();
});

it('leaves same-currency series unchanged', async () => {
  const id = await saveRecurring(series({ accountId: egp, currency: 'EGP' }));
  await processDueRecurring();
  expect(await txFor(id)).toEqual([{ amount: 25_000, currency: 'EGP', original_amount: null, original_currency: null, fx_rate: null, to_amount: null }]);
});

it('converts what lands in the other account of a cross-currency transfer', async () => {
  const id = await saveRecurring(series({ type: 'transfer', amount: 10_000, currency: 'USD', toAccountId: egp, categoryId: null }));
  await processDueRecurring();
  expect(await txFor(id)).toEqual([{ amount: 10_000, currency: 'USD', original_amount: null, original_currency: null, fx_rate: null, to_amount: 500_000 }]);
});
