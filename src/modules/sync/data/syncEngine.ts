import { first, run, transaction } from '../../shared/db/client';
import { notify, subscribeChanges } from '../../shared/db/live';
import { SYNCED_SETTINGS, SYNCED_TABLE_NAMES, isSyncedTable } from '../../shared/db/syncSchema';
import type { TableName } from '../../shared/db/types';
import { getSettings, loadSettings, setSetting } from '../../shared/settings/settingsStore';
import { newId } from '../../shared/utils/id';
import type { ClaudeActivity, CloudCounts, CloudStatus, PullResponse, PushResponse, UndoResponse } from '../types';
import { availableToken, getRelayConfig, normalizeRelayUrl, relayRequest, RelayError, writeToken, type RelayConfig } from './relayClient';
import { applyIncoming, attachRows, clearOutbox, enqueueAll, outboxEntry, outboxSize, readOutbox, setApplying } from './syncStore';

/**
 * Keeps this phone and the cloud copy on the relay in step. Each sync sends local changes first,
 * then applies what changed on the relay (Claude's edits) since the last one. For a record changed
 * on both sides, the newer change wins.
 */

export type SyncResult =
  | { status: 'off' }
  | { status: 'ok'; pushed: number; pulled: number; fromClaude: number }
  | { status: 'error'; message: string };

const PUSH_BATCH = 300;
const PULL_PAGE = 500;

let running: Promise<SyncResult> | null = null;

/** One sync at a time; calling it during a sync returns the running one. */
export function syncNow(): Promise<SyncResult> {
  running ??= performSync().finally(() => {
    running = null;
  });
  return running;
}

export function isSyncLinked(): boolean {
  const s = getSettings();
  return Boolean(s.syncRelayUrl && s.syncDatasetId && s.syncDeviceId);
}

async function performSync(): Promise<SyncResult> {
  const config = await getRelayConfig();
  const s = getSettings();
  if (!config || !s.syncDatasetId || !s.syncDeviceId) return { status: 'off' };
  try {
    const pushed = await pushAll(config, s.syncDeviceId, s.syncDatasetId);
    const { pulled, fromClaude } = await pullAll(config, s.syncDeviceId);
    await setSetting('syncLastAt', Date.now());
    if (getSettings().syncLastError) await setSetting('syncLastError', null);
    return { status: 'ok', pushed, pulled, fromClaude };
  } catch (e) {
    let message = e instanceof Error ? e.message : 'Sync failed';
    if (e instanceof RelayError && e.code === 'dataset_changed') {
      // Someone replaced the cloud copy (another device chose "use this phone's data").
      message = 'The cloud copy was replaced from another device. Connect again to choose which copy to keep.';
      await setSetting('syncDatasetId', null);
    }
    await setSetting('syncLastError', message);
    return { status: 'error', message };
  }
}

async function pushAll(config: RelayConfig, deviceId: string, datasetId: string): Promise<number> {
  let total = 0;
  for (;;) {
    const entries = await readOutbox({ limit: PUSH_BATCH });
    if (!entries.length) break;
    const changes = await attachRows(entries.filter((e) => isSyncedTable(e.tbl)));
    await relayRequest<PushResponse>(config, '/sync/push', { method: 'POST', body: JSON.stringify({ deviceId, datasetId, changes }) }, 60_000);
    await clearOutbox(entries);
    total += entries.length;
    if (entries.length < PUSH_BATCH) break;
  }
  return total;
}

async function pullAll(config: RelayConfig, deviceId: string): Promise<{ pulled: number; fromClaude: number }> {
  let cursor = getSettings().syncCursor;
  let pulled = 0;
  let fromClaude = 0;
  const touched = new Set<TableName>();
  for (;;) {
    const page = await relayRequest<PullResponse>(
      config,
      `/sync/pull?since=${cursor}&device=${encodeURIComponent(deviceId)}&limit=${PULL_PAGE}`,
      {},
      60_000,
    );
    if (page.changes.length) {
      await transaction([], async () => {
        for (const change of page.changes) {
          const local = await outboxEntry(change.tbl, change.pk);
          // Changed here after it changed there: ours wins and goes up with the next push.
          if (local && local.at > change.at) continue;
          try {
            await applyIncoming(change);
          } catch (e) {
            console.warn('[mula] sync: skipped a record', change.tbl, change.pk, e);
            continue;
          }
          if (local) await run('DELETE FROM sync_outbox WHERE seq = ?', [local.seq]);
          touched.add(change.tbl);
          pulled++;
        }
      });
    }
    fromClaude += page.fromClaude;
    cursor = page.next;
    await setSetting('syncCursor', cursor);
    if (!page.more) break;
  }
  if (touched.size) {
    if (touched.has('settings')) await loadSettings();
    notify([...touched]);
  }
  return { pulled, fromClaude };
}

/* ---------- Connecting ---------- */

export async function localCounts(): Promise<CloudCounts> {
  const r = await first<CloudCounts>(
    `SELECT (SELECT COUNT(*) FROM accounts) AS accounts,
            (SELECT COUNT(*) FROM transactions WHERE parent_id IS NULL) AS transactions,
            (SELECT COUNT(*) FROM payees) AS payees,
            (SELECT COUNT(*) FROM inbox_items WHERE status = 'pending') AS inbox`,
  );
  return r ?? { accounts: 0, transactions: 0, payees: 0, inbox: 0 };
}

/**
 * - upload: the cloud copy is empty, so this phone's data goes up.
 * - resume: already linked to this cloud copy.
 * - download: this phone has nothing yet, so it takes the cloud copy.
 * - choose: both have data; you pick which one to keep.
 */
export type LinkMode = 'upload' | 'resume' | 'download' | 'choose';
export type LinkPlan = { mode: LinkMode; cloud: CloudCounts; phone: CloudCounts };

/** Checks the address and token, saves them, and works out how to link this phone to the cloud copy. */
export async function connectRelay(urlInput: string, tokenInput: string): Promise<{ ok: true; plan: LinkPlan } | { ok: false; message: string }> {
  const url = normalizeRelayUrl(urlInput);
  if (!url) return { ok: false, message: 'That doesn’t look like a relay address (https://…workers.dev)' };
  const token = tokenInput.trim() || (await availableToken()) || '';
  if (token.length < 16) return { ok: false, message: 'The token is too short; paste the MULA_APP_TOKEN you set on the relay' };
  let status: CloudStatus;
  try {
    status = await relayRequest<CloudStatus>({ url, token }, '/sync/status');
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Couldn’t reach the relay' };
  }
  await writeToken(token);
  await setSetting('syncRelayUrl', url);
  if (!getSettings().syncDeviceId) await setSetting('syncDeviceId', newId());
  const phone = await localCounts();
  const phoneEmpty = phone.transactions === 0 && phone.accounts === 0;
  const mode: LinkMode = status.empty
    ? 'upload'
    : getSettings().syncDatasetId === status.datasetId
      ? 'resume'
      : phoneEmpty
        ? 'download'
        : 'choose';
  return { ok: true, plan: { mode, cloud: status.counts, phone } };
}

/**
 * Links this phone to the cloud copy and runs the first sync.
 * - keep-phone: replaces the cloud copy with this phone's data (also used when the cloud is empty).
 * - keep-cloud: replaces this phone's data with the cloud copy.
 */
export async function linkCloud(choice: 'keep-phone' | 'keep-cloud' | 'resume'): Promise<SyncResult> {
  const config = await getRelayConfig();
  if (!config) return { status: 'error', message: 'Connect to the relay first' };
  try {
    if (choice === 'keep-phone') {
      const status = await relayRequest<CloudStatus>(config, '/sync/reset', { method: 'POST', body: '{}' });
      await enqueueAll();
      await setSetting('syncCursor', status.rev);
      await setSetting('syncDatasetId', status.datasetId);
    } else if (choice === 'keep-cloud') {
      const status = await relayRequest<CloudStatus>(config, '/sync/status');
      await clearLocalData();
      await setSetting('syncCursor', 0);
      await setSetting('syncDatasetId', status.datasetId);
    }
  } catch (e) {
    return { status: 'error', message: e instanceof Error ? e.message : 'Couldn’t reach the relay' };
  }
  return syncNow();
}

/** Empties the synced tables without recording the deletes (the cloud copy replaces them). */
async function clearLocalData(): Promise<void> {
  await transaction([], async () => {
    await setApplying(true);
    for (const table of SYNCED_TABLE_NAMES) {
      if (table === 'settings') {
        await run(`DELETE FROM settings WHERE key IN (${SYNCED_SETTINGS.map(() => '?').join(', ')})`, [...SYNCED_SETTINGS]);
      } else {
        await run(`DELETE FROM ${table}`);
      }
    }
    await run('DELETE FROM sync_outbox');
    await setApplying(false);
  });
  await loadSettings();
  notify(SYNCED_TABLE_NAMES);
}

/** Stops syncing. With `eraseCloud`, the cloud copy is emptied too (Claude then sees nothing). */
export async function disconnectRelay(opts: { eraseCloud?: boolean } = {}): Promise<void> {
  const config = await getRelayConfig();
  if (opts.eraseCloud && config) await relayRequest(config, '/sync/reset', { method: 'POST', body: JSON.stringify({ erase: true }) });
  await writeToken(null);
  await setSetting('syncRelayUrl', null);
  await setSetting('syncDatasetId', null);
  await setSetting('syncCursor', 0);
  await setSetting('syncLastAt', null);
  await setSetting('syncLastError', null);
}

/* ---------- Claude activity ---------- */

export async function listClaudeActivity(): Promise<ClaudeActivity[]> {
  const config = await getRelayConfig();
  if (!config) return [];
  const body = await relayRequest<{ activity: ClaudeActivity[] }>(config, '/sync/activity');
  return body.activity;
}

export async function undoClaudeChange(id: string): Promise<UndoResponse> {
  const config = await getRelayConfig();
  if (!config) throw new Error('Not connected');
  const result = await relayRequest<UndoResponse>(config, '/sync/undo', { method: 'POST', body: JSON.stringify({ id }) });
  await syncNow();
  return result;
}

/* ---------- Automatic syncing ---------- */

const POLL_MS = 60_000;
const AFTER_CHANGE_MS = 3_000;

/**
 * While the app is open: syncs a few seconds after each local change, and every minute so
 * Claude's edits show up. Returns a stop function. `onClaude` hears about changes Claude made.
 */
export function startAutoSync(onClaude?: (count: number) => void): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let stopped = false;

  const runSync = async () => {
    if (stopped || !isSyncLinked()) return;
    const r = await syncNow();
    if (r.status === 'ok' && r.fromClaude > 0) onClaude?.(r.fromClaude);
    // Changes made while that sync ran go up shortly after.
    if (!stopped && r.status === 'ok' && (await outboxSize()) > 0) schedule();
  };
  // Most writes (sync bookkeeping, theme) aren't synced data; only sync when something is waiting.
  const pushIfPending = async () => {
    if (stopped || !isSyncLinked() || (await outboxSize()) === 0) return;
    await runSync();
  };
  const schedule = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => void pushIfPending(), AFTER_CHANGE_MS);
  };

  const interval = setInterval(() => void runSync(), POLL_MS);
  const unsubscribe = subscribeChanges(() => {
    if (isSyncLinked()) schedule();
  });
  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
    clearInterval(interval);
    unsubscribe();
  };
}

/** Records the phone's time zone so the cloud copy reads "today" and "last month" the way you do. */
export async function rememberTimeZone(): Promise<void> {
  let zone: string | null = null;
  try {
    zone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? null;
  } catch {
    zone = null;
  }
  if (zone && zone !== getSettings().timeZone) await setSetting('timeZone', zone);
}
