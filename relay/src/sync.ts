/**
 * The relay's side of sync (the app's side is src/modules/sync/data/syncEngine.ts).
 * The relay keeps the latest state of every record plus a change log stamped with revisions;
 * a device sends its changes and asks for everything after the last revision it applied.
 */
import { first, run, transaction } from '../../src/modules/shared/db/client';
import { migrations } from '../../src/modules/shared/db/migrations';
import { SYNCED_TABLE_NAMES } from '../../src/modules/shared/db/syncSchema';
import { loadSettings } from '../../src/modules/shared/settings/settingsStore';
import { applyChange, attachRows, nextRev, outboxEntry, readOutbox, setApplying, validChanges } from '../../src/modules/sync/data/syncStore';
import type { CloudCounts, CloudStatus, PullResponse, PushResponse } from '../../src/modules/sync/types';

export class SyncError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export async function getMeta(key: string): Promise<string | null> {
  return (await first<{ value: string }>('SELECT value FROM meta WHERE key = ?', [key]))?.value ?? null;
}

export async function setMeta(key: string, value: string): Promise<void> {
  await run('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)', [key, value]);
}

async function datasetId(): Promise<string> {
  const id = await getMeta('dataset_id');
  if (id) return id;
  const fresh = crypto.randomUUID();
  await setMeta('dataset_id', fresh);
  return fresh;
}

export async function cloudCounts(): Promise<CloudCounts> {
  const r = await first<CloudCounts>(
    `SELECT (SELECT COUNT(*) FROM accounts) AS accounts,
            (SELECT COUNT(*) FROM transactions WHERE parent_id IS NULL) AS transactions,
            (SELECT COUNT(*) FROM payees) AS payees,
            (SELECT COUNT(*) FROM inbox_items WHERE status = 'pending') AS inbox`,
  );
  return r ?? { accounts: 0, transactions: 0, payees: 0, inbox: 0 };
}

/** Nothing has been uploaded yet (a phone's first upload always brings categories). */
export async function isEmpty(): Promise<boolean> {
  const r = await first<{ n: number }>('SELECT (SELECT COUNT(*) FROM accounts) + (SELECT COUNT(*) FROM categories) + (SELECT COUNT(*) FROM transactions) AS n');
  return !r?.n;
}

export async function status(): Promise<CloudStatus> {
  const rev = (await first<{ rev: number }>('SELECT rev FROM sync_state'))?.rev ?? 0;
  return { datasetId: await datasetId(), rev, empty: await isEmpty(), counts: await cloudCounts(), schemaVersion: migrations.length };
}

const MAX_PUSH = 1000;
const MAX_PULL = 1000;

export async function push(body: Record<string, unknown> | null): Promise<PushResponse> {
  const deviceId = typeof body?.deviceId === 'string' ? body.deviceId.slice(0, 100) : '';
  if (!deviceId) throw new SyncError(400, 'bad_request', 'deviceId is missing');
  if (body?.datasetId !== (await datasetId())) throw new SyncError(409, 'dataset_changed', 'The cloud copy was replaced since this device last synced.');
  const changes = validChanges(body?.changes, MAX_PUSH);
  if (!changes) throw new SyncError(400, 'bad_request', 'changes are malformed');

  let applied = 0;
  let skipped = 0;
  await transaction([], async () => {
    await setApplying(true);
    // One revision per change, reserved up front (one write instead of one per change). Anything
    // the triggers record meanwhile (makeRoom) takes revisions after this block.
    let rev = (await nextRev(changes.length)) - changes.length;
    for (const change of changes) {
      const existing = await outboxEntry(change.tbl, change.pk);
      // Newer here (Claude, or another device): keep it, and give it a fresh revision so the
      // device pulls it again even if it had already seen it (both sides end up the same).
      if (existing && existing.origin !== deviceId && existing.at > change.at) {
        await run('UPDATE sync_outbox SET seq = ? WHERE seq = ?', [await nextRev(), existing.seq]);
        skipped++;
        continue;
      }
      try {
        await applyChange(change);
      } catch (e) {
        console.warn('push: skipped a record', change.tbl, change.pk, e);
        skipped++;
        continue;
      }
      await run('INSERT OR REPLACE INTO sync_outbox (seq, tbl, pk, at, origin) VALUES (?, ?, ?, ?, ?)', [++rev, change.tbl, change.pk, change.at, deviceId]);
      applied++;
    }
    await setApplying(false);
  });
  if (changes.some((c) => c.tbl === 'settings')) await loadSettings();
  await setMeta('last_push_at', String(Date.now()));
  const rev = (await first<{ rev: number }>('SELECT rev FROM sync_state'))?.rev ?? 0;
  return { applied, skipped, rev };
}

export async function pull(since: number, deviceId: string, limit: number): Promise<PullResponse> {
  const size = Math.min(Math.max(1, limit || 500), MAX_PULL);
  const scanned = await readOutbox({ after: Math.max(0, since || 0), limit: size });
  // A device never needs its own changes back.
  const visible = scanned.filter((e) => e.origin !== deviceId);
  return {
    changes: await attachRows(visible),
    next: scanned.length ? scanned[scanned.length - 1].seq : Math.max(0, since || 0),
    more: scanned.length === size,
    fromClaude: visible.filter((e) => e.origin == null).length,
  };
}

/** Empties the cloud copy and starts a new one; devices linked to the old one must link again. */
export async function reset(): Promise<CloudStatus> {
  await transaction([], async () => {
    await setApplying(true);
    for (const table of SYNCED_TABLE_NAMES) await run(`DELETE FROM ${table}`);
    await run('DELETE FROM sync_outbox');
    await run('DELETE FROM claude_change_rows');
    await run('DELETE FROM claude_changes');
    await setApplying(false);
  });
  await setMeta('dataset_id', crypto.randomUUID());
  await run("DELETE FROM meta WHERE key = 'last_push_at'");
  await loadSettings();
  return status();
}
