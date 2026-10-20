import { create } from 'zustand';

import { all, write } from '../db/client';
import type { ID, Minor } from '../db/types';
import type { Appearance } from '../theme/tokens';

export type FeeRule = {
  /** Percent of the transfer amount, e.g. 0.1 for 0.1%. */
  percent: number;
  min: Minor;
  max: Minor;
};

export type Settings = {
  appearance: Appearance;
  baseCurrency: string;
  instapayFee: FeeRule;
  digestEnabled: boolean;
  /** Local hour (0–23) for the daily "still to review" reminder. */
  digestHour: number;
  backupReminderEnabled: boolean;
  lastBackupAt: number | null;
  lastAccountId: ID | null;
  onboarded: boolean;
  /** Apple Pay automation entries are merged into the SMS for the same payment. */
  mergeWindowMinutes: number;
  /** IANA zone of the phone (e.g. Africa/Cairo), so the cloud copy reads dates the way you do. */
  timeZone: string | null;
  /** The cloud copy (relay/), e.g. https://mula-relay.you.workers.dev. Its app token is in the keychain. */
  syncRelayUrl: string | null;
  /** This install's name on the relay; changes it made are not sent back to it. */
  syncDeviceId: string | null;
  /** The cloud copy this install is linked to. A different one on the relay means it was replaced. */
  syncDatasetId: string | null;
  /** Last relay revision applied here. */
  syncCursor: number;
  syncLastAt: number | null;
  syncLastError: string | null;
  /** Android: read bank SMS as they arrive (device only, never synced). */
  smsCapture: boolean;
  /** Android: notify when a captured bank message is waiting. */
  smsNotify: boolean;
  /** Android: extra SMS sender names to treat as the bank, besides the known ones. */
  smsExtraSenders: string[];
};

/** InstaPay tariff published on instapay.eg, effective 1 April 2025. */
export const INSTAPAY_DEFAULT_FEE: FeeRule = { percent: 0.1, min: 50, max: 2000 };

export const defaultSettings: Settings = {
  appearance: 'system',
  baseCurrency: 'EGP',
  instapayFee: INSTAPAY_DEFAULT_FEE,
  digestEnabled: true,
  digestHour: 21,
  backupReminderEnabled: true,
  lastBackupAt: null,
  lastAccountId: null,
  onboarded: false,
  mergeWindowMinutes: 10,
  timeZone: null,
  syncRelayUrl: null,
  syncDeviceId: null,
  syncDatasetId: null,
  syncCursor: 0,
  syncLastAt: null,
  syncLastError: null,
  smsCapture: false,
  smsNotify: true,
  smsExtraSenders: [],
};

type SettingsState = Settings & { loaded: boolean };

export const useSettings = create<SettingsState>(() => ({ ...defaultSettings, loaded: false }));

export async function loadSettings(): Promise<void> {
  const rows = await all<{ key: string; value: string }>('SELECT key, value FROM settings');
  const patch: Partial<Settings> = {};
  for (const r of rows) {
    if (r.key in defaultSettings) {
      try {
        (patch as Record<string, unknown>)[r.key] = JSON.parse(r.value);
      } catch {
        // Ignore a corrupt value and keep the default.
      }
    }
  }
  useSettings.setState({ ...defaultSettings, ...patch, loaded: true });
}

export async function setSetting<K extends keyof Settings>(key: K, value: Settings[K]): Promise<void> {
  useSettings.setState({ [key]: value } as Partial<SettingsState>);
  await write(['settings'], 'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, JSON.stringify(value)]);
}

export const getSettings = (): Settings => useSettings.getState();
