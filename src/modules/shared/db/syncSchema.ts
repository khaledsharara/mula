import type { TableName } from './types';

/**
 * Tables kept in sync between the phone and the cloud copy (relay/), with their primary key.
 * fx_rates is a per-device cache and stays out.
 *
 * Migration 2 installs change-tracking triggers for exactly this list. Adding a table later needs
 * a new migration that creates its triggers (see `outboxTriggersSql`).
 */
export const SYNCED_TABLES = {
  accounts: 'id',
  categories: 'id',
  payees: 'id',
  payee_aliases: 'raw',
  recurring: 'id',
  templates: 'id',
  debts: 'id',
  transactions: 'id',
  inbox_items: 'id',
  settings: 'key',
} as const satisfies Partial<Record<TableName, string>>;

export type SyncedTable = keyof typeof SYNCED_TABLES;

export const SYNCED_TABLE_NAMES = Object.keys(SYNCED_TABLES) as SyncedTable[];

export const isSyncedTable = (t: unknown): t is SyncedTable => typeof t === 'string' && Object.prototype.hasOwnProperty.call(SYNCED_TABLES, t);

/** Settings that describe the data. Everything else (theme, reminders, the relay itself) is per device. */
export const SYNCED_SETTINGS = ['baseCurrency', 'instapayFee', 'mergeWindowMinutes', 'timeZone'] as const;

/** Milliseconds since the epoch, inside SQLite. */
export const NOW_MS_SQL = "CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER)";

/**
 * AFTER triggers that note every changed row in sync_outbox, one entry per row (the latest wins).
 * They stay quiet for rows that came from the other side: the record being applied is listed in
 * sync_incoming (the app, which may be saving something else at the same moment), or the whole
 * database is being applied (sync_state.applying = 1, the relay, which handles one request at a time).
 */
export function outboxTriggersSql(tables: Partial<Record<SyncedTable, string>>): string {
  const settingsFilter = (row: 'NEW' | 'OLD') => ` AND ${row}.key IN (${SYNCED_SETTINGS.map((k) => `'${k}'`).join(', ')})`;
  const record = (table: string, pk: string) =>
    `UPDATE sync_state SET rev = rev + 1;
    INSERT OR REPLACE INTO sync_outbox (seq, tbl, pk, at, origin) SELECT rev, '${table}', ${pk}, ${NOW_MS_SQL}, NULL FROM sync_state;`;
  return Object.entries(tables)
    .map(([table, pk]) => {
      const when = (row: 'NEW' | 'OLD') =>
        `WHEN (SELECT applying FROM sync_state) = 0 AND NOT EXISTS (SELECT 1 FROM sync_incoming WHERE tbl = '${table}' AND pk = ${row}.${pk})${table === 'settings' ? settingsFilter(row) : ''}`;
      return `
  CREATE TRIGGER sync_${table}_ins AFTER INSERT ON ${table} ${when('NEW')} BEGIN
    ${record(table, `NEW.${pk}`)}
  END;
  CREATE TRIGGER sync_${table}_upd AFTER UPDATE ON ${table} ${when('NEW')} BEGIN
    ${record(table, `NEW.${pk}`)}
    UPDATE sync_state SET rev = rev + 1 WHERE OLD.${pk} IS NOT NEW.${pk};
    INSERT OR REPLACE INTO sync_outbox (seq, tbl, pk, at, origin)
      SELECT rev, '${table}', OLD.${pk}, ${NOW_MS_SQL}, NULL FROM sync_state WHERE OLD.${pk} IS NOT NEW.${pk};
  END;
  CREATE TRIGGER sync_${table}_del AFTER DELETE ON ${table} ${when('OLD')} BEGIN
    ${record(table, `OLD.${pk}`)}
  END;`;
    })
    .join('\n');
}

/** Migration 2: change tracking for sync. */
export const SYNC_MIGRATION = `
  CREATE TABLE sync_state (
    id INTEGER PRIMARY KEY NOT NULL CHECK (id = 1),
    applying INTEGER NOT NULL DEFAULT 0,
    rev INTEGER NOT NULL DEFAULT 0
  );
  INSERT INTO sync_state (id, applying, rev) VALUES (1, 0, 0);

  CREATE TABLE sync_outbox (
    seq INTEGER PRIMARY KEY NOT NULL,
    tbl TEXT NOT NULL,
    pk TEXT NOT NULL,
    at INTEGER NOT NULL,
    origin TEXT
  );
  CREATE UNIQUE INDEX sync_outbox_row ON sync_outbox(tbl, pk);

  CREATE TABLE sync_incoming (
    tbl TEXT NOT NULL,
    pk TEXT NOT NULL,
    PRIMARY KEY (tbl, pk)
  );
  ${outboxTriggersSql(SYNCED_TABLES)}
`;
