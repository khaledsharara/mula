import { differenceInCalendarDays } from 'date-fns';

import type { Frequency, Minor, Recurring, RecurringMode } from '../../shared/db/types';
import { dayLabel, shortDate } from '../../shared/utils/dates';

const UNITS: Record<Frequency, [string, string]> = {
  daily: ['day', 'days'],
  weekly: ['week', 'weeks'],
  monthly: ['month', 'months'],
  yearly: ['year', 'years'],
};

/** "month" / "months" for the "Every n …" stepper. */
export const unitLabel = (f: Frequency, n: number): string => (n === 1 ? UNITS[f][0] : UNITS[f][1]);

/** "Today", "Tomorrow", then the shared day label ("Tue 21 Oct"). */
export function dueDayLabel(ts: number, now = Date.now()): string {
  const diff = differenceInCalendarDays(ts, now);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  return dayLabel(ts, now);
}

/** "Due today", "Due tomorrow", "Due Tue 21 Oct", "Was due 3 Oct". */
export function dueText(ts: number, now = Date.now()): string {
  const diff = differenceInCalendarDays(ts, now);
  if (diff < 0) return `Was due ${shortDate(ts)}`;
  if (diff === 0) return 'Due today';
  if (diff === 1) return 'Due tomorrow';
  return `Due ${dayLabel(ts, now)}`;
}

/** "In 12 days" / "3 days ago"; null for today and the days either side (the label already says it). */
export function relativeDays(ts: number, now = Date.now()): string | null {
  const diff = differenceInCalendarDays(ts, now);
  if (Math.abs(diff) <= 1) return null;
  return diff > 0 ? `In ${diff} days` : `${-diff} days ago`;
}

export const modeHint =(m: RecurringMode): string => (m === 'auto' ? 'Logs automatically' : 'Asks you to confirm');

/** Second line of a series row: when it's next due and how it's handled. */
export function seriesStatus(r: Recurring, now = Date.now()): string {
  if (!r.active) return 'Paused';
  if (r.nextDue == null) return 'Ended';
  return `${dueText(r.nextDue, now)}, ${modeHint(r.mode).toLowerCase()}`;
}

/** Spending shows as negative, income positive, transfers unsigned. */
export const signedAmount = (r: Pick<Recurring, 'type' | 'amount'>): Minor =>
  r.type === 'expense' ? -(r.amount ?? 0) : (r.amount ?? 0);

export function reminderLabel(days: number): string {
  if (days < 0) return 'Off';
  if (days === 0) return 'On the day';
  return days === 1 ? '1 day before' : `${days} days before`;
}

/** Minor units back to an editable string: 125000 → "1250", 99950 → "999.50". */
export function amountInput(minor: Minor | null): string {
  if (!minor) return '';
  const v = minor / 100;
  return Number.isInteger(v) ? String(v) : v.toFixed(2);
}

export const plural = (n: number, one: string, many: string): string => (n === 1 ? one : many);
