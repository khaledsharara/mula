import { all, first, run, type Params } from '../../shared/db/client';
import { SYNCED_SETTINGS, SYNCED_TABLES, SYNCED_TABLE_NAMES, NOW_MS_SQL, isSyncedTable, type SyncedTable } from '../../shared/db/syncSchema';
import type { SyncChange, SyncRow } from '../types';

/**
 * Row-level sync shared by the app and the relay (both run this file on their own SQLite):
 * reading the change log, attaching current rows, and applying rows from the other side.
 * Conflicts resolve per record, newest change wins.
 */

export type OutboxEntry = { seq: number; tbl: SyncedTable; pk: string; at: number; origin: string | null };

/** SQLite (and the relay's Durable Object) bind at most 100 values per statement. */
const CHUNK = 90;

function chunks<T>(list: T[], size = CHUNK): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

/** Change-log entries in order. The app reads its unsent changes; the relay reads what a device hasn't seen. */
export async function readOutbox(opts: { after?: number; limit: number }): Promise<OutboxEntry[]> {
  return all<OutboxEntry>('SELECT seq, tbl, pk, at, origin FROM sync_outbox WHERE seq > ? ORDER BY seq LIMIT ?', [opts.after ?? 0, opts.limit]);
}

export async function outboxSize(): Promise<number> {
  return (await first<{ n: number }>('SELECT COUNT(*) AS n FROM sync_outbox'))?.n ?? 0;
}

export async function outboxEntry(tbl: SyncedTable, pk: string): Promise<OutboxEntry | null> {
  return first<OutboxEntry>('SELECT seq, tbl, pk, at, origin FROM sync_outbox WHERE tbl = ? AND pk = ?', [tbl, pk]);
}

/** Forgets sent entries, unless the record changed again since (it then has a newer seq). */
export async function clearOutbox(entries: Pick<OutboxEntry, 'seq'>[]): Promise<void> {
  for (const part of chunks(entries.map((e) => e.seq))) {
    await run(`DELETE FROM sync_outbox WHERE seq IN (${part.map(() => '?').join(',')})`, part);
  }
}

/** Pairs each entry with its record as it is now (null when it was deleted). */
export async function attachRows(entries: Pick<OutboxEntry, 'tbl' | 'pk' | 'at'>[]): Promise<SyncChange[]> {
  const found = new Map<string, SyncRow>();
  for (const table of SYNCED_TABLE_NAMES) {
    const pkCol = SYNCED_TABLES[table];
    const keys = [...new Set(entries.filter((e) => e.tbl === table).map((e) => e.pk))];
    for (const part of chunks(keys)) {
      const rows = await all<SyncRow>(`SELECT * FROM ${table} WHERE ${pkCol} IN (${part.map(() => '?').join(',')})`, part);
      for (const r of rows) found.set(`${table}\u0000${String(r[pkCol])}`, r);
    }
  }
  return entries.map((e) => ({ tbl: e.tbl, pk: e.pk, at: e.at, row: found.get(`${e.tbl}\u0000${e.pk}`) ?? null }));
}

/** Puts every synced record in the change log, e.g. before the first upload of this phone's data. */
export async function enqueueAll(): Promise<void> {
  for (const table of SYNCED_TABLE_NAMES) {
    const pk = SYNCED_TABLES[table];
    const filter = table === 'settings' ? ` WHERE key IN (${SYNCED_SETTINGS.map(() => '?').join(', ')})` : '';
    await run(
      `INSERT OR REPLACE INTO sync_outbox (seq, tbl, pk, at, origin)
       SELECT (SELECT rev FROM sync_state) + ROW_NUMBER() OVER (), '${table}', ${pk}, ${NOW_MS_SQL}, NULL FROM ${table}${filter}`,
      table === 'settings' ? [...SYNCED_SETTINGS] : [],
    );
    await run('UPDATE sync_state SET rev = MAX(rev, (SELECT COALESCE(MAX(seq), 0) FROM sync_outbox))');
  }
}

/** While on, the change triggers ignore every write (they came from the other side). */
export async function setApplying(on: boolean): Promise<void> {
  await run('UPDATE sync_state SET applying = ?', [on ? 1 : 0]);
}

/**
 * Applies one remote record with only that record's change tracking paused, so a save the app
 * makes at the same moment (to any other record) is still recorded.
 */
export async function applyIncoming(change: SyncChange): Promise<void> {
  await run('INSERT OR IGNORE INTO sync_incoming (tbl, pk) VALUES (?, ?)', [change.tbl, change.pk]);
  try {
    await applyChange(change);
  } finally {
    await run('DELETE FROM sync_incoming WHERE tbl = ? AND pk = ?', [change.tbl, change.pk]);
  }
}

/** Next revision number; the relay stamps every stored change with one. */
export async function nextRev(count = 1): Promise<number> {
  await run('UPDATE sync_state SET rev = rev + ?', [count]);
  return (await first<{ rev: number }>('SELECT rev FROM sync_state'))!.rev;
}

const columnCache = new Map<string, Set<string>>();

export async function columnsOf(table: string): Promise<Set<string>> {
  let cols = columnCache.get(table);
  if (!cols) {
    cols = new Set((await all<{ name: string }>(`PRAGMA table_info(${table})`)).map((c) => c.name));
    columnCache.set(table, cols);
  }
  return cols;
}

/** Runs `fn` with change tracking on, so what it writes is sent to the other side too. */
async function tracked(fn: () => Promise<void>): Promise<void> {
  const was = (await first<{ applying: number }>('SELECT applying FROM sync_state'))?.applying ?? 0;
  if (was) await setApplying(false);
  try {
    await fn();
  } finally {
    if (was) await setApplying(true);
  }
}

/**
 * Two records can't share a payee name or a bank message. When a remote record collides with a
 * different local one, the local one steps aside (renamed or re-keyed) instead of being lost.
 */
async function makeRoom(change: SyncChange & { row: SyncRow }): Promise<void> {
  const { row } = change;
  if (change.tbl === 'payees' && typeof row.name === 'string') {
    const clash = await first<{ id: string; name: string }>('SELECT id, name FROM payees WHERE name = ? COLLATE NOCASE AND id != ?', [row.name, change.pk]);
    if (!clash) return;
    let n = 2;
    while (await first('SELECT 1 FROM payees WHERE name = ? COLLATE NOCASE', [`${clash.name} (${n})`])) n++;
    await tracked(() => run('UPDATE payees SET name = ? WHERE id = ?', [`${clash.name} (${n})`, clash.id]));
  }
  if (change.tbl === 'inbox_items' && typeof row.dedupe_key === 'string') {
    const clash = await first<{ id: string }>('SELECT id FROM inbox_items WHERE dedupe_key = ? AND id != ?', [row.dedupe_key, change.pk]);
    if (!clash) return;
    await tracked(() => run("UPDATE inbox_items SET dedupe_key = dedupe_key || '|dup:' || id WHERE id = ?", [clash.id]));
  }
}

/**
 * Writes one record from the other side. Only columns both sides know are touched, so a newer
 * schema on one side never wipes columns the other side doesn't have yet. Call it with tracking
 * paused for the record (`applyIncoming`) or for everything (`setApplying`).
 */
export async function applyChange(change: SyncChange): Promise<void> {
  if (!isSyncedTable(change.tbl)) return;
  const pkCol = SYNCED_TABLES[change.tbl];
  if (change.tbl === 'settings' && !(SYNCED_SETTINGS as readonly string[]).includes(change.pk)) return;
  if (!change.row) {
    await run(`DELETE FROM ${change.tbl} WHERE ${pkCol} = ?`, [change.pk]);
    return;
  }
  const known = await columnsOf(change.tbl);
  const cols = Object.keys(change.row).filter((c) => known.has(c));
  if (!cols.includes(pkCol)) return;
  await makeRoom(change as SyncChange & { row: SyncRow });
  const updates = cols.filter((c) => c !== pkCol);
  const values = cols.map((c) => change.row![c]) as Params;
  await run(
    `INSERT INTO ${change.tbl} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})
     ON CONFLICT(${pkCol}) DO ${updates.length ? `UPDATE SET ${updates.map((c) => `${c} = excluded.${c}`).join(', ')}` : 'NOTHING'}`,
    values,
  );
}

/** Basic shape checks on changes that came over the network. */
export function validChanges(input: unknown, max: number): SyncChange[] | null {
  if (!Array.isArray(input) || input.length > max) return null;
  const out: SyncChange[] = [];
  for (const c of input) {
    if (!c || typeof c !== 'object') return null;
    const { tbl, pk, at, row } = c as Record<string, unknown>;
    if (!isSyncedTable(tbl) || typeof pk !== 'string' || !pk || typeof at !== 'number' || !Number.isFinite(at)) return null;
    if (row !== null && (typeof row !== 'object' || Array.isArray(row))) return null;
    if (row) {
      for (const v of Object.values(row as Record<string, unknown>)) {
        if (v !== null && typeof v !== 'string' && typeof v !== 'number') return null;
      }
      if (String((row as SyncRow)[SYNCED_TABLES[tbl]]) !== pk) return null;
    }
    out.push({ tbl, pk, at, row: (row as SyncRow | null) ?? null });
  }
  return out;
}
