import type { Minor } from '../db/types';

export const MINUS = '−';

/** All supported currencies use two decimals, so minor units are always hundredths. */
export const toMinor = (major: number): Minor => Math.round(major * 100);
export const toMajor = (minor: Minor): number => minor / 100;

const formatters = new Map<number, Intl.NumberFormat>();
function nf(decimals: number): Intl.NumberFormat {
  let f = formatters.get(decimals);
  if (!f) {
    f = new Intl.NumberFormat('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    formatters.set(decimals, f);
  }
  return f;
}

const COMPACT_UNITS: [number, string][] = [
  [1e9, 'B'],
  [1e6, 'M'],
  [1e3, 'K'],
];

/** "950", "1.2K", "12K", "3.4M". Done by hand: Intl's compact notation isn't reliable on Hermes. */
export function compactNumber(n: number): string {
  const one = (x: number) => (Math.round(x * 10) / 10).toFixed(1).replace(/\.0$/, '');
  for (let i = 0; i < COMPACT_UNITS.length; i++) {
    const [size, suffix] = COMPACT_UNITS[i];
    if (n < size) continue;
    const scaled = Math.round((n / size) * 10) / 10;
    // 999,960 rounds to "1000K"; say "1M" instead.
    if (scaled >= 1000 && i > 0) return `${one(n / COMPACT_UNITS[i - 1][0])}${COMPACT_UNITS[i - 1][1]}`;
    return `${one(scaled)}${suffix}`;
  }
  return one(n);
}

export type FormatOptions = {
  /** Prefix with − / + for spending and income. */
  sign?: 'auto' | 'always' | 'never';
  currency?: string | null;
  decimals?: 0 | 2;
  compact?: boolean;
};

/** "12,480.50", "−640.00", "EGP 1.2K". The minus is a true minus sign. */
export function formatMoney(minor: Minor, opts: FormatOptions = {}): string {
  const { sign = 'auto', currency = null, decimals = 2, compact = false } = opts;
  const abs = Math.abs(minor) / 100;
  const body = compact ? compactNumber(abs) : nf(decimals).format(abs);
  let prefix = '';
  if (sign === 'always') prefix = minor < 0 ? MINUS : minor > 0 ? '+' : '';
  else if (sign === 'auto') prefix = minor < 0 ? MINUS : '';
  return `${prefix}${currency ? `${currency} ` : ''}${body}`;
}

/** Splits for display so the decimals can be set smaller and quieter. */
export function splitMoney(minor: Minor): { whole: string; fraction: string; negative: boolean } {
  const s = nf(2).format(Math.abs(minor) / 100);
  const [whole, fraction = '00'] = s.split('.');
  return { whole, fraction, negative: minor < 0 };
}

/**
 * Parses user input like "1,250.5", "12,50" (comma decimals, as some iPhone regions type them),
 * "١٢٥٠" or "١٢٫٥" into minor units; null when not a number.
 */
export function parseAmount(input: string): Minor | null {
  let western = input
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/٫/g, '.')
    .replace(/[\u066C\s\u00A0']/g, '')
    .trim();
  const lastComma = western.lastIndexOf(',');
  if (lastComma > western.lastIndexOf('.') && /^\d{1,2}$/.test(western.slice(lastComma + 1))) {
    // The comma is the decimal separator ("12,50", "1.250,50").
    western = `${western.slice(0, lastComma).replace(/[.,]/g, '')}.${western.slice(lastComma + 1)}`;
  } else {
    western = western.replace(/,/g, '');
  }
  if (!western || !/^-?\d*\.?\d*$/.test(western)) return null;
  const n = Number(western);
  return Number.isFinite(n) ? toMinor(n) : null;
}

export const CURRENCIES = ['EGP', 'USD', 'EUR', 'GBP', 'SAR', 'AED', 'KWD', 'QAR', 'TRY', 'INR', 'CAD', 'AUD', 'CHF', 'JPY', 'CNY'] as const;

export const CURRENCY_NAMES: Record<string, string> = {
  EGP: 'Egyptian pound',
  USD: 'US dollar',
  EUR: 'Euro',
  GBP: 'British pound',
  SAR: 'Saudi riyal',
  AED: 'UAE dirham',
  KWD: 'Kuwaiti dinar',
  QAR: 'Qatari riyal',
  TRY: 'Turkish lira',
  INR: 'Indian rupee',
  CAD: 'Canadian dollar',
  AUD: 'Australian dollar',
  CHF: 'Swiss franc',
  JPY: 'Japanese yen',
  CNY: 'Chinese yuan',
};
