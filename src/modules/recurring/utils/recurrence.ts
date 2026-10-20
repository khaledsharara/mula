import { addDays, addMonths, addWeeks, addYears, format } from 'date-fns';

import type { Frequency, Recurring, RecurringEnd } from '../../shared/db/types';

export type RecurrenceRule = {
  frequency: Frequency;
  interval: number;
  startDate: number;
  endType: RecurringEnd;
  endDate: number | null;
  endCount: number | null;
};

/**
 * The n-th occurrence (0-based), always computed from the start date so month-end dates
 * don't drift: 31 Jan → 28 Feb → 31 Mar, not 28 Mar.
 */
export function occurrenceAt(rule: RecurrenceRule, n: number): number {
  const step = n * Math.max(1, rule.interval);
  const s = rule.startDate;
  switch (rule.frequency) {
    case 'daily':
      return addDays(s, step).getTime();
    case 'weekly':
      return addWeeks(s, step).getTime();
    case 'monthly':
      return addMonths(s, step).getTime();
    case 'yearly':
      return addYears(s, step).getTime();
  }
}

/** Whether occurrence n exists under the end condition. */
export function isWithinEnd(rule: RecurrenceRule, n: number): boolean {
  if (rule.endType === 'count') return n < (rule.endCount ?? 0);
  if (rule.endType === 'until') return occurrenceAt(rule, n) <= (rule.endDate ?? 0);
  return true;
}

/** Next due date after `done` occurrences, or null when the series has ended. */
export function nextDue(rule: RecurrenceRule, done: number): number | null {
  return isWithinEnd(rule, done) ? occurrenceAt(rule, done) : null;
}

/** Occurrence indexes from `done` that are due on or before `now`. */
export function dueIndexes(rule: RecurrenceRule, done: number, now: number, cap = 120): number[] {
  const out: number[] = [];
  for (let n = done; out.length < cap && isWithinEnd(rule, n) && occurrenceAt(rule, n) <= now; n++) out.push(n);
  return out;
}

/** Upcoming dates within a window, for the "coming up" list. */
export function upcomingDates(rule: RecurrenceRule, done: number, from: number, to: number, cap = 12): number[] {
  const out: number[] = [];
  for (let n = done; out.length < cap && isWithinEnd(rule, n); n++) {
    const d = occurrenceAt(rule, n);
    if (d > to) break;
    if (d >= from) out.push(d);
  }
  return out;
}

const unit: Record<Frequency, [string, string]> = {
  daily: ['day', 'days'],
  weekly: ['week', 'weeks'],
  monthly: ['month', 'months'],
  yearly: ['year', 'years'],
};

/** "Every month on the 5th", "Every 2 weeks on Monday", "Every year on 3 Mar". */
export function describeRule(r: Pick<Recurring, 'frequency' | 'interval' | 'startDate'>): string {
  const every = r.interval === 1 ? `Every ${unit[r.frequency][0]}` : `Every ${r.interval} ${unit[r.frequency][1]}`;
  if (r.frequency === 'monthly') return `${every} on the ${ordinal(new Date(r.startDate).getDate())}`;
  if (r.frequency === 'weekly') return `${every} on ${format(r.startDate, 'EEEE')}`;
  if (r.frequency === 'yearly') return `${every} on ${format(r.startDate, 'd MMM')}`;
  return every;
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}
