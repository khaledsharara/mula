import { all, getDb } from '../../shared/db/client';
import { notify } from '../../shared/db/live';
import { migrations } from '../../shared/db/migrations';
import type { TableName } from '../../shared/db/types';
import { loadSettings } from '../../shared/settings/settingsStore';

/** Tables in the backup, in restore order. */
export const BACKUP_TABLES: TableName[] = [
  'accounts',
  'categories',
  'payees',
  'payee_aliases',
  'recurring',
  'templates',
  'debts',
  'transactions',
  'inbox_items',
  'fx_rates',
  'settings',
];

export type Backup = {
  app: 'mula';
  format: 1;
  schemaVersion: number;
  exportedAt: string;
  tables: Partial<Record<TableName, Record<string, unknown>[]>>;
};

export async function createBackup(): Promise<Backup> {
  const tables: Backup['tables'] = {};
  for (const t of BACKUP_TABLES) tables[t] = await all<Record<string, unknown>>(`SELECT * FROM ${t}`);
  return { app: 'mula', format: 1, schemaVersion: migrations.length, exportedAt: new Date().toISOString(), tables };
}

export type BackupSummary = { exportedAt: string; counts: Partial<Record<TableName, number>> };

export function readBackup(text: string): { backup: Backup; summary: BackupSummary } {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('This file isn’t valid JSON.');
  }
  const b = data as Partial<Backup>;
  if (b?.app !== 'mula' || b.format !== 1 || typeof b.tables !== 'object' || !b.tables) {
    throw new Error('This isn’t a Mula backup file.');
  }
  if ((b.schemaVersion ?? 0) > migrations.length) {
    throw new Error('This backup comes from a newer version of Mula. Update the app first.');
  }
  const counts: BackupSummary['counts'] = {};
  for (const t of BACKUP_TABLES) counts[t] = b.tables[t]?.length ?? 0;
  return { backup: b as Backup, summary: { exportedAt: b.exportedAt ?? '', counts } };
}

/** Replaces all data with the backup's contents, in one transaction. */
export async function restoreBackup(backup: Backup): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (const t of [...BACKUP_TABLES].reverse()) await db.runAsync(`DELETE FROM ${t}`);
    for (const t of BACKUP_TABLES) {
      const rows = backup.tables[t] ?? [];
      const columns = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${t})`);
      const allowed = new Set(columns.map((c) => c.name));
      for (const row of rows) {
        const keys = Object.keys(row).filter((k) => allowed.has(k));
        if (!keys.length) continue;
        await db.runAsync(
          `INSERT OR REPLACE INTO ${t} (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`,
          keys.map((k) => row[k] as string | number | null),
        );
      }
    }
  });
  await loadSettings();
  notify(BACKUP_TABLES);
}
