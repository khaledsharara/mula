/**
 * Claude's change log. Every tool call that writes runs as one change set: triggers note the
 * "before" of each record it touches, and the "after" is captured when the call ends. Undo puts
 * the "before" back, skipping records that changed again since (someone edited them after Claude).
 */
import { all, first, run, transaction } from '../../src/modules/shared/db/client';
import { SYNCED_TABLES, SYNCED_TABLE_NAMES, type SyncedTable } from '../../src/modules/shared/db/syncSchema';
import { newId } from '../../src/modules/shared/utils/id';
import { columnsOf } from '../../src/modules/sync/data/syncStore';
import type { ClaudeActivity, UndoResponse } from '../../src/modules/sync/types';

const KEEP_CHANGES = 300;

async function jsonOf(table: SyncedTable, alias: string): Promise<string> {
  const cols = [...(await columnsOf(table))];
  return `json_object(${cols.map((c) => `'${c}', ${alias}.${c}`).join(', ')})`;
}

/** Tables and triggers that only the relay has. Safe to run on every start. */
export async function installServerSchema(): Promise<void> {
  await run(`CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL)`);
  await run(`CREATE TABLE IF NOT EXISTS claude_changes (
    id TEXT PRIMARY KEY NOT NULL, at INTEGER NOT NULL, tool TEXT NOT NULL, summary TEXT NOT NULL,
    rows INTEGER NOT NULL DEFAULT 0, undone_at INTEGER)`);
  await run('CREATE INDEX IF NOT EXISTS claude_changes_at ON claude_changes(at)');
  await run(`CREATE TABLE IF NOT EXISTS claude_change_rows (
    change_id TEXT NOT NULL, tbl TEXT NOT NULL, pk TEXT NOT NULL, before TEXT, after TEXT,
    PRIMARY KEY (change_id, tbl, pk))`);
  await run('CREATE TABLE IF NOT EXISTS undo_ctx (id INTEGER PRIMARY KEY NOT NULL CHECK (id = 1), change_id TEXT)');
  await run('INSERT OR IGNORE INTO undo_ctx (id, change_id) VALUES (1, NULL)');
  // A crash mid-call must not leave these on.
  await run('UPDATE undo_ctx SET change_id = NULL WHERE change_id IS NOT NULL');
  await run('UPDATE sync_state SET applying = 0 WHERE applying != 0');

  // Rebuild the capture triggers only when a table's columns changed.
  const parts: string[] = [];
  for (const table of SYNCED_TABLE_NAMES) parts.push(`${table}:${[...(await columnsOf(table))].join(',')}`);
  const signature = parts.join('|');
  const saved = await first<{ value: string }>("SELECT value FROM meta WHERE key = 'undo_triggers'");
  if (saved?.value === signature) return;
  for (const table of SYNCED_TABLE_NAMES) {
    const pk = SYNCED_TABLES[table];
    const when = 'WHEN (SELECT change_id FROM undo_ctx) IS NOT NULL';
    const capture = (row: 'OLD' | 'NEW', before: string) =>
      `INSERT OR IGNORE INTO claude_change_rows (change_id, tbl, pk, before) VALUES ((SELECT change_id FROM undo_ctx), '${table}', ${row}.${pk}, ${before});`;
    for (const name of ['bu', 'bd', 'ai']) await run(`DROP TRIGGER IF EXISTS undo_${table}_${name}`);
    await run(`CREATE TRIGGER undo_${table}_bu BEFORE UPDATE ON ${table} ${when} BEGIN ${capture('OLD', await jsonOf(table, 'OLD'))} END`);
    await run(`CREATE TRIGGER undo_${table}_bd BEFORE DELETE ON ${table} ${when} BEGIN ${capture('OLD', await jsonOf(table, 'OLD'))} END`);
    await run(`CREATE TRIGGER undo_${table}_ai AFTER INSERT ON ${table} ${when} BEGIN ${capture('NEW', 'NULL')} END`);
  }
  await run("INSERT OR REPLACE INTO meta (key, value) VALUES ('undo_triggers', ?)", [signature]);
}

async function rowJson(table: SyncedTable, pk: string): Promise<string | null> {
  const r = await first<{ j: string }>(`SELECT ${await jsonOf(table, 't')} AS j FROM ${table} t WHERE t.${SYNCED_TABLES[table]} = ?`, [pk]);
  return r?.j ?? null;
}

export type Recorded<T> = { value: T; changeId: string | null };

/**
 * Runs a writing tool as one all-or-nothing change set. `fn` returns its result and a one-line
 * summary for the activity list ("Moved 12 Uber rides to Taxi").
 */
export async function recordChange<T>(tool: string, fn: () => Promise<{ value: T; summary: string }>): Promise<Recorded<T>> {
  const id = newId();
  let out!: Recorded<T>;
  await transaction([], async () => {
    await run('UPDATE undo_ctx SET change_id = ?', [id]);
    const { value, summary } = await fn();
    await run('UPDATE undo_ctx SET change_id = NULL');
    const tables = await all<{ tbl: SyncedTable; n: number }>('SELECT tbl, COUNT(*) AS n FROM claude_change_rows WHERE change_id = ? GROUP BY tbl', [id]);
    const rows = tables.reduce((s, t) => s + t.n, 0);
    if (rows) {
      for (const { tbl } of tables) {
        await run(
          `UPDATE claude_change_rows SET after = (SELECT ${await jsonOf(tbl, 't')} FROM ${tbl} t WHERE t.${SYNCED_TABLES[tbl]} = claude_change_rows.pk)
           WHERE change_id = ? AND tbl = ?`,
          [id, tbl],
        );
      }
      await run('INSERT INTO claude_changes (id, at, tool, summary, rows) VALUES (?, ?, ?, ?, ?)', [id, Date.now(), tool, summary.slice(0, 300), rows]);
    }
    out = { value, changeId: rows ? id : null };
  });
  if (out.changeId) await prune();
  return out;
}

async function prune(): Promise<void> {
  const old = await all<{ id: string }>('SELECT id FROM claude_changes ORDER BY at DESC LIMIT -1 OFFSET ?', [KEEP_CHANGES]);
  for (const { id } of old) {
    await run('DELETE FROM claude_change_rows WHERE change_id = ?', [id]);
    await run('DELETE FROM claude_changes WHERE id = ?', [id]);
  }
}

type ChangeRow = { id: string; at: number; tool: string; summary: string; rows: number; undone_at: number | null };

export async function listActivity(limit = 50): Promise<ClaudeActivity[]> {
  const rows = await all<ChangeRow>('SELECT * FROM claude_changes ORDER BY at DESC LIMIT ?', [Math.min(Math.max(1, limit), 300)]);
  return rows.map((r) => ({ id: r.id, at: r.at, tool: r.tool, summary: r.summary, rows: r.rows, undoneAt: r.undone_at }));
}

export class UndoError extends Error {}

export async function undoChange(id: string): Promise<UndoResponse> {
  const change = await first<ChangeRow>('SELECT * FROM claude_changes WHERE id = ?', [id]);
  if (!change) throw new UndoError('There is no change with that id (it may be too old to undo).');
  if (change.undone_at) throw new UndoError('That change was already undone.');
  const rows = await all<{ tbl: SyncedTable; pk: string; before: string | null; after: string | null }>(
    'SELECT tbl, pk, before, after FROM claude_change_rows WHERE change_id = ?',
    [id],
  );
  let restored = 0;
  let skipped = 0;
  await transaction([], async () => {
    for (const r of rows) {
      if (!Object.prototype.hasOwnProperty.call(SYNCED_TABLES, r.tbl)) continue;
      // Changed again since Claude's edit: leave the newer version alone.
      if ((await rowJson(r.tbl, r.pk)) !== r.after) {
        skipped++;
        continue;
      }
      const pkCol = SYNCED_TABLES[r.tbl];
      if (r.before == null) {
        await run(`DELETE FROM ${r.tbl} WHERE ${pkCol} = ?`, [r.pk]);
      } else {
        const known = await columnsOf(r.tbl);
        const data = JSON.parse(r.before) as Record<string, string | number | null>;
        const cols = Object.keys(data).filter((c) => known.has(c));
        await run(
          `INSERT OR REPLACE INTO ${r.tbl} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`,
          cols.map((c) => data[c]),
        );
      }
      restored++;
    }
    await run('UPDATE claude_changes SET undone_at = ? WHERE id = ?', [Date.now(), id]);
  });
  return { restored, skipped, summary: change.summary };
}
