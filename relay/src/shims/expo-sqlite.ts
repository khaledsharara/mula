/**
 * Stand-in for expo-sqlite inside the Worker (wrangler.jsonc aliases the package here), so the
 * app's own data code (src/modules/**) runs unchanged on the Durable Object's SQLite.
 * Covers the calls Mula makes: openDatabaseAsync, execAsync, getAllAsync, getFirstAsync,
 * runAsync, withTransactionAsync.
 */

export type SQLiteBindValue = string | number | null | boolean | Uint8Array;

let storage: DurableObjectStorage | null = null;

/** Called once by the Durable Object before any app code touches the database. */
export function bindStorage(s: DurableObjectStorage): void {
  storage = s;
}

function sql(): SqlStorage {
  if (!storage) throw new Error('Database used before the Durable Object bound its storage');
  return storage.sql;
}

const bind = (params: unknown[] | undefined): unknown[] =>
  (params ?? []).map((v) => (v === undefined ? null : typeof v === 'boolean' ? (v ? 1 : 0) : v));

/* The Durable Object refuses PRAGMA user_version and journal_mode; the version lives in a table. */
const GET_VERSION = /^\s*PRAGMA\s+user_version\s*;?\s*$/i;
const SET_VERSION = /PRAGMA\s+user_version\s*=\s*(\d+)\s*;?/gi;
const JOURNAL = /PRAGMA\s+journal_mode\s*=\s*\w+\s*;?/gi;

function versionTable(): void {
  sql().exec('CREATE TABLE IF NOT EXISTS _schema_version (id INTEGER PRIMARY KEY CHECK (id = 1), version INTEGER NOT NULL)');
}

function readVersion(): number {
  versionTable();
  return sql().exec<{ version: number }>('SELECT version FROM _schema_version WHERE id = 1').toArray()[0]?.version ?? 0;
}

function writeVersion(v: number): void {
  versionTable();
  sql().exec('INSERT OR REPLACE INTO _schema_version (id, version) VALUES (1, ?)', v);
}

function prepare(source: string): string {
  let rest = source.replace(JOURNAL, '');
  rest = rest.replace(SET_VERSION, (_m, v: string) => {
    writeVersion(Number(v));
    return '';
  });
  return rest.trim();
}

class Database {
  async execAsync(source: string): Promise<void> {
    const rest = prepare(source);
    if (rest) sql().exec(rest);
  }

  async getAllAsync<T>(source: string, params?: unknown[]): Promise<T[]> {
    if (GET_VERSION.test(source)) return [{ user_version: readVersion() } as T];
    return sql().exec(source, ...bind(params)).toArray() as T[];
  }

  async getFirstAsync<T>(source: string, params?: unknown[]): Promise<T | null> {
    return (await this.getAllAsync<T>(source, params))[0] ?? null;
  }

  async runAsync(source: string, params?: unknown[]): Promise<{ lastInsertRowId: number; changes: number }> {
    const cursor = sql().exec(source, ...bind(params));
    cursor.toArray();
    return { lastInsertRowId: 0, changes: cursor.rowsWritten };
  }

  /** Rolls back everything `fn` wrote if it throws (nested calls join the outer transaction). */
  async withTransactionAsync(fn: () => Promise<void>): Promise<void> {
    if (!storage) throw new Error('Database used before the Durable Object bound its storage');
    await storage.transaction(async () => {
      await fn();
    });
  }
}

export type SQLiteDatabase = Database;

const db = new Database();

export async function openDatabaseAsync(_name: string): Promise<SQLiteDatabase> {
  return db;
}
