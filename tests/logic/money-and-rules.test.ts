import { parseCsvAmount, parseDate } from '@/modules/data-transfer/utils/csv';
import { describeRule, dueIndexes, nextDue, occurrenceAt, type RecurrenceRule } from '@/modules/recurring/utils/recurrence';
import { INSTAPAY_DEFAULT_FEE } from '@/modules/shared/settings/settingsStore';
import { formatMoney, parseAmount, splitMoney } from '@/modules/shared/utils/money';
import { normalizeRaw } from '@/modules/shared/utils/text';
import { instapayFee } from '@/modules/transactions/utils/instapay';

describe('InstaPay fee (0.1%, minimum EGP 0.50, maximum EGP 20)', () => {
  it.each([
    [1_00, 50],
    [10_00, 50],
    [100_00, 50],
    [500_00, 50],
    [850_00, 85],
    [1_234_56, 123],
    [20_000_00, 2000],
    [25_000_00, 2000],
    [0, 0],
  ])('%i piastres → %i', (amount, fee) => {
    expect(instapayFee(amount, INSTAPAY_DEFAULT_FEE)).toBe(fee);
  });
});

describe('money formatting', () => {
  it('formats with a true minus and grouping', () => {
    expect(formatMoney(-64000)).toBe('−640.00');
    expect(formatMoney(1248050, { currency: 'EGP' })).toBe('EGP 12,480.50');
    expect(formatMoney(500, { sign: 'always' })).toBe('+5.00');
  });
  it('splits whole and fraction for display', () => {
    expect(splitMoney(1248050)).toEqual({ whole: '12,480', fraction: '50', negative: false });
  });
  it('parses typed amounts, including Arabic digits', () => {
    expect(parseAmount('1,250.5')).toBe(125050);
    expect(parseAmount('١٢٥٠')).toBe(125000);
    expect(parseAmount('abc')).toBeNull();
  });
});

describe('recurrence', () => {
  const monthly: RecurrenceRule = {
    frequency: 'monthly',
    interval: 1,
    startDate: new Date(2026, 0, 31, 9, 0).getTime(),
    endType: 'never',
    endDate: null,
    endCount: null,
  };

  it('keeps month-end dates from drifting', () => {
    expect(new Date(occurrenceAt(monthly, 1)).getDate()).toBe(28); // February
    expect(new Date(occurrenceAt(monthly, 2)).getDate()).toBe(31); // March, not the 28th
  });

  it('lists every occurrence that is due', () => {
    const now = new Date(2026, 3, 1).getTime();
    expect(dueIndexes(monthly, 0, now)).toEqual([0, 1, 2]);
    expect(dueIndexes(monthly, 2, now)).toEqual([2]);
  });

  it('stops after a count or an end date', () => {
    expect(nextDue({ ...monthly, endType: 'count', endCount: 3 }, 3)).toBeNull();
    expect(nextDue({ ...monthly, endType: 'until', endDate: new Date(2026, 1, 15).getTime() }, 1)).toBeNull();
  });

  it('describes the rule in words', () => {
    expect(describeRule({ frequency: 'monthly', interval: 1, startDate: new Date(2026, 0, 5).getTime() })).toBe('Every month on the 5th');
    expect(describeRule({ frequency: 'weekly', interval: 2, startDate: new Date(2026, 9, 12).getTime() })).toBe('Every 2 weeks on Monday');
  });
});

describe('CSV import helpers', () => {
  it('reads bank-statement style amounts', () => {
    expect(parseCsvAmount('(1,234.50)')).toBe(-123450);
    expect(parseCsvAmount('-250')).toBe(-25000);
    expect(parseCsvAmount('1.234,50')).toBe(123450);
    expect(parseCsvAmount('EGP 99.99')).toBe(9999);
    expect(parseCsvAmount('')).toBeNull();
  });
  it('reads dates in the chosen order', () => {
    expect(new Date(parseDate('03/04/2026', '14:30', 'dmy')!)).toEqual(new Date(2026, 3, 3, 14, 30));
    expect(new Date(parseDate('03/04/2026', undefined, 'mdy')!)).toEqual(new Date(2026, 2, 4, 12, 0));
    expect(new Date(parseDate('2026-10-16', undefined, 'dmy')!)).toEqual(new Date(2026, 9, 16, 12, 0));
  });
});

describe('alias keys', () => {
  it('normalizes spacing and case so the same merchant always matches', () => {
    expect(normalizeRaw('PAYMOB  Sample Coffee Co ')).toBe('PAYMOB SAMPLE COFFEE CO');
    expect(normalizeRaw('nour  test')).toBe(normalizeRaw('NOUR TEST'));
  });
});
