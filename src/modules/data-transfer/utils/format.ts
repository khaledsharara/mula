import { differenceInCalendarDays } from 'date-fns';

import { shortDate, timeLabel } from '../../shared/utils/dates';
import type { Backup } from './backup';

const counter = new Intl.NumberFormat('en-US');

/** "1 record", "1,204 records". */
export function countLabel(n: number, one: string, many = `${one}s`): string {
  return `${counter.format(n)} ${n === 1 ? one : many}`;
}

export const formatCount = (n: number): string => counter.format(n);

/** "a", "a and b", "a, b and c". */
export function joinList(parts: string[]): string {
  if (parts.length <= 1) return parts[0] ?? '';
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

/** How long ago the last backup was: "today", "yesterday", "3 days ago", "on 12 Oct". */
export function backupAgeLabel(ts: number, now: number = Date.now()): string {
  const days = differenceInCalendarDays(now, ts);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days} days ago`;
  return `on ${shortDate(ts)}`;
}

/** "Last backup today at 14:02", "Last backup on 14 Oct, 3 days ago", "Last backup on 2 Aug". */
export function lastBackupLine(ts: number, now: number = Date.now()): string {
  const days = differenceInCalendarDays(now, ts);
  if (days <= 0) return `Last backup today at ${timeLabel(ts)}`;
  if (days === 1) return `Last backup yesterday at ${timeLabel(ts)}`;
  if (days < 30) return `Last backup on ${shortDate(ts)}, ${days} days ago`;
  return `Last backup on ${shortDate(ts)}`;
}

/** "1,204 records, 6 accounts and 48 payees" for the restore confirmation. */
export function describeBackup(backup: Backup): string {
  const t = backup.tables;
  const records = (t.transactions ?? []).filter((r) => !r.parent_id).length;
  const parts: [number, string][] = [
    [records, 'record'],
    [t.accounts?.length ?? 0, 'account'],
    [t.payees?.length ?? 0, 'payee'],
    [t.recurring?.length ?? 0, 'planned payment'],
    [t.debts?.length ?? 0, 'debt'],
    [t.templates?.length ?? 0, 'template'],
  ];
  const text = joinList(parts.filter(([n]) => n > 0).map(([n, word]) => countLabel(n, word)));
  return text || 'an empty backup';
}
