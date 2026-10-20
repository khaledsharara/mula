import { formatLocal, parseMoment, resolvePeriod } from '../../relay/src/dates';
import { SYNCED_SETTINGS, SYNCED_TABLE_NAMES, SYNC_MIGRATION, isSyncedTable } from '../../src/modules/shared/db/syncSchema';
import { normalizeRelayUrl } from '../../src/modules/sync/data/relayClient';
import { validChanges } from '../../src/modules/sync/data/syncStore';

jest.mock('expo-sqlite', () => ({ openDatabaseAsync: jest.fn() }));
jest.mock('expo-secure-store', () => ({ getItemAsync: jest.fn(), setItemAsync: jest.fn(), deleteItemAsync: jest.fn() }));

describe('sync schema', () => {
  it('tracks every synced table on insert, update and delete', () => {
    for (const t of SYNCED_TABLE_NAMES) {
      for (const op of ['ins', 'upd', 'del']) expect(SYNC_MIGRATION).toContain(`CREATE TRIGGER sync_${t}_${op}`);
    }
    expect(SYNC_MIGRATION).not.toContain('ON fx_rates');
  });

  it('only syncs settings that describe the data', () => {
    const settingsTrigger = SYNC_MIGRATION.slice(SYNC_MIGRATION.indexOf('sync_settings_ins'));
    for (const key of SYNCED_SETTINGS) expect(settingsTrigger).toContain(`'${key}'`);
    expect(settingsTrigger.slice(0, 400)).not.toContain('syncRelayUrl');
    expect(SYNCED_SETTINGS).not.toContain('appearance' as never);
  });

  it('knows its tables', () => {
    expect(isSyncedTable('transactions')).toBe(true);
    expect(isSyncedTable('oauth_grants')).toBe(false);
    expect(isSyncedTable('toString')).toBe(false);
  });
});

describe('validChanges', () => {
  const ok = { tbl: 'payees', pk: 'p1', at: 1, row: { id: 'p1', name: 'Uber', created_at: 5 } };

  it('accepts rows and deletions', () => {
    expect(validChanges([ok, { tbl: 'transactions', pk: 't1', at: 2, row: null }], 10)).toHaveLength(2);
  });

  it('rejects anything off', () => {
    expect(validChanges('nope', 10)).toBeNull();
    expect(validChanges([ok, ok], 1)).toBeNull();
    expect(validChanges([{ ...ok, tbl: 'oauth_grants' }], 10)).toBeNull();
    expect(validChanges([{ ...ok, pk: 'other' }], 10)).toBeNull();
    expect(validChanges([{ ...ok, row: { id: 'p1', name: { nested: true } } }], 10)).toBeNull();
    expect(validChanges([{ ...ok, at: Number.NaN }], 10)).toBeNull();
  });
});

describe('normalizeRelayUrl', () => {
  it('takes the base from a pasted connector address', () => {
    expect(normalizeRelayUrl('mula-relay.me.workers.dev/mcp')).toBe('https://mula-relay.me.workers.dev');
    expect(normalizeRelayUrl('https://mula-relay.me.workers.dev/mcp/abc/')).toBe('https://mula-relay.me.workers.dev');
    expect(normalizeRelayUrl('http://localhost:8787')).toBe('http://localhost:8787');
  });

  it('refuses plain http on the internet', () => {
    expect(normalizeRelayUrl('http://mula-relay.me.workers.dev')).toBeNull();
    expect(normalizeRelayUrl('')).toBeNull();
  });
});

describe('relay dates (user time zone)', () => {
  const tz = 'Africa/Cairo';

  it('reads a bare date as noon there, and a local time as given', () => {
    // January: Cairo is UTC+2.
    expect(new Date(parseMoment('2026-01-15', tz)!).toISOString()).toBe('2026-01-15T10:00:00.000Z');
    expect(new Date(parseMoment('2026-01-15 09:30', tz)!).toISOString()).toBe('2026-01-15T07:30:00.000Z');
    expect(new Date(parseMoment('2026-01-15', tz, 'start')!).toISOString()).toBe('2026-01-14T22:00:00.000Z');
    expect(parseMoment('2026-01-15T09:30:00Z', tz)).toBe(Date.parse('2026-01-15T09:30:00Z'));
    expect(parseMoment('soon', tz)).toBeNull();
  });

  it('names periods by the local calendar', () => {
    const now = Date.parse('2026-03-01T00:30:00Z'); // 02:30 on March 1 in Cairo
    const last = resolvePeriod({ period: 'last_month' }, tz, now);
    expect('error' in last).toBe(false);
    if ('error' in last) return;
    expect(formatLocal(last.from, tz)).toBe('2026-02-01 00:00');
    expect(formatLocal(last.to, tz)).toBe('2026-02-28 23:59');
    expect('error' in resolvePeriod({ period: 'someday' }, tz, now)).toBe(true);
  });

  it('formats in the zone, not in UTC', () => {
    expect(formatLocal(Date.parse('2026-01-15T22:30:00Z'), tz)).toBe('2026-01-16 00:30');
  });
});
