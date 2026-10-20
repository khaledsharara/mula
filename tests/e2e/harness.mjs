/**
 * Minimal browser test harness: drives the web build in the installed Chrome at iPhone size,
 * with a fresh profile per run, and records console errors and failures per step.
 *
 *   npm start                        (in another terminal; or MULA_URL=http://localhost:<port>)
 *   npm run e2e
 */
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright-core';

export const BASE = process.env.MULA_URL ?? 'http://localhost:8081';
export const OUT = new URL('./output/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

export async function start({ colorScheme = 'light' } = {}) {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    colorScheme,
    acceptDownloads: true,
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${String(e).slice(0, 300)}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console: ${m.text().slice(0, 300)}`);
  });
  return { browser, context, page, errors };
}

const results = [];

/** Runs one named step; failures are recorded with a screenshot and the run continues. */
export async function step(page, name, fn) {
  const started = Date.now();
  try {
    await fn();
    results.push({ name, ok: true, ms: Date.now() - started });
    process.stdout.write(`  ok    ${name}\n`);
  } catch (e) {
    const file = `${OUT}FAIL-${name.replace(/[^a-z0-9]+/gi, '-')}.png`;
    await page.screenshot({ path: file }).catch(() => undefined);
    results.push({ name, ok: false, ms: Date.now() - started, error: String(e?.message ?? e).split('\n')[0] });
    process.stdout.write(`  FAIL  ${name}: ${String(e?.message ?? e).split('\n')[0]}\n`);
  }
}

export function summary(errors) {
  const failed = results.filter((r) => !r.ok);
  process.stdout.write(`\n${results.length - failed.length}/${results.length} steps passed\n`);
  for (const f of failed) process.stdout.write(`  - ${f.name}: ${f.error}\n`);
  const unique = [...new Set(errors)].filter((e) => !/React DevTools|push token changes|Slow network/.test(e));
  process.stdout.write(`console errors: ${unique.length}\n`);
  for (const e of unique.slice(0, 20)) process.stdout.write(`  ! ${e}\n`);
  return failed.length === 0 && unique.length === 0;
}

export const tid = (page, id) => page.locator(`[data-testid="${id}"]`).first();

export async function tap(page, id, opts = {}) {
  await tid(page, id).click({ timeout: opts.timeout ?? 8000 });
  await page.waitForTimeout(opts.wait ?? 350);
}

export async function shot(page, name) {
  await page.screenshot({ path: `${OUT}${name}.png` });
}

export async function expectText(page, text, timeout = 6000) {
  await page.getByText(text, { exact: false }).first().waitFor({ state: 'visible', timeout });
}

export async function expectGone(page, id, timeout = 6000) {
  await page.locator(`[data-testid="${id}"]`).first().waitFor({ state: 'hidden', timeout });
}

export async function keys(page, seq) {
  for (const k of seq) {
    const id = k === '.' ? 'key-dot' : ['+', '−', '×', '÷'].includes(k) ? `key-op-${k}` : `key-${k}`;
    await tid(page, id).click();
  }
  await page.waitForTimeout(150);
}

/** Drags a sheet down from a point, like a swipe-to-dismiss. */
export async function swipeDown(page, x, y, distance = 380) {
  await page.mouse.move(x, y);
  await page.mouse.down();
  for (let i = 1; i <= 12; i++) {
    await page.mouse.move(x, y + (distance * i) / 12);
    await page.waitForTimeout(16);
  }
  await page.mouse.up();
  await page.waitForTimeout(600);
}

/**
 * Opens a route and waits until the app has rendered something with `readyId`. Each open is a
 * full page load of the dev bundle, which can stall while Metro is busy, so it retries once.
 */
export async function open(page, path, readyId, timeout = 120000) {
  for (let attempt = 1; ; attempt++) {
    try {
      await page.goto(`${BASE}${path}`, { waitUntil: 'commit', timeout });
      if (readyId) await page.locator(`[data-testid="${readyId}"]`).first().waitFor({ state: 'visible', timeout });
      else await page.waitForLoadState('load', { timeout });
      break;
    } catch (e) {
      if (attempt === 2) throw e;
    }
  }
  await page.waitForTimeout(400);
}
