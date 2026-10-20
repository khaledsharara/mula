import { openDatabaseAsync, type SQLiteBindValue, type SQLiteDatabase } from 'expo-sqlite';

import { notify } from './live';
import { migrations } from './migrations';
import type { TableName } from './types';

const DB_NAME = 'mula.db';

let dbPromise: Promise<SQLiteDatabase> | null = null;

async function openAndMigrate(): Promise<SQLiteDatabase> {
  const db = await openDatabaseAsync(DB_NAME);
  // Recursive triggers make REPLACE's implicit deletes visible to the sync triggers.
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = OFF; PRAGMA recursive_triggers = ON;');
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;
  for (let i = current; i < migrations.length; i++) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(migrations[i]);
      await db.execAsync(`PRAGMA user_version = ${i + 1}`);
    });
  }
  return db;
}

export function getDb(): Promise<SQLiteDatabase> {
  if (!dbPromise) dbPromise = openAndMigrate();
  return dbPromise;
}

export type Params = SQLiteBindValue[];

export async function all<T>(sql: string, params: Params = []): Promise<T[]> {
  const db = await getDb();
  return db.getAllAsync<T>(sql, params);
}

export async function first<T>(sql: string, params: Params = []): Promise<T | null> {
  const db = await getDb();
  return (await db.getFirstAsync<T>(sql, params)) ?? null;
}

export async function run(sql: string, params: Params = []): Promise<void> {
  const db = await getDb();
  await db.runAsync(sql, params);
}

/**
 * Runs `fn` inside a transaction, then tells live queries on `tables` to refresh.
 * Writes always go through here (or `write`) so screens never show stale data.
 */
export async function transaction<T>(tables: TableName[], fn: () => Promise<T>): Promise<T> {
  const db = await getDb();
  let result!: T;
  await db.withTransactionAsync(async () => {
    result = await fn();
  });
  notify(tables);
  return result;
}

export async function write(tables: TableName[], sql: string, params: Params = []): Promise<void> {
  await run(sql, params);
  notify(tables);
}

/** Builds `INSERT OR REPLACE` for a snake_case record. */
export function upsertSql(table: TableName, record: Record<string, SQLiteBindValue>): [string, Params] {
  const keys = Object.keys(record);
  const sql = `INSERT OR REPLACE INTO ${table} (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`;
  return [sql, keys.map((k) => record[k])];
}

export const bool = (v: unknown): boolean => v === 1 || v === true;
export const int = (v: boolean): number => (v ? 1 : 0);
