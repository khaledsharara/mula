/**
 * Builds the made-up dataset behind the README screenshots, through the app's own repositories
 * on a real SQLite database, and checks it makes a valid backup. With MULA_WRITE_DEMO=1 it also
 * writes tests/e2e/output/demo-backup.json for scripts/screenshots.mjs. Everything here is
 * invented: accounts, amounts, people and messages.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { saveAccount } from '../../src/modules/accounts/data/accountsRepo';
import { createBackup, readBackup } from '../../src/modules/data-transfer/utils/backup';
import { addRepayment, saveDebt } from '../../src/modules/debts/data/debtsRepo';
import { ingestSms } from '../../src/modules/inbox/data/inboxRepo';
import { findOrCreatePayee, setAlias } from '../../src/modules/payees/data/payeesRepo';
import { saveRecurring, skipMissedRecurring, type RecurringInput } from '../../src/modules/recurring/data/recurringRepo';
import { bootstrap } from '../../src/modules/shared/db/bootstrap';
import { run } from '../../src/modules/shared/db/client';
import { setSetting } from '../../src/modules/shared/settings/settingsStore';
import { saveTemplate } from '../../src/modules/templates/data/templatesRepo';
import { createTransaction } from '../../src/modules/transactions/data/transactionsRepo';
import type { TxInput } from '../../src/modules/transactions/types';
import { instapayFee } from '../../src/modules/transactions/utils/instapay';
import { INSTAPAY_DEFAULT_FEE } from '../../src/modules/shared/settings/settingsStore';
import { CIB_SMS } from '../fixtures/banks';

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
let mockIds = 0;
jest.mock('expo-crypto', () => ({ randomUUID: () => `demo-${(mockIds++).toString(36).padStart(6, '0')}` }));

// Fixed, round-ish rates so the dataset is the same on every run.
const mockRates: Record<string, number> = { 'USD-EGP': 48.5, 'EGP-USD': 1 / 48.5, 'INR-USD': 0.012, 'USD-INR': 83 };
jest.mock('../../src/modules/integrations/utils/fx', () => {
  const getRate = async (from: string, to: string) => (from === to ? 1 : (mockRates[`${from}-${to}`] ?? null));
  return {
    getRate,
    convert: async (minor: number, from: string, to: string) => {
      const rate = await getRate(from, to);
      return rate == null ? null : { amount: Math.round(minor * rate), rate };
    },
    refreshTodayRates: async () => undefined,
  };
});

/** The moment the screenshots pretend it is (scripts/screenshots.mjs pins the clock here). */
export const DEMO_NOW = new Date(2026, 9, 18, 13, 30).getTime();
const DAY = 86_400_000;
const at = (daysAgo: number, hour: number, minute = 0) => {
  const d = new Date(DEMO_NOW - daysAgo * DAY);
  d.setHours(hour, minute, 0, 0);
  return d.getTime();
};
const cat = (key: string) => `cat_${key}`;
const egp = (major: number) => Math.round(major * 100);

/** Small seeded generator, so "random" spending is identical every run. */
function rng(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const account = (name: string, type: 'bank' | 'cash' | 'savings', currency: string, balance: number, color: string, identifiers: string[] = []) =>
  saveAccount({
    name,
    type,
    currency,
    initialBalance: egp(balance),
    color,
    icon: type === 'cash' ? 'banknote' : type === 'savings' ? 'piggy-bank' : 'landmark',
    defaultPaymentType: type === 'cash' ? 'cash' : 'debit_card',
    identifiers,
    excludeFromStats: false,
    archived: false,
  });

async function buildDemo() {
  await bootstrap();
  await setSetting('onboarded', true);
  await setSetting('baseCurrency', 'EGP');
  await setSetting('lastBackupAt', DEMO_NOW - 2 * DAY);

  const cib = await account('CIB', 'bank', 'EGP', 21_350, '#2F45D0', ['9002', '9001']);
  const cash = await account('Cash', 'cash', 'EGP', 1_400, '#2E8B57');
  const usd = await account('CIB Dollar', 'bank', 'USD', 640, '#C47F17', ['9003']);
  await account('Savings', 'savings', 'EGP', 45_000, '#7A5AF8');

  const payee = async (name: string, category: string | null, kind: 'merchant' | 'person' = 'merchant') => {
    const p = await findOrCreatePayee(name, kind);
    if (category) await run('UPDATE payees SET default_category_id = ? WHERE id = ?', [cat(category), p.id]);
    return p.id;
  };
  const P = {
    employer: await payee('Acme Studio', 'income.wage'),
    landlord: await payee('Landlord', 'housing.rent', 'person'),
    talabat: await payee('Talabat', 'food.restaurant'),
    carrefour: await payee('Carrefour', 'food.groceries'),
    breadfast: await payee('Breadfast', 'food.groceries'),
    coffee: await payee('Sample Coffee Co', 'food.cafe'),
    uber: await payee('Uber', 'transport.taxi'),
    gym: await payee('Gym', 'life.fitness'),
    netflix: await payee('Netflix', 'life.streaming'),
    telecom: await payee('Mobile carrier', 'comms.phone'),
    internet: await payee('Home internet', 'comms.internet'),
    pharmacy: await payee('Pharmacy', 'shopping.pharmacy'),
    nour: await payee('Nour', null, 'person'),
    omar: await payee('Omar', null, 'person'),
    sara: await payee('Sara', null, 'person'),
  };
  await setAlias('PAYMOB Sample Coffee Co', P.coffee);

  const tx = (t: Omit<TxInput, 'paymentType'> & { paymentType?: TxInput['paymentType'] }) =>
    createTransaction({ paymentType: 'debit_card', source: 'manual', ...t });
  const random = rng(7);
  const between = (lo: number, hi: number) => egp(Math.round((lo + random() * (hi - lo)) * 4) / 4);

  // Three months of ordinary life, oldest first.
  for (let d = 79; d >= 1; d--) {
    const date = new Date(DEMO_NOW - d * DAY);
    const day = date.getDate();
    const weekday = date.getDay();
    if (day === 1) await tx({ type: 'income', amount: egp(42_000), accountId: cib, categoryId: cat('income.wage'), payeeId: P.employer, paymentType: 'bank_transfer', date: at(d, 9) });
    if (day === 5) await tx({ type: 'expense', amount: egp(12_000), accountId: cib, categoryId: cat('housing.rent'), payeeId: P.landlord, paymentType: 'bank_transfer', date: at(d, 10) });
    if (day === 3) await tx({ type: 'expense', amount: egp(1_200), accountId: cib, categoryId: cat('life.fitness'), payeeId: P.gym, date: at(d, 18) });
    if (day === 8) await tx({ type: 'expense', amount: egp(750), accountId: cib, categoryId: cat('comms.internet'), payeeId: P.internet, date: at(d, 12) });
    if (day === 12) await tx({ type: 'expense', amount: egp(350), accountId: cib, categoryId: cat('comms.phone'), payeeId: P.telecom, date: at(d, 11) });
    if (day === 15) {
      // A subscription billed in pounds to the dollar card.
      await tx({ type: 'expense', amount: Math.round(egp(250) / 48.5), accountId: usd, categoryId: cat('life.streaming'), payeeId: P.netflix, date: at(d, 8), original: { amount: egp(250), currency: 'EGP', rate: 1 / 48.5 } });
    }
    if (weekday === 5) await tx({ type: 'expense', amount: between(650, 1_450), accountId: cib, categoryId: cat('food.groceries'), payeeId: random() > 0.5 ? P.carrefour : P.breadfast, date: at(d, 12, 15) });
    if (random() > 0.55) await tx({ type: 'expense', amount: between(160, 480), accountId: cib, categoryId: cat('food.restaurant'), payeeId: P.talabat, paymentType: 'apple_pay', date: at(d, 20, 40) });
    if (weekday >= 0 && weekday <= 4 && random() > 0.4) await tx({ type: 'expense', amount: between(70, 145), accountId: cib, categoryId: cat('food.cafe'), payeeId: P.coffee, paymentType: 'apple_pay', date: at(d, 9, 10) });
    if (random() > 0.45) await tx({ type: 'expense', amount: between(55, 190), accountId: cib, categoryId: cat('transport.taxi'), payeeId: P.uber, date: at(d, 8, 35) });
    if (random() > 0.9) await tx({ type: 'expense', amount: between(90, 420), accountId: cash, categoryId: cat('shopping.pharmacy'), payeeId: P.pharmacy, paymentType: 'cash', date: at(d, 17) });
    if (day === 20) await tx({ type: 'transfer', amount: egp(2_000), accountId: cib, toAccountId: cash, paymentType: 'cash', note: 'ATM', date: at(d, 15) });
    if (day === 22) {
      const amount = egp(800);
      await tx({ type: 'expense', amount, accountId: cib, categoryId: cat('shopping.gifts'), payeeId: P.nour, paymentType: 'instapay', isInstapay: true, fee: instapayFee(amount, INSTAPAY_DEFAULT_FEE), date: at(d, 19) });
    }
  }

  // Planned payments, already up to date (their past dates are the records above).
  const plan = async (r: Partial<RecurringInput> & Pick<RecurringInput, 'name' | 'type' | 'amount' | 'accountId' | 'startDate'>) => {
    const id = await saveRecurring({
      currency: null,
      toAccountId: null,
      categoryId: null,
      payeeId: null,
      paymentType: 'bank_transfer',
      note: null,
      isInstapay: false,
      frequency: 'monthly',
      interval: 1,
      endType: 'never',
      endDate: null,
      endCount: null,
      mode: 'confirm',
      remindDaysBefore: 1,
      active: true,
      ...r,
    });
    await skipMissedRecurring(id, DEMO_NOW);
  };
  await plan({ name: 'Rent', type: 'expense', amount: egp(12_000), currency: 'EGP', accountId: cib, categoryId: cat('housing.rent'), payeeId: P.landlord, startDate: at(78, 9), mode: 'auto' });
  await plan({ name: 'Salary', type: 'income', amount: egp(42_000), currency: 'EGP', accountId: cib, categoryId: cat('income.wage'), payeeId: P.employer, startDate: at(78, 9), mode: 'auto' });
  await plan({ name: 'Netflix', type: 'expense', amount: egp(250), currency: 'EGP', accountId: usd, categoryId: cat('life.streaming'), payeeId: P.netflix, paymentType: 'debit_card', startDate: at(64, 8) });
  await plan({ name: 'Gym', type: 'expense', amount: egp(1_200), currency: 'EGP', accountId: cib, categoryId: cat('life.fitness'), payeeId: P.gym, paymentType: 'debit_card', startDate: at(76, 9) });
  await plan({ name: 'Home internet', type: 'expense', amount: egp(750), currency: 'EGP', accountId: cib, categoryId: cat('comms.internet'), payeeId: P.internet, paymentType: 'debit_card', startDate: at(71, 9), remindDaysBefore: 2 });

  // Money between friends.
  const lent = await saveDebt({ direction: 'lent', payeeId: P.omar, accountId: cib, amount: egp(3_000), currency: 'EGP', date: at(30, 19), dueDate: at(-14, 12), note: 'Concert tickets' }, { recordMovement: true, paymentType: 'instapay', instapay: true });
  await addRepayment(lent, { amount: egp(1_000), accountId: cib, date: at(9, 20), paymentType: 'instapay', isInstapay: true });
  await saveDebt({ direction: 'borrowed', payeeId: P.sara, accountId: cash, amount: egp(500), currency: 'EGP', date: at(4, 14), dueDate: null, note: 'Lunch' }, { recordMovement: true, paymentType: 'cash' });

  // Templates for one-tap logging.
  await saveTemplate({ name: 'Morning coffee', type: 'expense', amount: egp(95), currency: 'EGP', accountId: cib, toAccountId: null, categoryId: cat('food.cafe'), payeeId: P.coffee, paymentType: 'apple_pay', note: null, isInstapay: false });
  await saveTemplate({ name: 'Uber ride', type: 'expense', amount: null, currency: 'EGP', accountId: cib, toAccountId: null, categoryId: cat('transport.taxi'), payeeId: P.uber, paymentType: 'debit_card', note: null, isInstapay: false });

  // Bank messages from the last day, waiting for review.
  // Re-dated to the last day, without the balance (the demo's balances are its own).
  const recent = (text: string, from: RegExp, to: string) => text.replace(from, to).replace(/\s*[،,]?\s*الرصيد\s*المتاح.*$/s, '');
  await ingestSms(recent(CIB_SMS.applePay, /20\/08\/26 22:31/, '17/10/26 21:14'), 'sms', at(1, 21, 14), 'CIB');
  await ingestSms(recent(CIB_SMS.instapayIn, /20-08-2026 22:26/, '18-10-2026 10:02'), 'sms', at(0, 10, 2), 'CIB');
  await ingestSms(recent(CIB_SMS.cardForeign, /29\/05\/26 21:50/, '18/10/26 11:47'), 'sms', at(0, 11, 47), 'CIB');
  await ingestSms(recent(CIB_SMS.instapayOut, /20-08-2026 17:10/, '18-10-2026 12:20'), 'sms', at(0, 12, 20), 'CIB');
}

it('builds the screenshot dataset as a valid backup', async () => {
  await buildDemo();
  const backup = await createBackup();
  const { summary } = readBackup(JSON.stringify(backup));
  expect(summary.counts.accounts).toBe(4);
  expect(summary.counts.transactions).toBeGreaterThan(150);
  expect(summary.counts.recurring).toBe(5);
  expect(summary.counts.inbox_items).toBe(4);
  if (process.env.MULA_WRITE_DEMO === '1') {
    const dir = join(__dirname, '..', 'e2e', 'output');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'demo-backup.json'), JSON.stringify(backup));
  }
});
