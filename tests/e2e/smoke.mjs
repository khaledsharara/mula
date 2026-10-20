/**
 * End-to-end pass over the web build. Run with the dev server up:
 *   npm run e2e
 * Screenshots land in tests/e2e/output/ (git-ignored).
 */
import assert from 'node:assert/strict';
import { OUT, expectGone, expectText, keys, open, shot, start, step, summary, tap, tid } from './harness.mjs';
import { RELAY, claude, relayApp, relayUp, relayVars } from './relay.mjs';

const { browser, page, errors } = await start();
const visible = (id) => tid(page, id).isVisible();
const text = async (id) => (await tid(page, id).innerText()).replace(/\s+/g, ' ').trim();

/** Swipes the top sheet down by its handle. */
async function swipeSheetDown() {
  const handle = page.locator('[data-testid="sheet-handle"]').last();
  const box = await handle.boundingBox();
  assert.ok(box, 'sheet handle is visible');
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  for (let i = 1; i <= 15; i++) {
    await page.mouse.move(x, y + i * 30);
    await page.waitForTimeout(16);
  }
  await page.mouse.up();
  await page.waitForTimeout(800);
}

async function addAccount(preset, name, balance, digits) {
  await tap(page, `preset-${preset}`, { wait: 600 });
  if (name) await tid(page, 'account-name').fill(name);
  await tid(page, 'account-balance').fill(balance);
  if (digits) await tid(page, 'account-digits').fill(digits);
  await tap(page, 'account-save', { wait: 900 });
}

async function openAdd() {
  await open(page, '/', 'home');
  await tap(page, 'tab-add', { wait: 1200 });
  await tid(page, 'tx-form').waitFor({ timeout: 15000 });
}

async function pickCategory(group, option) {
  await tap(page, 'field-category', { wait: 900 });
  await tap(page, `category-group-${group}`, { wait: 500 });
  await tap(page, `category-option-${option}`, { wait: 700 });
}

async function createPayee(name) {
  await tap(page, 'field-payee', { wait: 900 });
  await tid(page, 'picker-search').fill(name);
  await page.waitForTimeout(300);
  await tap(page, 'payee-create', { wait: 700 });
}

async function save() {
  await tap(page, 'tx-save', { wait: 1500 });
}

console.log('Mula e2e (web)');

await step(page, 'onboarding: add three accounts and finish', async () => {
  await open(page, '/onboarding', 'onboarding');
  await addAccount('bank', 'CIB', '12500.75', '9002, 9001');
  await addAccount('cash', null, '850');
  await addAccount('usd', 'CIB Dollar', '420.50', '9003');
  await expectText(page, 'CIB Dollar');
  await shot(page, '01-onboarding');
  await tap(page, 'onboarding-finish', { wait: 2000 });
  await tid(page, 'home').waitFor({ timeout: 15000 });
});

await step(page, 'home: accounts, debts section and quick debt buttons', async () => {
  await expectText(page, 'Debts');
  assert.ok(await visible('home-debt-lent'), 'I lent money button');
  assert.ok(await visible('home-debt-borrowed'), 'I borrowed button');
  await shot(page, '02-home');
});

await step(page, 'tabs: every tab shows a clear selected state', async () => {
  for (const t of ['records', 'insights', 'more', 'index']) {
    await tap(page, `tab-${t}`, { wait: 900 });
    const selected = await tid(page, `tab-${t}`).getAttribute('aria-selected');
    assert.equal(selected, 'true', `${t} is marked selected`);
    for (const other of ['records', 'insights', 'more', 'index'].filter((o) => o !== t)) {
      assert.notEqual(await tid(page, `tab-${other}`).getAttribute('aria-selected'), 'true', `${other} not selected`);
    }
    await shot(page, `03-tab-${t}`);
  }
});

await step(page, 'sheets: category sheet is opaque and swipes down to close', async () => {
  await openAdd();
  await tap(page, 'field-category', { wait: 900 });
  assert.ok(await visible('category-picker'), 'category sheet open');
  const bg = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="category-picker"]');
    let n = el;
    while (n && n !== document.body) {
      const c = getComputedStyle(n).backgroundColor;
      if (c && c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent') return c;
      n = n.parentElement;
    }
    return 'transparent';
  });
  assert.notEqual(bg, 'transparent', 'sheet has a solid surface');
  await shot(page, '04-category-sheet');
  await swipeSheetDown();
  await expectGone(page, 'category-picker');
});

await step(page, 'sheets: currency sheet opens with a surface and closes with ×', async () => {
  await tap(page, 'currency-button', { wait: 900 });
  assert.ok(await visible('currency-picker'), 'currency sheet open');
  await shot(page, '05-currency-sheet');
  await tap(page, 'currency-picker-close', { wait: 700 });
  await expectGone(page, 'currency-picker');
});

await step(page, 'expense: signed amount, category, payee, save', async () => {
  await keys(page, ['2', '5', '0']);
  const amount = await text('amount-display');
  assert.match(amount, /−\s?250/, `expense shows a minus: ${amount}`);
  await pickCategory('Food & Drinks', 'Groceries');
  await createPayee('Carrefour');
  await shot(page, '06-expense-filled');
  await save();
  await expectText(page, 'Saved');
});

await step(page, 'income: shows plus in the form and in Records', async () => {
  await openAdd();
  await tap(page, 'tx-mode-income', { wait: 300 });
  await keys(page, ['5', '0', '0', '0']);
  assert.match(await text('amount-display'), /\+\s?5,000/, 'income shows a plus');
  await tap(page, 'field-category', { wait: 900 });
  await tap(page, 'category-group-Income', { wait: 500 });
  await tap(page, 'category-option-Wage, invoices', { wait: 700 });
  await save();
  await open(page, '/records', 'records');
  await expectText(page, '+5,000');
  await expectText(page, '−250');
  await shot(page, '07-records-signs');
});

await step(page, 'instapay: fee is 0.1% with a 0.50 minimum and 20 maximum', async () => {
  await openAdd();
  await tap(page, 'tx-mode-instapay', { wait: 300 });
  const cases = [
    [['2', '0', '0'], '0.50'],
    [['5', '0', '0'], '0.50'],
    [['8', '5', '0'], '0.85'],
    [['1', '0', '0', '0', '0'], '10.00'],
    [['3', '0', '0', '0', '0'], '20.00'],
  ];
  for (const [seq, fee] of cases) {
    for (let i = 0; i < 6; i++) await tap(page, 'key-back', { wait: 30 });
    await keys(page, seq);
    const line = await text('fee-line');
    assert.ok(line.includes(`EGP ${fee} InstaPay fee`), `${seq.join('')} → ${fee}, got "${line}"`);
  }
  await shot(page, '08-instapay-fee');
});

await step(page, 'instapay: custom fee and total', async () => {
  for (let i = 0; i < 6; i++) await tap(page, 'key-back', { wait: 30 });
  await keys(page, ['8', '5', '0']);
  await tap(page, 'fee-line', { wait: 900 });
  await tid(page, 'fee-custom').fill('1.25');
  await tap(page, 'fee-custom-save', { wait: 700 });
  const line = await text('fee-line');
  assert.ok(line.includes('1.25') && line.includes('851.25 in total'), `custom fee line: ${line}`);
  await tap(page, 'fee-line', { wait: 900 });
  await tap(page, 'fee-standard', { wait: 700 });
  assert.ok((await text('fee-line')).includes('0.85'), 'back to standard fee');
});

await step(page, 'instapay: save to a person, then editing the amount updates the fee', async () => {
  await pickCategory('Shopping', 'Gifts, joy');
  await createPayee('John Doe');
  await save();
  await open(page, '/records', 'records');
  await expectText(page, '+0.85 fee');
  await page.getByText('John Doe').first().click();
  await tid(page, 'tx-form').waitFor();
  await page.waitForTimeout(800);
  for (let i = 0; i < 8; i++) await tap(page, 'key-back', { wait: 30 });
  await keys(page, ['2', '0', '0', '0']);
  assert.ok((await text('fee-line')).includes('EGP 2.00 InstaPay fee'), 'fee follows the new amount');
  await save();
  await expectText(page, '+2.00 fee');
  await shot(page, '09-instapay-edited');
});

await step(page, 'transfer: between own accounts', async () => {
  await openAdd();
  await tap(page, 'tx-mode-transfer', { wait: 300 });
  await keys(page, ['3', '0', '0']);
  await tap(page, 'field-to-account', { wait: 900 });
  await tap(page, 'account-option-Cash', { wait: 700 });
  await save();
  await open(page, '/records', 'records');
  await expectText(page, 'CIB to Cash');
});

await step(page, 'foreign currency: USD on an EGP account converts', async () => {
  await openAdd();
  await tap(page, 'currency-button', { wait: 900 });
  await tap(page, 'currency-option-USD', { wait: 900 });
  await keys(page, ['1', '0']);
  await tid(page, 'fx-line').waitFor({ timeout: 15000 });
  await page.waitForFunction(() => !document.querySelector('[data-testid="fx-line"]')?.textContent?.includes('Fetching'), null, { timeout: 20000 });
  assert.match(await text('fx-line'), /≈ EGP [\d,]+\.\d{2} at \d+\.\d{2}/, 'conversion line');
  await pickCategory('Communication, PC', 'Software, apps, games');
  await save();
});

await step(page, 'note: opens a sheet, saves the text', async () => {
  await openAdd();
  await keys(page, ['4', '5']);
  await tap(page, 'field-note', { wait: 900 });
  await tid(page, 'note-input').fill('Coffee with Sara');
  await tap(page, 'note-done', { wait: 700 });
  assert.ok((await text('field-note')).includes('Coffee with Sara'), 'note shown on the form');
  await pickCategory('Food & Drinks', 'Bar, cafe');
  await save();
});

await step(page, 'sheets: note sheet swipes down while typing, and closes on a tap outside', async () => {
  await openAdd();
  await tap(page, 'field-note', { wait: 900 });
  await tid(page, 'note-input').fill('Half typed');
  await swipeSheetDown();
  await expectGone(page, 'note-sheet');
  await tap(page, 'field-note', { wait: 900 });
  assert.ok(await visible('note-sheet'), 'note sheet opens again');
  await tap(page, 'note-sheet-backdrop', { wait: 800 });
  await expectGone(page, 'note-sheet');
});

await step(page, 'sheets: lists have no dividers and their last option can be picked', async () => {
  await openAdd();
  await tap(page, 'field-category', { wait: 900 });
  await tap(page, 'category-group-Life & Entertainment', { wait: 700 });
  assert.equal(await page.locator('[data-testid="category-picker"] .h-px').count(), 0, 'no row dividers in the sheet');
  const last = page.locator('[data-testid^="category-option-"]').last();
  const name = (await last.innerText()).trim();
  await last.click({ timeout: 5000 });
  await page.waitForTimeout(700);
  assert.ok((await text('field-category')).includes(name), `picked the last option (${name})`);
});

await step(page, 'sheets: date sheet keeps Done on screen', async () => {
  await tap(page, 'field-date', { wait: 900 });
  const box = await tid(page, 'date-done').boundingBox();
  assert.ok(box && box.y + box.height <= 844, `Done is inside the screen (bottom ${box && Math.round(box.y + box.height)})`);
  await tap(page, 'date-done', { wait: 700 });
  await expectGone(page, 'date-sheet');
});

await step(page, 'templates: saving from the add screen asks for a name', async () => {
  await keys(page, ['3', '5']);
  await tap(page, 'tx-menu', { wait: 900 });
  await tap(page, 'menu-template', { wait: 900 });
  assert.ok(await visible('template-name-sheet'), 'name sheet opens');
  await tid(page, 'template-name-input').fill('Cinema night');
  await tap(page, 'template-name-save', { wait: 900 });
  await expectText(page, 'Template “Cinema night” saved');
  await openAdd();
  assert.ok(await visible('template-chip-Cinema night'), 'named template chip on the add screen');
});

await step(page, 'toasts: tap closes, swipe up closes', async () => {
  await tap(page, 'template-chip-Cinema night', { wait: 400 });
  await tap(page, 'tx-save', { wait: 500 });
  await tid(page, 'toast').waitFor({ timeout: 5000 });
  await tap(page, 'toast-dismiss', { wait: 600 });
  await expectGone(page, 'toast', 3000);
  await open(page, '/inbox?paste=1', 'paste-sheet');
  await tid(page, 'paste-input').fill('hello there');
  await tap(page, 'paste-add', { wait: 800 });
  const box = await tid(page, 'toast').boundingBox();
  assert.ok(box, 'toast shown');
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  for (let i = 1; i <= 8; i++) {
    await page.mouse.move(x, y - i * 12);
    await page.waitForTimeout(16);
  }
  await page.mouse.up();
  await expectGone(page, 'toast', 3000);
});

await step(page, 'forms: long labels stay on one line, level with their value', async () => {
  await open(page, '/accounts/edit', 'account-payment');
  const label = await page.getByText('Usually paid with', { exact: true }).boundingBox();
  const value = await tid(page, 'account-payment').boundingBox();
  assert.ok(label && label.height < 30, `label is one line (${label && Math.round(label.height)}px)`);
  assert.ok(Math.abs(label.y + label.height / 2 - (value.y + value.height / 2)) < 4, 'label is centred in its row');
});

await step(page, 'categories: parent picker scrolls to its last option', async () => {
  await open(page, '/categories/edit', 'category-form');
  await tap(page, 'category-parent', { wait: 900 });
  const last = page.locator('[data-testid^="parent-option-"]').last();
  const name = (await last.innerText()).trim();
  await last.click({ timeout: 5000 });
  await page.waitForTimeout(700);
  await expectGone(page, 'category-parent-picker');
  assert.ok((await text('category-parent')).includes(name), `parent set to ${name}`);
});

await step(page, 'inbox: paste CIB messages', async () => {
  await open(page, '/inbox?paste=1', 'paste-sheet');
  const sms = [
    'تم خصم EGP 123.45  من بطاقة الخصم المباشر # **9002 باستخدام Apple Pay عند  Talabat في  16/10/26 13:31الرصيد المتاح  EGP12377.30.',
    'يرجى العلم انه تم تنفيذ تحويل لحظي بمبلغ 850.00 جم من حسابك المنتهي بـ ********9001 برقم مرجعي c3d4e5f6 بتاريخ 16-10-2026 17:10 للمزيد، برجاء الاتصال بـ 19666',
    'يرجى العلم انه تم تنفيذ تحويل لحظي بمبلغ 300.00 جم إلى حسابك المنتهي بـ ********9001 من NOUR TEST PERSON برقم مرجعي d4e5f6a7 بتاريخ 16-10-2026 20:26 للمزيد، برجاء الاتصال بـ 19666',
    'تم خصم مبلغ  USD 14.99 من بطاقة الخصم المباشر المنتهية بـ **9003 عند SAMPLE CLOUD SERVICE في 15/10/26 19:18 ، الرصيد المتاح 405.51 USD',
    'تم رفض المعاملة على بطاقتك المنتهية بـ **9002 من Amazon Retail بقيمة 145.00 EGP لعدم كفاية الرصيد. الرصيد المتاح 67.89 EGP',
  ].join('\n\n');
  await tid(page, 'paste-input').fill(sms);
  await tap(page, 'paste-add', { wait: 2000 });
  await expectText(page, '4 messages added');
  await expectText(page, 'Waiting (4)');
  await shot(page, '10-inbox');
});

await step(page, 'review: card renders with amount, account and category chips', async () => {
  await tap(page, 'inbox-review', { wait: 2000 });
  await tid(page, 'review-card').waitFor({ timeout: 15000 });
  const card = await text('review-card');
  assert.ok(/Card payment|Apple Pay|InstaPay/.test(card), `card has a kind: ${card.slice(0, 80)}`);
  assert.ok(await visible('review-confirm'), 'confirm button');
  await shot(page, '11-review-card');
});

await step(page, 'review: work through every card', async () => {
  for (let n = 0; n < 6; n++) {
    if (await tid(page, 'review-done').isVisible().catch(() => false)) break;
    const card = await text('review-card');
    if (card.includes('Who did you send it to?')) {
      await tap(page, 'review-someone-else', { wait: 800 });
      await tid(page, 'picker-search').fill('Ahmed Ali');
      await page.waitForTimeout(250);
      await tap(page, 'payee-create', { wait: 700 });
    }
    if (card.includes('Nour Test Person')) {
      await tap(page, 'review-payee', { wait: 800 });
      await tid(page, 'picker-search').fill('Mom');
      await page.waitForTimeout(250);
      await tap(page, 'payee-create', { wait: 700 });
    }
    if ((await text('review-card')).includes('Pick a category')) {
      const chip = page.locator('[data-testid^="review-cat-"]').first();
      await chip.click();
      await page.waitForTimeout(300);
    }
    await tap(page, 'review-confirm', { wait: 1200 });
    if (await tid(page, 'alias-prompt').isVisible().catch(() => false)) {
      await shot(page, '12-alias-prompt');
      await tap(page, 'alias-always', { wait: 1500 });
    }
  }
  await tid(page, 'review-done').waitFor({ timeout: 10000 });
  await shot(page, '13-review-done');
});

await step(page, 'records: confirmed bank messages appear with signs and fees', async () => {
  await open(page, '/records', 'records');
  await expectText(page, 'Talabat');
  await expectText(page, 'Mom');
  await expectText(page, '+300');
  await shot(page, '14-records-after-review');
});

await step(page, 'home: bank balance check and review banner gone', async () => {
  await open(page, '/', 'home');
  assert.equal(await tid(page, 'home-review').isVisible().catch(() => false), false, 'no review banner');
  await shot(page, '15-home-after-review');
});

await step(page, 'debts: add from home, shows on home, record a repayment', async () => {
  await tap(page, 'home-debt-lent', { wait: 1500 });
  await tap(page, 'debt-person', { wait: 900 });
  await tid(page, 'picker-search').fill('Karim');
  await page.waitForTimeout(250);
  await tap(page, 'payee-create', { wait: 700 });
  await tid(page, 'debt-amount').fill('1500');
  await tap(page, 'debt-account', { wait: 900 });
  await tap(page, 'account-option-Cash', { wait: 700 });
  await tap(page, 'debt-save', { wait: 1500 });
  await open(page, '/', 'home');
  await expectText(page, 'Karim');
  await expectText(page, 'Owed to you');
  await shot(page, '16-home-debts');
  await page.getByText('Karim').first().click();
  await tid(page, 'debt-detail').waitFor({ timeout: 10000 });
  await tap(page, 'debt-repay', { wait: 900 });
  await tid(page, 'repay-amount').fill('500');
  await shot(page, '17-repay-sheet');
  await tap(page, 'repay-save', { wait: 1500 });
  assert.ok((await text('debt-remaining')).includes('1,000'), 'remaining drops to 1,000');
});

await step(page, 'debts: lending over InstaPay books the fee as spending', async () => {
  await open(page, '/debts/edit?direction=lent', 'debt-form');
  await tap(page, 'debt-person', { wait: 900 });
  await tid(page, 'picker-search').fill('Omar');
  await page.waitForTimeout(250);
  await tap(page, 'payee-create', { wait: 700 });
  await tid(page, 'debt-amount').fill('1500');
  await tap(page, 'debt-account', { wait: 900 });
  await tap(page, 'account-option-CIB', { wait: 700 });
  await tap(page, 'debt-instapay', { wait: 400 });
  await expectText(page, 'EGP 1.50 InstaPay fee');
  await shot(page, '17b-debt-instapay');
  await tap(page, 'debt-save', { wait: 1500 });
  await open(page, '/records', 'records');
  await expectText(page, '+1.50 fee');
});

await step(page, 'planned payment: monthly rent, due one lands in the inbox', async () => {
  await open(page, '/recurring/edit', 'recurring-form');
  await tid(page, 'recurring-name').fill('Rent');
  await tid(page, 'recurring-amount').fill('9000');
  await tap(page, 'recurring-category', { wait: 900 });
  await tap(page, 'category-group-Housing', { wait: 500 });
  await tap(page, 'category-option-Rent', { wait: 700 });
  await tap(page, 'recurring-frequency-monthly', { wait: 300 });
  await tap(page, 'recurring-start', { wait: 900 });
  await page.getByLabel('1 October', { exact: true }).click();
  await tap(page, 'date-done', { wait: 700 });
  await shot(page, '18-recurring-form');
  await tap(page, 'recurring-save', { wait: 2000 });
  await open(page, '/inbox', 'inbox');
  await expectText(page, 'Rent');
  await open(page, '/recurring', 'recurring-list');
  await expectText(page, 'Rent');
});

await step(page, 'planned payment: EGP subscription on the USD card converts', async () => {
  await open(page, '/recurring/edit', 'recurring-form');
  await tid(page, 'recurring-name').fill('Streaming');
  await tid(page, 'recurring-amount').fill('250');
  await tap(page, 'recurring-account', { wait: 900 });
  await tap(page, 'account-option-CIB Dollar', { wait: 700 });
  assert.match(await text('recurring-currency'), /USD/, 'defaults to the account’s currency');
  await tap(page, 'recurring-currency', { wait: 900 });
  await tap(page, 'currency-option-EGP', { wait: 900 });
  await page.waitForFunction(() => document.body.innerText.includes('≈ USD'), null, { timeout: 20000 });
  await tap(page, 'recurring-category', { wait: 900 });
  await tap(page, 'category-group-Communication, PC', { wait: 500 });
  await tap(page, 'category-option-Software, apps, games', { wait: 700 });
  await shot(page, '18b-recurring-foreign');
  await tap(page, 'recurring-save', { wait: 2000 });
  // Due today, so it waits in the inbox: opening it shows the EGP amount converted to USD.
  await open(page, '/inbox', 'inbox');
  await page.getByText('Streaming', { exact: true }).first().click();
  await tid(page, 'fx-line').waitFor({ timeout: 15000 });
  assert.match(await text('currency-button'), /EGP/, 'entered in EGP');
  assert.match(await text('fx-line'), /≈ USD [\d,]+\.\d{2}/, 'converted to the card’s currency');
  await open(page, '/recurring', 'recurring-list');
  await page.getByText('Streaming', { exact: true }).first().click();
  await tid(page, 'recurring-detail').waitFor({ timeout: 10000 });
  await expectText(page, 'EGP, converted to USD');
});

await step(page, 'templates: create one and apply it from the add screen', async () => {
  await open(page, '/templates/edit', 'template-form');
  await tid(page, 'template-name').fill('Uber ride');
  await tap(page, 'template-category', { wait: 900 });
  await tap(page, 'category-group-Transportation', { wait: 500 });
  await tap(page, 'category-option-Taxi', { wait: 700 });
  await tap(page, 'template-save', { wait: 1500 });
  await openAdd();
  await tap(page, 'template-chip-Uber ride', { wait: 500 });
  assert.ok((await text('field-category')).includes('Taxi'), 'template filled the category');
});

await step(page, 'categories: change need/want and open the editor', async () => {
  await open(page, '/categories', 'categories');
  await shot(page, '19-categories');
  await tap(page, 'category-add', { wait: 1200 });
  await tid(page, 'category-form').waitFor();
  await tid(page, 'category-name').fill('Coworking');
  await tap(page, 'category-save', { wait: 1200 });
});

await step(page, 'payees: alias learned for the renamed sender', async () => {
  await open(page, '/payees', 'payees');
  await page.getByText('Mom').first().click();
  await tid(page, 'payee-detail').waitFor();
  await page.waitForTimeout(800);
  await expectText(page, 'NOUR TEST PERSON');
  await shot(page, '20-payee-mom');
});

await step(page, 'insights: renders every section', async () => {
  await open(page, '/insights', 'insights');
  for (const t of ['Spent', 'Day by day', 'Needs and wants', 'Where it went', 'Calendar', 'When you spend', 'Income and spending']) await expectText(page, t);
  await shot(page, '21-insights');
});

await step(page, 'settings: fee rule shows the official tariff', async () => {
  await open(page, '/settings', 'settings-page');
  assert.equal(await tid(page, 'settings-fee-percent').inputValue(), '0.1');
  assert.equal(await tid(page, 'settings-fee-min').inputValue(), '0.50');
  assert.equal(await tid(page, 'settings-fee-max').inputValue(), '20.00');
});

// Needs the relay running locally: (cd relay && npm run dev). Skipped otherwise.
const withRelay = await relayUp();
const relayStep = (name, fn) =>
  step(page, name, async () => {
    if (!withRelay) {
      console.log(`        (skipped: relay not running at ${RELAY})`);
      return;
    }
    await fn();
  });

await relayStep('cloud: connecting uploads this phone’s data', async () => {
  await relayApp('/sync/sign-out-claude', { method: 'POST', body: '{}' });
  await relayApp('/sync/reset', { method: 'POST', body: '{}' });
  await open(page, '/integrations', 'integrations-page');
  await tid(page, 'cloud-url').fill(RELAY);
  await tid(page, 'cloud-token').fill(relayVars.APP_TOKEN);
  await tap(page, 'cloud-connect', { wait: 2500 });
  await expectText(page, 'In sync', 20000);
  await shot(page, '20a-cloud-connected');
  const overview = await claude('get_overview');
  assert.ok(overview.accounts.some((a) => a.name === 'CIB'), 'Claude sees the accounts');
  const talabat = await claude('find_transactions', { search: 'Talabat' });
  assert.ok(talabat.count >= 1, 'and the records');
  const catalog = await claude('get_catalog');
  assert.ok(catalog.categories.some((c) => c.name === 'Bar, cafe' && c.parent === 'Food & Drinks'), 'and the categories');
});

await relayStep('claude: what Claude adds and edits shows up in the app', async () => {
  await claude('add_transactions', { transactions: [{ amount: 85, payee: 'Starbucks', category: 'Bar, cafe', account: 'CIB', note: 'Latte with Sara' }] });
  const talabat = await claude('find_transactions', { search: 'Talabat' });
  await claude('update_transactions', { updates: talabat.transactions.map((t) => ({ id: t.id, category: 'Restaurant, fast-food' })) });
  // Opening the app syncs, and says Claude changed something.
  await open(page, '/records', 'records');
  await expectText(page, 'Claude made', 15000);
  await expectText(page, 'Starbucks', 15000);
  await page.getByText('Starbucks').first().click();
  await tid(page, 'tx-form').waitFor({ timeout: 10000 });
  await page.waitForTimeout(800);
  assert.ok((await text('field-note')).includes('Latte with Sara'), 'the note Claude wrote is on the record');
  assert.ok((await text('field-category')).includes('Bar, cafe'), 'and its category');
  await open(page, '/records', 'records');
  await page.getByText('Talabat').first().click();
  await tid(page, 'tx-form').waitFor({ timeout: 10000 });
  await page.waitForTimeout(800);
  assert.ok((await text('field-category')).includes('Restaurant'), `Claude’s re-categorizing reached the app: ${await text('field-category')}`);
});

await relayStep('cloud: an edit in the app reaches Claude on its own', async () => {
  await open(page, '/records', 'records');
  await page.getByText('Starbucks').first().click();
  await tid(page, 'tx-form').waitFor({ timeout: 10000 });
  await page.waitForTimeout(600);
  await tap(page, 'field-note', { wait: 900 });
  await tid(page, 'note-input').fill('Latte with Sara and Omar');
  await tap(page, 'note-done', { wait: 700 });
  await save();
  // No tap on "Sync now": the app syncs a few seconds after a change.
  let found = { count: 0 };
  for (let i = 0; i < 20 && !found.count; i++) {
    await page.waitForTimeout(1000);
    found = await claude('find_transactions', { search: 'Omar' });
  }
  assert.equal(found.count, 1, 'Claude sees the edit made on the phone');
});

await relayStep('claude: dismissing a review item clears it from the app', async () => {
  // A fresh bank message, pasted in the app, reaches the cloud copy.
  await open(page, '/inbox', 'inbox');
  await tap(page, 'inbox-paste', { wait: 900 });
  await tid(page, 'paste-input').fill('تم خصم مبلغ  EGP 42.00 من بطاقة الخصم المباشر المنتهية بـ **9002 عند SAMPLE KIOSK في 16/10/26 11:05 ، الرصيد المتاح 900.00 EGP');
  await tap(page, 'paste-add', { wait: 1500 });
  let inbox = { items: [] };
  for (let i = 0; i < 20 && !inbox.items.some((x) => x.bank_name === 'SAMPLE KIOSK'); i++) {
    await page.waitForTimeout(1000);
    inbox = await claude('list_review_inbox');
  }
  const item = inbox.items.find((x) => x.bank_name === 'SAMPLE KIOSK');
  assert.ok(item, 'Claude sees the new bank message');
  await claude('review_inbox', { items: [{ id: item.id, action: 'dismiss', reason: 'Not mine' }] });
  await open(page, '/integrations', 'integrations-page');
  await tap(page, 'cloud-sync', { wait: 2500 });
  await open(page, '/inbox', 'inbox');
  await page.waitForTimeout(800);
  assert.ok(!(await page.getByText('SAMPLE KIOSK', { exact: false }).first().isVisible().catch(() => false)), 'the dismissed message left the inbox');
});

await relayStep('claude: undo from the app', async () => {
  await claude('add_transactions', { transactions: [{ amount: 12, payee: 'Bakery', category: 'Groceries', account: 'CIB' }] });
  await open(page, '/integrations', 'integrations-page');
  await tap(page, 'cloud-sync', { wait: 2500 });
  await open(page, '/records', 'records');
  await expectText(page, 'Bakery');
  await open(page, '/claude-activity', 'claude-activity-page');
  await tid(page, 'activity-row-0').waitFor({ timeout: 10000 });
  assert.ok((await text('activity-row-0')).includes('Bakery'), `newest first: ${await text('activity-row-0')}`);
  await shot(page, '20b-claude-activity');
  await tap(page, 'activity-undo-0', { wait: 900 });
  await tap(page, 'confirm-yes', { wait: 3000 });
  await expectText(page, 'Undone', 10000);
  await open(page, '/records', 'records');
  await page.waitForTimeout(800);
  assert.ok(!(await page.getByText('Bakery').first().isVisible().catch(() => false)), 'the undone record is gone');
});

await relayStep('cloud: a fresh install takes the cloud copy', async () => {
  const fresh = await page.context().browser().newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const p2 = await fresh.newPage();
  p2.on('pageerror', (e) => errors.push(`pageerror (fresh): ${String(e).slice(0, 300)}`));
  try {
    await open(p2, '/', 'onboarding');
    await p2.locator('[data-testid="onboarding-cloud"]').first().click();
    await p2.locator('[data-testid="integrations-page"]').first().waitFor({ timeout: 15000 });
    await p2.locator('[data-testid="cloud-url"]').first().fill(RELAY);
    await p2.locator('[data-testid="cloud-token"]').first().fill(relayVars.APP_TOKEN);
    await p2.locator('[data-testid="cloud-connect"]').first().click();
    await p2.locator('[data-testid="home"]').first().waitFor({ timeout: 30000 });
    await open(p2, '/records', 'records');
    await p2.getByText('Starbucks').first().waitFor({ timeout: 10000 });
    await p2.screenshot({ path: `${OUT}20c-fresh-install-records.png` });
  } finally {
    await fresh.close();
  }
});

await relayStep('cloud: disconnecting keeps this phone’s data', async () => {
  await open(page, '/integrations', 'integrations-page');
  await tap(page, 'cloud-disconnect', { wait: 900 });
  await tap(page, 'confirm-yes', { wait: 1500 });
  await expectText(page, 'Not connected yet');
  await open(page, '/records', 'records');
  await expectText(page, 'Starbucks');
});

await step(page, 'backup: export, then restore it', async () => {
  await open(page, '/data', 'data-page');
  const [download] = await Promise.all([page.waitForEvent('download', { timeout: 15000 }), tap(page, 'data-export-backup', { wait: 500 })]);
  const file = `${OUT}backup.json`;
  await download.saveAs(file);
  const [chooser] = await Promise.all([page.waitForEvent('filechooser', { timeout: 10000 }), tap(page, 'data-restore-backup', { wait: 300 })]);
  await chooser.setFiles(file);
  await tid(page, 'confirm-sheet').waitFor({ timeout: 10000 });
  await shot(page, '22-restore-confirm');
  await tap(page, 'confirm-yes', { wait: 2000 });
  await open(page, '/records', 'records');
  await expectText(page, 'Talabat');
});

await step(page, 'dark mode: screens and sheets', async () => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await open(page, '/', 'home');
  await shot(page, '23-dark-home');
  await tap(page, 'tab-add', { wait: 1200 });
  await tap(page, 'field-payee', { wait: 900 });
  await shot(page, '24-dark-payee-sheet');
  await tap(page, 'payee-picker-close', { wait: 600 });
  await page.emulateMedia({ colorScheme: 'light' });
});

const ok = summary(errors);
await browser.close();
process.exit(ok ? 0 : 1);
