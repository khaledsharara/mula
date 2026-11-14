/**
 * Paybacks: income that pays back an expense (friends sending their share of a meal you paid for)
 * makes the expense count only what it cost you, and isn't counted as income. Also checks that
 * accounts left out of statistics stay out of lists. Runs on a real SQLite database.
 */
import { saveAccount } from '../../src/modules/accounts/data/accountsRepo';
import { loadStats } from '../../src/modules/insights/data/insightsData';
import { byCategory, totals, type StatsContext } from '../../src/modules/insights/utils/aggregations';
import { bootstrap } from '../../src/modules/shared/db/bootstrap';
import { run } from '../../src/modules/shared/db/client';
import { SYSTEM_CATEGORIES } from '../../src/modules/shared/db/seeds/categories';
import type { Category, Transaction } from '../../src/modules/shared/db/types';
import {
  createTransaction,
  deleteTransaction,
  getTransaction,
  listLinkCandidates,
  listPaybacks,
  listTransactions,
  paidBackFor,
  setPayback,
  updateTransaction,
} from '../../src/modules/transactions/data/transactionsRepo';
import type { TxInput } from '../../src/modules/transactions/types';

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
jest.mock('../../src/modules/integrations/utils/fx', () => ({
  getRate: async (from: string, to: string) => (from === to ? 1 : null),
  convert: async () => null,
  refreshTodayRates: async () => undefined,
}));

/* ---------- Pure statistics ---------- */

const cat = (id: string, parentId: string | null = null): Category => ({
  id, parentId, name: id, kind: 'expense', icon: 'shapes', color: '#000', nature: 'want', systemKey: null, archived: false, sortOrder: 0,
});

const tx = (p: Partial<Transaction>): Transaction => ({
  id: Math.random().toString(36), type: 'expense', amount: 0, currency: 'EGP', accountId: 'a', toAccountId: null, toAmount: null,
  categoryId: null, payeeId: null, paymentType: 'cash', date: Date.now(), note: null, isInstapay: false, parentId: null,
  natureOverride: null, originalAmount: null, originalCurrency: null, fxRate: null, baseAmount: 0, recurringId: null,
  debtId: null, reimbursesId: null, source: 'manual', sourceRef: null, createdAt: 0, updatedAt: 0, ...p,
});

describe('statistics with paybacks', () => {
  const meal = tx({ id: 'meal', amount: 100000, baseAmount: 100000, categoryId: 'restaurant' });
  const taxi = tx({ id: 'taxi', amount: 20000, baseAmount: 20000, categoryId: 'taxi' });
  const share = tx({ type: 'income', amount: 75000, baseAmount: 75000, reimbursesId: 'meal' });
  const salary = tx({ type: 'income', amount: 500000, baseAmount: 500000 });
  const ctx: StatsContext = {
    categories: new Map([['food', cat('food')], ['restaurant', cat('restaurant', 'food')], ['taxi', cat('taxi')]]),
    excludedAccounts: new Set(),
    paidBack: new Map([['meal', 75000], ['taxi', 25000]]),
  };

  it('counts an expense net of its paybacks and leaves paybacks out of income', () => {
    expect(totals([meal, taxi, share, salary], ctx)).toEqual({ spent: 25000, earned: 500000, net: 475000, count: 3, paidBack: 95000 });
  });

  it('never lets an overpaid expense go below zero', () => {
    expect(byCategory([meal, taxi], ctx).find((c) => c.id === 'taxi')?.amount).toBe(0);
    expect(byCategory([meal, taxi], ctx).find((c) => c.id === 'food')?.amount).toBe(25000);
  });

  it('works without any paybacks loaded', () => {
    expect(totals([meal], { ...ctx, paidBack: undefined }).spent).toBe(100000);
  });
});

/* ---------- Repository ---------- */

const DAY = 86_400_000;
const T0 = new Date(2026, 9, 10, 13, 0).getTime();
let main = '';
let business = '';

const accountInput = (name: string, excludeFromStats = false) => ({
  name,
  type: 'bank' as const,
  currency: 'EGP',
  initialBalance: 0,
  color: '#2F45D0',
  icon: 'landmark',
  defaultPaymentType: 'debit_card' as const,
  identifiers: [],
  excludeFromStats,
  archived: false,
});

const expense = (amount: number, patch: Partial<TxInput> = {}): TxInput => ({
  type: 'expense',
  amount,
  accountId: main,
  categoryId: SYSTEM_CATEGORIES.restaurant,
  paymentType: 'debit_card',
  date: T0,
  ...patch,
});

const income = (amount: number, patch: Partial<TxInput> = {}): TxInput => ({
  type: 'income',
  amount,
  accountId: main,
  categoryId: SYSTEM_CATEGORIES.refunds,
  paymentType: 'instapay',
  isInstapay: true,
  date: T0 + DAY,
  ...patch,
});

beforeAll(async () => {
  await bootstrap();
  main = await saveAccount(accountInput('CIB'));
  business = await saveAccount(accountInput('Business', true));
});

beforeEach(async () => {
  await run('DELETE FROM transactions');
});

describe('paybacks in the database', () => {
  it('links friends’ transfers to the meal and counts only your share', async () => {
    const meal = await createTransaction(expense(100000));
    await createTransaction(income(40000, { reimbursesId: meal }));
    // The second friend paid a month later: it still counts against October's meal.
    await createTransaction(income(35000, { reimbursesId: meal, date: T0 + 30 * DAY }));

    expect((await paidBackFor(T0 - DAY, T0 + DAY)).get(meal)).toBe(75000);
    expect((await listPaybacks(meal)).map((p) => p.amount)).toEqual([40000, 35000]);
    const row = (await listTransactions({})).find((t) => t.id === meal)!;
    expect(row.paidBack).toBe(75000);

    const oct = await loadStats(T0 - 5 * DAY, T0 + 5 * DAY);
    expect(totals(oct.txs, oct.ctx)).toMatchObject({ spent: 25000, earned: 0, paidBack: 75000 });
    const nov = await loadStats(T0 + 20 * DAY, T0 + 40 * DAY);
    expect(totals(nov.txs, nov.ctx)).toMatchObject({ spent: 0, earned: 0 });
  });

  it('keeps the link through edits that don’t mention it, and drops it on request', async () => {
    const meal = await createTransaction(expense(100000));
    const share = await createTransaction(income(40000, { reimbursesId: meal }));
    const { reimbursesId: _drop, ...rest } = income(45000);
    await updateTransaction(share, rest);
    expect((await getTransaction(share))?.reimbursesId).toBe(meal);
    await updateTransaction(share, income(45000, { reimbursesId: null }));
    expect((await getTransaction(share))?.reimbursesId).toBeNull();
  });

  it('frees the paybacks when the expense is deleted or stops being an expense', async () => {
    const meal = await createTransaction(expense(100000));
    const share = await createTransaction(income(40000, { reimbursesId: meal }));
    await deleteTransaction(meal);
    expect((await getTransaction(share))?.reimbursesId).toBeNull();

    const dinner = await createTransaction(expense(80000));
    await setPayback(share, dinner);
    expect((await getTransaction(share))?.reimbursesId).toBe(dinner);
    await updateTransaction(dinner, income(80000, { date: T0 }));
    expect((await getTransaction(share))?.reimbursesId).toBeNull();
  });

  it('only lets income pay back an expense', async () => {
    const meal = await createTransaction(expense(100000));
    const other = await createTransaction(expense(5000));
    await expect(setPayback(other, meal)).rejects.toThrow();
    const share = await createTransaction(income(40000));
    await expect(setPayback(share, share)).rejects.toThrow();
    // An expense can't carry the link at all.
    const odd = await createTransaction(expense(1000, { reimbursesId: meal }));
    expect((await getTransaction(odd))?.reimbursesId).toBeNull();
  });

  it('offers unlinked income and expenses as link candidates', async () => {
    const meal = await createTransaction(expense(100000));
    const linked = await createTransaction(income(40000, { reimbursesId: meal }));
    const free = await createTransaction(income(20000));
    const incomes = (await listLinkCandidates('income')).map((t) => t.id);
    expect(incomes).toContain(free);
    expect(incomes).not.toContain(linked);
    expect((await listLinkCandidates('expense')).map((t) => t.id)).toEqual([meal]);
  });
});

describe('accounts left out of statistics', () => {
  it('hide from lists unless a transfer touches a counted account', async () => {
    const mine = await createTransaction(expense(1000));
    const work = await createTransaction(expense(2000, { accountId: business }));
    const pay = await createTransaction({ type: 'transfer', amount: 3000, accountId: business, toAccountId: main, paymentType: 'bank_transfer', date: T0 });
    const ids = (await listTransactions({ hideAccountIds: [business] })).map((t) => t.id);
    expect(ids).toEqual(expect.arrayContaining([mine, pay]));
    expect(ids).not.toContain(work);
    const stats = await loadStats(T0 - DAY, T0 + DAY);
    expect(totals(stats.txs, stats.ctx).spent).toBe(1000);
  });
});
