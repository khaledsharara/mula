import { all, first, run } from '../../shared/db/client';
import { notify } from '../../shared/db/live';
import { CURRENCIES } from '../../shared/utils/money';
import { isoDay } from '../../shared/utils/dates';

/**
 * Exchange rates from free, keyless sources:
 * 1. fawazahmed0/currency-api on jsDelivr (latest and per-date, includes EGP)
 * 2. its Cloudflare Pages mirror
 * 3. open.er-api.com (latest only)
 * Rates are cached per day in SQLite so conversions keep working offline.
 */
const SOURCES = {
  jsdelivr: (base: string, day: string) =>
    `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@${day}/v1/currencies/${base.toLowerCase()}.json`,
  pages: (base: string, day: string) =>
    `https://${day === 'latest' ? 'latest' : day}.currency-api.pages.dev/v1/currencies/${base.toLowerCase()}.json`,
  erApi: (base: string) => `https://open.er-api.com/v6/latest/${base.toUpperCase()}`,
};

const WANTED = new Set<string>(CURRENCIES);

async function fetchJson(url: string, timeoutMs = 8000): Promise<unknown> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

async function fetchRates(base: string, day: string | 'latest'): Promise<{ day: string; rates: Record<string, number> } | null> {
  const lower = base.toLowerCase();
  for (const url of [SOURCES.jsdelivr(base, day), SOURCES.pages(base, day)]) {
    try {
      const json = (await fetchJson(url)) as { date?: string; [k: string]: unknown };
      const table = json[lower] as Record<string, number> | undefined;
      if (table && typeof json.date === 'string') {
        const rates: Record<string, number> = {};
        for (const [k, v] of Object.entries(table)) if (WANTED.has(k.toUpperCase())) rates[k.toUpperCase()] = v;
        return { day: json.date, rates };
      }
    } catch {
      // Try the next source.
    }
  }
  if (day === 'latest') {
    try {
      const json = (await fetchJson(SOURCES.erApi(base))) as { result?: string; rates?: Record<string, number>; time_last_update_unix?: number };
      if (json.result === 'success' && json.rates) {
        const rates: Record<string, number> = {};
        for (const [k, v] of Object.entries(json.rates)) if (WANTED.has(k)) rates[k] = v;
        return { day: isoDay((json.time_last_update_unix ?? Date.now() / 1000) * 1000), rates };
      }
    } catch {
      // Offline or blocked.
    }
  }
  return null;
}

async function storeRates(day: string, base: string, rates: Record<string, number>): Promise<void> {
  const now = Date.now();
  for (const [quote, rate] of Object.entries(rates)) {
    if (quote === base || !(rate > 0)) continue;
    await run('INSERT OR REPLACE INTO fx_rates (day, base, quote, rate, fetched_at) VALUES (?, ?, ?, ?, ?)', [day, base, quote, rate, now]);
  }
  notify(['fx_rates']);
}

async function cached(from: string, to: string, day: string): Promise<number | null> {
  const direct = await first<{ rate: number }>('SELECT rate FROM fx_rates WHERE day = ? AND base = ? AND quote = ?', [day, from, to]);
  if (direct) return direct.rate;
  const inverse = await first<{ rate: number }>('SELECT rate FROM fx_rates WHERE day = ? AND base = ? AND quote = ?', [day, to, from]);
  return inverse ? 1 / inverse.rate : null;
}

async function nearestCached(from: string, to: string, day: string): Promise<number | null> {
  const rows = await all<{ base: string; rate: number; day: string }>(
    `SELECT base, rate, day FROM fx_rates WHERE (base = ? AND quote = ?) OR (base = ? AND quote = ?)
     ORDER BY ABS(julianday(day) - julianday(?)) ASC LIMIT 1`,
    [from, to, to, from, day],
  );
  const r = rows[0];
  if (!r) return null;
  return r.base === from ? r.rate : 1 / r.rate;
}

const inflight = new Map<string, Promise<number | null>>();

async function fetchAndCache(from: string, to: string, day: string, today: string): Promise<number | null> {
  const fetched = await fetchRates(from, day === today ? 'latest' : day);
  if (!fetched) return null;
  await storeRates(day === today ? today : fetched.day, from, fetched.rates);
  return fetched.rates[to] ?? null;
}

/**
 * How many `to` one unit of `from` buys on `ts` (default now).
 * Uses the exact day's cached rate when present. Otherwise, if any nearby rate is cached,
 * returns it at once and fetches the exact day in the background (so saving never waits
 * on the network); only with an empty cache does it wait for a download.
 */
export function getRate(from: string, to: string, ts: number = Date.now()): Promise<number | null> {
  if (from === to) return Promise.resolve(1);
  const today = isoDay(Date.now());
  const day = isoDay(Math.min(ts, Date.now()));
  const key = `${from}-${to}-${day}`;
  const existing = inflight.get(key);
  if (existing) return existing;

  const p = (async () => {
    const hit = await cached(from, to, day);
    if (hit) return hit;
    const near = await nearestCached(from, to, day);
    if (near) {
      void fetchAndCache(from, to, day, today).catch(() => undefined);
      return near;
    }
    return (await fetchAndCache(from, to, day, today)) ?? null;
  })().finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}

/** Converts minor units; null when no rate is available. */
export async function convert(minor: number, from: string, to: string, ts?: number): Promise<{ amount: number; rate: number } | null> {
  const rate = await getRate(from, to, ts);
  if (rate == null) return null;
  return { amount: Math.round(minor * rate), rate };
}

/** Warms today's rates for the base currency so the add screen converts instantly. */
export async function refreshTodayRates(base: string): Promise<void> {
  const today = isoDay(Date.now());
  const has = await first<{ n: number }>('SELECT COUNT(*) AS n FROM fx_rates WHERE day = ? AND (base = ? OR quote = ?)', [today, base, base]);
  if (has?.n) return;
  const fetched = await fetchRates(base, 'latest');
  if (fetched) await storeRates(today, base, fetched.rates);
}
