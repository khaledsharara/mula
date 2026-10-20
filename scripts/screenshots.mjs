/**
 * Renders the README screenshots from made-up demo data (tests/demo/demoBackup.test.ts) in the
 * web build, at iPhone size, light and dark:
 *
 *   MULA_WRITE_DEMO=1 npx jest tests/demo       (writes tests/e2e/output/demo-backup.json)
 *   npm run web                                  (another terminal; or MULA_URL=http://localhost:<port>)
 *   node scripts/screenshots.mjs
 *
 * Output: docs/screenshots/<screen>-<light|dark>.png. The clock is pinned to the demo's "today".
 */
import { existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { open, start, tap, tid } from '../tests/e2e/harness.mjs';

const root = new URL('..', import.meta.url);
const BACKUP = fileURLToPath(new URL('tests/e2e/output/demo-backup.json', root));
const OUT = fileURLToPath(new URL('docs/screenshots/', root));
// Same moment as DEMO_NOW in tests/demo/demoBackup.test.ts.
const DEMO_NOW = new Date(2026, 9, 18, 13, 30);

if (!existsSync(BACKUP)) {
  console.error('Missing demo data. Run: MULA_WRITE_DEMO=1 npx jest tests/demo');
  process.exit(1);
}
mkdirSync(OUT, { recursive: true });

async function capture(scheme) {
  const { browser, page } = await start({ colorScheme: scheme });
  await page.clock.setFixedTime(DEMO_NOW);
  const shoot = async (name) => {
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${OUT}${name}-${scheme}.png` });
    console.log(`  ${name}-${scheme}.png`);
  };

  // A fresh browser profile starts at onboarding: finish it, then load the demo backup.
  await open(page, '/onboarding', 'onboarding');
  await tap(page, 'preset-cash', { wait: 600 });
  await tid(page, 'account-balance').fill('0');
  await tap(page, 'account-save', { wait: 900 });
  await tap(page, 'onboarding-finish', { wait: 2000 });
  await open(page, '/data', 'data-page');
  const [chooser] = await Promise.all([page.waitForEvent('filechooser', { timeout: 10000 }), tap(page, 'data-restore-backup', { wait: 300 })]);
  await chooser.setFiles(BACKUP);
  await tid(page, 'confirm-sheet').waitFor({ timeout: 10000 });
  await tap(page, 'confirm-yes', { wait: 2500 });

  await open(page, '/', 'home');
  await shoot('home');

  await open(page, '/review', 'review');
  await tid(page, 'review-card').waitFor({ timeout: 15000 });
  await shoot('review');

  await open(page, '/inbox', 'inbox');
  await shoot('inbox');

  await open(page, '/records', 'records');
  await shoot('records');

  await open(page, '/insights', 'insights');
  await shoot('insights');

  await open(page, '/', 'home');
  await tap(page, 'tab-add', { wait: 1200 });
  await tid(page, 'tx-form').waitFor({ timeout: 15000 });
  await tap(page, 'currency-button', { wait: 900 });
  await tap(page, 'currency-option-USD', { wait: 900 });
  for (const k of ['1', '2', 'dot', '5', '0']) await tid(page, `key-${k}`).click();
  await tid(page, 'fx-line').waitFor({ timeout: 15000 });
  await page.waitForFunction(() => !document.querySelector('[data-testid="fx-line"]')?.textContent?.includes('Fetching'), null, { timeout: 20000 });
  await shoot('add');

  await open(page, '/recurring', 'recurring-list');
  await page.getByText('Netflix', { exact: true }).first().click();
  await tid(page, 'recurring-detail').waitFor({ timeout: 10000 });
  await shoot('planned');

  await open(page, '/payees', null);
  await page.getByText('Sample Coffee Co', { exact: true }).first().click();
  await tid(page, 'payee-detail').waitFor({ timeout: 10000 });
  await shoot('payee');

  await open(page, '/debts', 'debts-list');
  await shoot('debts');

  await open(page, '/integrations', 'integrations-page');
  await shoot('automation');

  await browser.close();
}

console.log('Mula screenshots');
for (const scheme of ['light', 'dark']) await capture(scheme);
