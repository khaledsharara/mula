import { applyNumpadKey, evaluateExpression, type NumpadKey } from '@/modules/shared/components/Numpad';
import { byCategory, natureSplit, totals, type StatsContext } from '@/modules/insights/utils/aggregations';
import type { Category, Transaction } from '@/modules/shared/db/types';

const type = (keys: NumpadKey[]) => keys.reduce((e, k) => applyNumpadKey(e, k), '');

describe('numpad', () => {
  it('builds and evaluates sums with normal precedence', () => {
    expect(type(['2', '5', '0', '+', '3', '5', '.', '5'])).toBe('250+35.5');
    expect(evaluateExpression('250+35.5')).toBe(285.5);
    expect(evaluateExpression('100+20×3')).toBe(160);
    expect(evaluateExpression('90÷4')).toBe(22.5);
  });
  it('limits to two decimals and one dot, and replaces a trailing operator', () => {
    expect(type(['1', '.', '2', '3', '4'])).toBe('1.23');
    expect(type(['1', '.', '.'])).toBe('1.');
    expect(type(['5', '+', '−'])).toBe('5−');
    expect(evaluateExpression('5+')).toBe(5);
  });
});

const cat = (id: string, nature: Category['nature'], parentId: string | null = null): Category => ({
  id, parentId, name: id, kind: 'expense', icon: 'shapes', color: '#000', nature, systemKey: null, archived: false, sortOrder: 0,
});

const tx = (p: Partial<Transaction>): Transaction => ({
  id: Math.random().toString(36), type: 'expense', amount: 0, currency: 'EGP', accountId: 'a', toAccountId: null, toAmount: null,
  categoryId: null, payeeId: null, paymentType: 'cash', date: Date.now(), note: null, isInstapay: false, parentId: null,
  natureOverride: null, originalAmount: null, originalCurrency: null, fxRate: null, baseAmount: 0, recurringId: null,
  debtId: null, source: 'manual', sourceRef: null, createdAt: 0, updatedAt: 0, ...p,
});

describe('statistics', () => {
  const ctx: StatsContext = {
    categories: new Map([
      ['food', cat('food', 'none')],
      ['groceries', cat('groceries', 'need', 'food')],
      ['restaurant', cat('restaurant', 'want', 'food')],
      ['fees', cat('fees', 'need')],
    ]),
    excludedAccounts: new Set(['savings']),
  };
  const txs = [
    tx({ amount: 1000, baseAmount: 1000, categoryId: 'groceries' }),
    tx({ amount: 400, baseAmount: 400, categoryId: 'restaurant' }),
    tx({ amount: 85, baseAmount: 85, categoryId: 'fees', parentId: 'x' }),
    tx({ amount: 9000, baseAmount: 9000, categoryId: 'restaurant', natureOverride: 'need' }),
    tx({ type: 'transfer', amount: 500, baseAmount: 500 }),
    tx({ amount: 700, baseAmount: 700, debtId: 'd1' }),
    tx({ amount: 300, baseAmount: 300, accountId: 'savings', categoryId: 'groceries' }),
    tx({ type: 'income', amount: 20000, baseAmount: 20000 }),
  ];

  it('counts fees as spending but leaves out transfers, debts and excluded accounts', () => {
    expect(totals(txs, ctx)).toEqual({ spent: 10485, earned: 20000, net: 9515, count: 4 });
  });

  it('splits needs and wants, honoring per-record overrides', () => {
    expect(natureSplit(txs, ctx)).toEqual({ need: 10085, want: 400, saving: 0, none: 0 });
  });

  it('rolls subcategories up to their group', () => {
    const top = byCategory(txs, ctx);
    expect(top[0]).toMatchObject({ id: 'food', amount: 10400 });
  });
});
