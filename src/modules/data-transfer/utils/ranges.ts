import { format, startOfMonth, startOfYear, subMonths } from 'date-fns';

/** Periods offered when exporting records or importing bank history. */
export type PeriodRange = 'month' | 'last3' | 'year' | 'all';

export const PERIOD_LABELS: Record<PeriodRange, string> = {
  month: 'This month',
  last3: 'Last 3 months',
  year: 'This year',
  all: 'Everything',
};

/** Start of the period, or null for everything. "Last 3 months" is this month plus the two before it. */
export function rangeStart(range: PeriodRange, now: number = Date.now()): number | null {
  if (range === 'month') return startOfMonth(now).getTime();
  if (range === 'last3') return startOfMonth(subMonths(now, 2)).getTime();
  if (range === 'year') return startOfYear(now).getTime();
  return null;
}

/** Plain description of the period, e.g. "August to October 2026". */
export function rangeDescription(range: PeriodRange, now: number = Date.now()): string {
  if (range === 'month') return format(now, 'MMMM yyyy');
  if (range === 'last3') {
    const start = rangeStart('last3', now)!;
    return format(start, 'yyyy') === format(now, 'yyyy')
      ? `${format(start, 'MMMM')} to ${format(now, 'MMMM yyyy')}`
      : `${format(start, 'MMMM yyyy')} to ${format(now, 'MMMM yyyy')}`;
  }
  if (range === 'year') return `1 January to today`;
  return 'Every record on this phone';
}

/** File name part for an export: "2026-10", "2026-08-to-2026-10", "2026", "all-2026-10-17". */
export function rangeFileSuffix(range: PeriodRange, now: number = Date.now()): string {
  if (range === 'month') return format(now, 'yyyy-MM');
  if (range === 'last3') return `${format(rangeStart('last3', now)!, 'yyyy-MM')}-to-${format(now, 'yyyy-MM')}`;
  if (range === 'year') return format(now, 'yyyy');
  return `all-${format(now, 'yyyy-MM-dd')}`;
}
