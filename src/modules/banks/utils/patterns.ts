import type { Minor } from '../../shared/db/types';

/** Building blocks for bank templates. Regex sources are strings so they can be combined. */

/** An amount: "1,234.56" (Arabic-Indic digits are normalized before matching). */
export const NUM = '([\\d٠-٩,]+(?:\\.\\d+)?)';
export const CCY = '([A-Z]{3})';
/** "المنتهي بـ" / "المنتهية بـ" / "بطاقة# ": the "ending in" phrase, any variant. */
export const ENDING = '(?:المنتهي(?:ة)?\\s*ب\\S*|#)';
export const LAST4 = '\\**\\s*\\**(\\d{3,4})';
export const DMY2 = '(\\d{1,2})\\/(\\d{1,2})\\/(\\d{2})'; // 20/08/26
export const DMY4 = '(\\d{1,2})-(\\d{1,2})-(\\d{4})'; // 20-08-2026
export const HM = '(\\d{1,2}):(\\d{2})';
/** "الرصيد المتاح EGP 1234.56" or "الرصيد المتاح 1234.56 EGP". */
export const BALANCE = `الرصيد المتاح\\s*(?:${CCY}\\s*${NUM}|${NUM}\\s*${CCY})`;

export const re = (s: string) => new RegExp(s, 's');

export function normalizeDigits(s: string): string {
  return s.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
}

export function toMinorText(s: string | undefined): Minor | null {
  if (!s) return null;
  const n = Number(s.replace(/,/g, ''));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : null;
}

export function clean(s: string | undefined): string | null {
  if (!s) return null;
  const v = s.replace(/\s+/g, ' ').trim();
  return v.length ? v : null;
}

/** Day/month/2-digit year and hour:minute starting at group `i`. */
export function dt2(m: RegExpMatchArray, i: number): number {
  const [d, mo, y, h, mi] = [m[i], m[i + 1], m[i + 2], m[i + 3], m[i + 4]].map(Number);
  return new Date(2000 + y, mo - 1, d, h, mi).getTime();
}

/** Day-month-4-digit year and hour:minute starting at group `i`. */
export function dt4(m: RegExpMatchArray, i: number): number {
  const [d, mo, y, h, mi] = [m[i], m[i + 1], m[i + 2], m[i + 3], m[i + 4]].map(Number);
  return new Date(y, mo - 1, d, h, mi).getTime();
}

export function dateOnly(d: number, mo: number, y: number): number {
  return new Date(y, mo - 1, d, 12, 0).getTime();
}

/** Reads a `BALANCE` group starting at `i`; it captures either (ccy, num) or (num, ccy). */
export function balance(m: RegExpMatchArray, i: number): { balance: Minor | null; balanceCurrency: string | null } {
  const ccy = m[i] ?? m[i + 3];
  const num = m[i + 1] ?? m[i + 2];
  return { balance: toMinorText(num), balanceCurrency: ccy ?? null };
}
