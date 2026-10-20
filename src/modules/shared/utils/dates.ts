import {
  addDays,
  differenceInCalendarDays,
  endOfDay,
  endOfMonth,
  format,
  isSameYear,
  startOfDay,
  startOfMonth,
  subMonths,
} from 'date-fns';

export const DAY_MS = 86_400_000;

/** "Today", "Yesterday", "Thu 14 Oct", "14 Oct 2025". */
export function dayLabel(ts: number, now = Date.now()): string {
  const diff = differenceInCalendarDays(now, ts);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff > 1 && diff < 7) return format(ts, 'EEEE');
  return isSameYear(ts, now) ? format(ts, 'EEE d MMM') : format(ts, 'd MMM yyyy');
}

export const timeLabel = (ts: number): string => format(ts, 'HH:mm');
export const shortDate = (ts: number): string =>
  isSameYear(ts, Date.now()) ? format(ts, 'd MMM') : format(ts, 'd MMM yyyy');
export const monthLabel = (ts: number): string => format(ts, 'MMMM');
export const monthYearLabel = (ts: number): string => format(ts, 'MMMM yyyy');
export const isoDay = (ts: number): string => format(ts, 'yyyy-MM-dd');

/** "2 days", "5 h", "12 min" for inbox ageing (at least "1 min"). */
export function ageLabel(ts: number, now = Date.now()): string {
  const mins = Math.max(1, Math.round((now - ts) / 60_000));
  if (mins < 60) return `${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h`;
  const days = Math.round(hours / 24);
  return days === 1 ? '1 day' : `${days} days`;
}

export type Period = { start: number; end: number };

export function monthPeriod(ts: number, offset = 0): Period {
  const d = subMonths(ts, -offset);
  return { start: startOfMonth(d).getTime(), end: endOfMonth(d).getTime() };
}

export function lastNDays(n: number, now = Date.now()): Period {
  return { start: startOfDay(addDays(now, -(n - 1))).getTime(), end: endOfDay(now).getTime() };
}

export { addDays, startOfDay, endOfDay, startOfMonth, endOfMonth, format };
