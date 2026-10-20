/**
 * Dates in the user's time zone (the phone uploads it as the `timeZone` setting). The Worker runs
 * in UTC, but "today", "last month" and "October 3" mean the user's local calendar.
 */

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatter(tz: string): Intl.DateTimeFormat {
  let f = formatters.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      weekday: 'short',
    });
    formatters.set(tz, f);
  }
  return f;
}

export function validZone(tz: string | null | undefined): string {
  if (!tz) return 'UTC';
  try {
    formatter(tz);
    return tz;
  } catch {
    return 'UTC';
  }
}

export type LocalParts = { y: number; m: number; d: number; h: number; mi: number; s: number; weekday: number };

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function localParts(at: number, tz: string): LocalParts {
  const parts: Record<string, string> = {};
  for (const p of formatter(tz).formatToParts(new Date(at))) parts[p.type] = p.value;
  return { y: +parts.year, m: +parts.month, d: +parts.day, h: +parts.hour, mi: +parts.minute, s: +parts.second, weekday: WEEKDAYS.indexOf(parts.weekday) };
}

function offsetAt(at: number, tz: string): number {
  const p = localParts(at, tz);
  return Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi, p.s) - Math.floor(at / 1000) * 1000;
}

/** The instant of a local wall-clock time. */
export function fromLocal(tz: string, y: number, m: number, d: number, h = 0, mi = 0, s = 0, ms = 0): number {
  const guess = Date.UTC(y, m - 1, d, h, mi, s, ms);
  const first = guess - offsetAt(guess, tz);
  const second = guess - offsetAt(first, tz);
  return second;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** "2026-10-16 13:30" in the user's zone. */
export function formatLocal(at: number, tz: string): string {
  const p = localParts(at, tz);
  return `${p.y}-${pad(p.m)}-${pad(p.d)} ${pad(p.h)}:${pad(p.mi)}`;
}

export function formatDay(at: number, tz: string): string {
  const p = localParts(at, tz);
  return `${p.y}-${pad(p.m)}-${pad(p.d)}`;
}

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
const LOCAL_DATETIME = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/;

/**
 * A moment from what Claude sent: ISO 8601 with an offset, a local "YYYY-MM-DD HH:mm", or a bare
 * date (`edge` picks its start, end, or noon for a transaction's date).
 */
export function parseMoment(input: unknown, tz: string, edge: 'start' | 'end' | 'noon' = 'noon'): number | null {
  if (typeof input === 'number' && Number.isFinite(input)) return input;
  if (typeof input !== 'string' || !input.trim()) return null;
  const text = input.trim();
  const day = DATE_ONLY.exec(text);
  if (day) {
    const [y, m, d] = [+day[1], +day[2], +day[3]];
    if (edge === 'start') return fromLocal(tz, y, m, d);
    if (edge === 'end') return fromLocal(tz, y, m, d, 23, 59, 59, 999);
    return fromLocal(tz, y, m, d, 12);
  }
  const local = LOCAL_DATETIME.exec(text);
  if (local) return fromLocal(tz, +local[1], +local[2], +local[3], +local[4], +local[5], local[6] ? +local[6] : 0);
  const t = Date.parse(text);
  return Number.isFinite(t) ? t : null;
}

export type Period = { from: number; to: number; label: string };

export const PERIODS = ['today', 'yesterday', 'this_week', 'last_week', 'this_month', 'last_month', 'last_30_days', 'last_90_days', 'this_year', 'last_year', 'all_time'] as const;

/** A named period ("last_month") or explicit from/to, in the user's zone. */
export function resolvePeriod(args: { period?: unknown; from?: unknown; to?: unknown }, tz: string, now = Date.now()): Period | { error: string } {
  const p = localParts(now, tz);
  const startOfDay = (y: number, m: number, d: number) => fromLocal(tz, y, m, d);
  const endOfDay = (y: number, m: number, d: number) => fromLocal(tz, y, m, d, 23, 59, 59, 999);
  const fromArg = args.from != null ? parseMoment(args.from, tz, 'start') : null;
  const toArg = args.to != null ? parseMoment(args.to, tz, 'end') : null;
  if (args.from != null && fromArg == null) return { error: 'from must be a date like 2026-10-01' };
  if (args.to != null && toArg == null) return { error: 'to must be a date like 2026-10-31' };
  if (fromArg != null || toArg != null) {
    return { from: fromArg ?? 0, to: toArg ?? now, label: `${fromArg != null ? formatDay(fromArg, tz) : 'the start'} to ${toArg != null ? formatDay(toArg, tz) : 'now'}` };
  }
  const period = typeof args.period === 'string' ? args.period : 'this_month';
  const dayMs = 86_400_000;
  switch (period) {
    case 'today':
      return { from: startOfDay(p.y, p.m, p.d), to: endOfDay(p.y, p.m, p.d), label: 'today' };
    case 'yesterday': {
      const y = localParts(now - dayMs, tz);
      return { from: startOfDay(y.y, y.m, y.d), to: endOfDay(y.y, y.m, y.d), label: 'yesterday' };
    }
    case 'this_week':
    case 'last_week': {
      // Weeks start on Monday.
      const back = (p.weekday + 6) % 7;
      const monday = localParts(now - back * dayMs, tz);
      const start = startOfDay(monday.y, monday.m, monday.d);
      if (period === 'this_week') return { from: start, to: now, label: 'this week' };
      const prev = localParts(start - 7 * dayMs + 3_600_000 * 12, tz);
      return { from: startOfDay(prev.y, prev.m, prev.d), to: start - 1, label: 'last week' };
    }
    case 'this_month':
      return { from: startOfDay(p.y, p.m, 1), to: now, label: 'this month' };
    case 'last_month': {
      const y = p.m === 1 ? p.y - 1 : p.y;
      const m = p.m === 1 ? 12 : p.m - 1;
      return { from: startOfDay(y, m, 1), to: startOfDay(p.y, p.m, 1) - 1, label: 'last month' };
    }
    case 'last_30_days':
      return { from: now - 30 * dayMs, to: now, label: 'the last 30 days' };
    case 'last_90_days':
      return { from: now - 90 * dayMs, to: now, label: 'the last 90 days' };
    case 'this_year':
      return { from: startOfDay(p.y, 1, 1), to: now, label: 'this year' };
    case 'last_year':
      return { from: startOfDay(p.y - 1, 1, 1), to: startOfDay(p.y, 1, 1) - 1, label: 'last year' };
    case 'all_time':
      return { from: 0, to: now, label: 'all time' };
    default:
      return { error: `period must be one of ${PERIODS.join(', ')}` };
  }
}
