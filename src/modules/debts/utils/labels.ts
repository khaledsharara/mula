import { differenceInCalendarDays, startOfDay } from 'date-fns';

import type { DebtDirection, Minor } from '../../shared/db/types';
import { shortDate } from '../../shared/utils/dates';
import type { DebtWithProgress } from '../data/debtsRepo';

export function isOverdue(d: DebtWithProgress, now = Date.now()): boolean {
  return d.status === 'open' && d.remaining > 0 && d.dueDate != null && d.dueDate < startOfDay(now).getTime();
}

/** "Lent 12 Oct" / "Borrowed 3 Sep". */
export const startedLabel = (d: Pick<DebtWithProgress, 'direction' | 'date'>): string =>
  `${d.direction === 'lent' ? 'Lent' : 'Borrowed'} ${shortDate(d.date)}`;

/**
 * The due part of a row subtitle, lower-case because it follows a comma:
 * "due 1 Nov", "due today", "overdue since 1 Nov", "settled 20 Oct".
 */
export function dueInfo(d: DebtWithProgress, now = Date.now()): { text: string; overdue: boolean } | null {
  if (d.status === 'closed') return d.closedAt ? { text: `settled ${shortDate(d.closedAt)}`, overdue: false } : null;
  if (d.dueDate == null) return null;
  if (isOverdue(d, now)) return { text: `overdue since ${shortDate(d.dueDate)}`, overdue: true };
  const diff = differenceInCalendarDays(d.dueDate, now);
  if (diff === 0) return { text: 'due today', overdue: false };
  if (diff === 1) return { text: 'due tomorrow', overdue: false };
  return { text: `due ${shortDate(d.dueDate)}`, overdue: false };
}

/** Share repaid, 0–1. */
export const repaidShare = (d: Pick<DebtWithProgress, 'amount' | 'repaid'>): number =>
  d.amount > 0 ? Math.min(1, d.repaid / d.amount) : 0;

export const directionLine = (dir: DebtDirection): string => (dir === 'lent' ? 'Owes you' : 'You owe');

/** Minor units back to an editable string: 125000 → "1250", 99950 → "999.50". */
export function amountInput(minor: Minor | null | undefined): string {
  if (!minor) return '';
  const v = minor / 100;
  return Number.isInteger(v) ? String(v) : v.toFixed(2);
}

/** Currencies in a totals bucket, base currency first. */
export function sortedCurrencies(bucket: Record<string, Minor>, base: string): string[] {
  return Object.keys(bucket)
    .filter((k) => bucket[k] > 0)
    .sort((a, b) => (a === base ? -1 : b === base ? 1 : a.localeCompare(b)));
}
