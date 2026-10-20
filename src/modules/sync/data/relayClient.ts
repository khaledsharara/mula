import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { getSettings } from '../../shared/settings/settingsStore';

/**
 * The relay (relay/ in this repo) holds the cloud copy that Claude reads and edits. Its address
 * lives in settings; the app token in the keychain, never in backups.
 * EXPO_PUBLIC_MULA_RELAY_URL / EXPO_PUBLIC_MULA_RELAY_TOKEN prefill both at build time.
 */

const TOKEN_KEY = 'mula.relayToken';
export const ENV_RELAY_URL = process.env.EXPO_PUBLIC_MULA_RELAY_URL?.trim() || null;
const ENV_TOKEN = process.env.EXPO_PUBLIC_MULA_RELAY_TOKEN?.trim() || null;

export async function readToken(): Promise<string | null> {
  try {
    if (Platform.OS === 'web') return globalThis.localStorage?.getItem(TOKEN_KEY) ?? null;
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function writeToken(token: string | null): Promise<void> {
  if (Platform.OS === 'web') {
    if (token) globalThis.localStorage?.setItem(TOKEN_KEY, token);
    else globalThis.localStorage?.removeItem(TOKEN_KEY);
    return;
  }
  if (token) await SecureStore.setItemAsync(TOKEN_KEY, token);
  else await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export type RelayConfig = { url: string; token: string };

/** The relay to sync with, once it has been connected in Automation › Claude. */
export async function getRelayConfig(): Promise<RelayConfig | null> {
  const url = getSettings().syncRelayUrl;
  const token = await readToken();
  return url && token ? { url, token } : null;
}

/** A token saved in the keychain, or one built into the app. */
export async function availableToken(): Promise<string | null> {
  return (await readToken()) ?? ENV_TOKEN;
}

export function normalizeRelayUrl(input: string): string | null {
  let url = input.trim().replace(/\/+$/, '');
  if (!url) return null;
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  // People paste the connector address; Mula only needs the base.
  url = url.replace(/\/mcp(\/[^/]*)?$/, '');
  try {
    const parsed = new URL(url);
    const local = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
    return parsed.protocol === 'https:' || local ? `${parsed.origin}${parsed.pathname.replace(/\/$/, '')}` : null;
  } catch {
    return null;
  }
}

export class RelayError extends Error {
  constructor(
    message: string,
    readonly status: number | null = null,
    readonly code: string | null = null,
  ) {
    super(message);
  }
}

export async function relayRequest<T>(config: RelayConfig, path: string, init: RequestInit = {}, timeoutMs = 20_000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${config.url}${path}`, {
      ...init,
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.token}`, ...(init.headers ?? {}) },
    });
    const body = (await res.json().catch(() => null)) as { error?: string; message?: string } | null;
    if (res.status === 401) throw new RelayError('The relay rejected the app token. Check it in Automation › Claude.', 401, 'unauthorized');
    if (!res.ok) throw new RelayError(body?.message ?? `The relay answered ${res.status}`, res.status, body?.error ?? null);
    return body as T;
  } catch (e) {
    if (e instanceof RelayError) throw e;
    if (e instanceof Error && e.name === 'AbortError') throw new RelayError('The relay didn’t answer in time');
    throw new RelayError('Couldn’t reach the relay. Check the address and your connection.');
  } finally {
    clearTimeout(timer);
  }
}
