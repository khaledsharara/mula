import type { SyncedTable } from '../../shared/db/syncSchema';

export type { SyncedTable } from '../../shared/db/syncSchema';

/** A database row as stored (snake_case columns). */
export type SyncRow = Record<string, string | number | null>;

/** One record's latest state; `row: null` means it was deleted. `at` is when it changed (ms). */
export type SyncChange = { tbl: SyncedTable; pk: string; at: number; row: SyncRow | null };

export type CloudCounts = { accounts: number; transactions: number; payees: number; inbox: number };

export type CloudStatus = {
  datasetId: string;
  rev: number;
  empty: boolean;
  counts: CloudCounts;
  schemaVersion: number;
};

export type PushRequest = { deviceId: string; datasetId: string; changes: SyncChange[] };
export type PushResponse = { applied: number; skipped: number; rev: number };
/** `fromClaude` counts changes made on the relay itself (Claude), as opposed to another device. */
export type PullResponse = { changes: SyncChange[]; next: number; more: boolean; fromClaude: number };

/** One thing Claude did (a tool call that changed data), as listed in Automation › Claude activity. */
export type ClaudeActivity = {
  id: string;
  at: number;
  tool: string;
  summary: string;
  rows: number;
  undoneAt: number | null;
};

export type UndoResponse = { restored: number; skipped: number; summary: string };
