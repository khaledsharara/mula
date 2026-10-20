import { requireOptionalNativeModule } from 'expo';
import { PermissionsAndroid, Platform } from 'react-native';

import { BANK_SENDERS } from '../../banks';
import { useSettings } from '../../shared/settings/settingsStore';

/**
 * Android bank SMS capture (modules/mula-sms): a receiver queues messages from the bank's
 * senders, even while Mula is closed, in the same queue the iPhone Shortcuts actions use.
 */

type SmsStatus = { enabled: boolean; senders: string[]; notify: boolean; lastSeen: number };
type Subscription = { remove(): void };
type MulaSmsNative = {
  getStatus(): SmsStatus;
  configure(config: { enabled: boolean; senders: string[]; notify: boolean }): void;
  catchUp(): Promise<number>;
  addListener(event: 'onQueued', listener: () => void): Subscription;
};

const native = Platform.OS === 'android' ? requireOptionalNativeModule<MulaSmsNative>('MulaSms') : null;

/**
 * Test builds only (tests/android): the emulator can only send from a phone number. Release
 * builds fail if any EXPO_PUBLIC_MULA_* variable is set, so this is never in a published app.
 */
const E2E_SENDER = process.env.EXPO_PUBLIC_MULA_E2E_SMS_SENDER || null;

/** True in the installed Android app (not Expo Go, iPhone or the web). */
export const smsCaptureAvailable = native != null;

export type SmsPermission = 'granted' | 'denied' | 'blocked';

/** Bank senders plus the ones added by hand, without duplicates (case-insensitive). */
export function senderList(extra: readonly string[] = []): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of [...BANK_SENDERS, ...extra]) {
    const name = s.trim();
    const key = name.toLowerCase();
    if (!name || seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  return out;
}

/** Collapses Android's per-permission answers into one state for the screen. */
export function permissionState(results: Record<string, string>): SmsPermission {
  const values = Object.values(results);
  if (values.length && values.every((v) => v === 'granted')) return 'granted';
  return values.some((v) => v === 'never_ask_again') ? 'blocked' : 'denied';
}

/** Read lazily: PermissionsAndroid doesn't exist on iPhone or the web. */
const smsPermissions = () => [PermissionsAndroid.PERMISSIONS.RECEIVE_SMS, PermissionsAndroid.PERMISSIONS.READ_SMS];

export async function smsPermission(): Promise<SmsPermission> {
  if (!native) return 'denied';
  const checks = await Promise.all(smsPermissions().map((p) => PermissionsAndroid.check(p)));
  return checks.every(Boolean) ? 'granted' : 'denied';
}

/**
 * Asks for SMS access. On Android 13+ an APK installed outside the Play Store first needs
 * "Allow restricted settings" in App info; until then Android refuses without asking.
 */
export async function requestSmsPermission(): Promise<SmsPermission> {
  if (!native) return 'denied';
  const results = await PermissionsAndroid.requestMultiple(smsPermissions());
  return permissionState(results as Record<string, string>);
}

/** Sends the current settings to the receiver. */
export function applySmsConfig(): void {
  const s = useSettings.getState();
  // Before settings load, the defaults would switch capture off and back on, which restarts
  // the catch-up from now and skips messages that arrived while Mula was closed.
  if (!native || !s.loaded) return;
  try {
    const extra = E2E_SENDER ? [...s.smsExtraSenders, E2E_SENDER] : s.smsExtraSenders;
    native.configure({ enabled: s.smsCapture || E2E_SENDER != null, senders: senderList(extra), notify: s.smsNotify });
  } catch (e) {
    console.warn('[mula] sms config', e);
  }
}

/** Queues bank messages that arrived while the receiver couldn't run. */
export async function catchUpSms(): Promise<number> {
  if (!native || (!useSettings.getState().smsCapture && !E2E_SENDER)) return 0;
  try {
    return await native.catchUp();
  } catch (e) {
    console.warn('[mula] sms catch-up', e);
    return 0;
  }
}

/** Calls back when a message is queued while the app is running. */
export function onSmsQueued(listener: () => void): () => void {
  if (!native) return () => undefined;
  const sub = native.addListener('onQueued', listener);
  return () => sub.remove();
}
