#!/usr/bin/env node
/**
 * Checks a relay end to end.
 *
 *   node scripts/smoke.mjs                       full test against `npm run dev` (http://localhost:8787)
 *   node scripts/smoke.mjs https://…workers.dev  read-only checks on a deployed relay (never changes data)
 *
 * Secrets come from APP_TOKEN / OWNER_PASSWORD, or relay/.dev.vars for a local relay.
 * The full test erases the local relay's data first; it refuses to run against anything but localhost.
 */
import { createHash, randomBytes } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = (process.argv[2] ?? 'http://localhost:8787').replace(/\/+$/, '');
const LOCAL = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(BASE);

const vars = {};
const devVars = join(dirname(fileURLToPath(import.meta.url)), '..', '.dev.vars');
if (LOCAL && existsSync(devVars)) {
  for (const line of readFileSync(devVars, 'utf8').split(/\r?\n/)) {
    const m = /^([A-Z_]+)=(.*)$/.exec(line.trim());
    if (m) vars[m[1]] = m[2];
  }
}
const APP_TOKEN = process.env.APP_TOKEN || vars.APP_TOKEN || '';
const OWNER_PASSWORD = process.env.OWNER_PASSWORD || vars.OWNER_PASSWORD || '';

let passed = 0;
let failed = 0;
async function check(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ok   ${name}`);
  } catch (e) {
    failed++;
    console.log(`  FAIL ${name}\n       ${e instanceof Error ? e.message : e}`);
  }
}
function assert(cond, message) {
  if (!cond) throw new Error(message);
}

async function http(path, init = {}) {
  const res = await fetch(`${BASE}${path}`, { redirect: 'manual', ...init });
  const text = await res.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { status: res.status, headers: res.headers, body, text };
}

const app = (path, init = {}, token = APP_TOKEN) =>
  http(path, { ...init, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(init.headers ?? {}) } });

/* ---------- Read-only checks (safe on a live relay) ---------- */

console.log(`Relay at ${BASE}${LOCAL ? ' (local: full test)' : ' (read-only checks)'}`);

await check('health', async () => {
  const r = await http('/health');
  assert(r.status === 200 && r.body?.ok === true, `got ${r.status} ${r.text}`);
});

await check('/mcp without a token starts sign-in (401 + resource metadata)', async () => {
  const r = await http('/mcp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  assert(r.status === 401, `status ${r.status}`);
  const challenge = r.headers.get('www-authenticate') ?? '';
  assert(challenge.includes(`resource_metadata="${BASE}/.well-known/oauth-protected-resource"`), `WWW-Authenticate: ${challenge}`);
});

await check('protected resource metadata', async () => {
  const r = await http('/.well-known/oauth-protected-resource');
  assert(r.body?.resource === `${BASE}/mcp`, `resource ${r.body?.resource}`);
  assert(r.body?.authorization_servers?.[0] === BASE, 'authorization_servers');
});

await check('authorization server metadata', async () => {
  const r = await http('/.well-known/oauth-authorization-server');
  assert(r.body?.issuer === BASE, 'issuer');
  assert(r.body?.registration_endpoint === `${BASE}/oauth/register`, 'registration_endpoint');
  assert(r.body?.code_challenge_methods_supported?.includes('S256'), 'S256');
  assert(r.body?.token_endpoint_auth_methods_supported?.includes('none'), 'public clients');
});

await check('registration rejects a non-Claude redirect', async () => {
  const r = await http('/oauth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ redirect_uris: ['https://evil.example/cb'] }) });
  assert(r.status === 400 && r.body?.error === 'invalid_redirect_uri', `${r.status} ${r.text}`);
});

await check('sync needs the app token', async () => {
  const none = await http('/sync/status');
  const wrong = await app('/sync/status', {}, 'wrong-token-wrong-token');
  assert(none.status === 401 && wrong.status === 401, `${none.status} / ${wrong.status}`);
});

if (APP_TOKEN) {
  await check('sync status with the app token', async () => {
    const r = await app('/sync/status');
    assert(r.status === 200 && typeof r.body?.datasetId === 'string', `${r.status} ${r.text}`);
  });
}

if (!LOCAL) {
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

/* ---------- Full test (local relay only) ---------- */

assert(APP_TOKEN && OWNER_PASSWORD, 'Set APP_TOKEN and OWNER_PASSWORD (or create relay/.dev.vars from .dev.vars.example)');

const now = Date.now();
const DAY = 86_400_000;
const cat = (key, name, parent, kind = 'expense', nature = 'none') => ({
  id: `cat_${key}`, parent_id: parent ? `cat_${parent}` : null, name, kind, icon: 'tag', color: '#8A8A8F', nature, system_key: key, archived: 0, sort_order: 0,
});
const categories = [
  cat('food', 'Food & Drinks', null),
  cat('food.cafe', 'Bar, cafe', 'food', 'expense', 'want'),
  cat('food.groceries', 'Groceries', 'food', 'expense', 'need'),
  cat('food.restaurant', 'Restaurant, fast-food', 'food', 'expense', 'want'),
  cat('transport', 'Transportation', null),
  cat('transport.taxi', 'Taxi', 'transport', 'expense', 'need'),
  cat('financial', 'Financial expenses', null),
  cat('financial.fees', 'Charges, Fees', 'financial', 'expense', 'need'),
  cat('others', 'Others', null),
  cat('others.missing', 'Missing', 'others'),
  cat('income', 'Income', null, 'income'),
  cat('income.wage', 'Wage, invoices', 'income', 'income'),
  cat('income.refunds', 'Refunds (tax, purchase)', 'income', 'income'),
];
const account = (id, name, type, payment, identifiers = []) => ({
  id, name, type, currency: 'EGP', initial_balance: 100_000, color: '#2F45D0', icon: 'landmark', default_payment_type: payment,
  identifiers: JSON.stringify(identifiers), bank_balance: null, bank_balance_at: null, exclude_from_stats: 0, archived: 0, sort_order: 0, created_at: now - 30 * DAY,
});
const tx = (id, fields) => ({
  id, type: 'expense', amount: 0, currency: 'EGP', account_id: 'acc_cib', to_account_id: null, to_amount: null, category_id: null, payee_id: null,
  payment_type: 'debit_card', date: now - DAY, note: null, is_instapay: 0, parent_id: null, nature_override: null, original_amount: null,
  original_currency: null, fx_rate: null, base_amount: 0, recurring_id: null, debt_id: null, source: 'manual', source_ref: null,
  created_at: now - DAY, updated_at: now - DAY, ...fields,
});
const SMS = 'تم خصم مبلغ  EGP 234.56 من بطاقة الخصم المباشر المنتهية بـ **9002 عند CARREFOUR SAMPLE في 18/10/26 10:31 ، الرصيد المتاح 98.76 EGP';
const rows = [
  ['settings', 'baseCurrency', { key: 'baseCurrency', value: '"EGP"' }],
  ['settings', 'timeZone', { key: 'timeZone', value: '"Africa/Cairo"' }],
  ...categories.map((c) => ['categories', c.id, c]),
  ['accounts', 'acc_cib', account('acc_cib', 'CIB', 'bank', 'debit_card', ['9002'])],
  ['accounts', 'acc_cash', account('acc_cash', 'Cash', 'cash', 'cash')],
  ['payees', 'pay_uber', { id: 'pay_uber', name: 'Uber', kind: 'merchant', default_category_id: 'cat_transport.taxi', default_account_id: 'acc_cib', auto_confirm: 0, note: null, created_at: now - 20 * DAY, last_used_at: now - DAY }],
  ['payee_aliases', 'UBER', { raw: 'UBER', payee_id: 'pay_uber', created_at: now - 20 * DAY }],
  ['transactions', 'tx_uber1', tx('tx_uber1', { amount: 15_000, base_amount: 15_000, payee_id: 'pay_uber', category_id: 'cat_transport.taxi', date: now - 3 * DAY })],
  ['transactions', 'tx_uber2', tx('tx_uber2', { amount: 9_000, base_amount: 9_000, payee_id: 'pay_uber', category_id: 'cat_others.missing', date: now - 2 * DAY })],
  ['transactions', 'tx_wage', tx('tx_wage', { type: 'income', amount: 2_000_000, base_amount: 2_000_000, category_id: 'cat_income.wage', payment_type: 'bank_transfer', date: now - 10 * DAY })],
  [
    'inbox_items',
    'inb_1',
    {
      id: 'inb_1', source: 'sms', raw_text: SMS, received_at: now - 3_600_000, status: 'pending', transaction_id: null, recurring_id: null,
      dedupe_key: 'sms|test|1', note: null, resolved_at: null,
      parsed: JSON.stringify({ kind: 'card_purchase', amount: 23_456, currency: 'EGP', counterparty: 'CARREFOUR SAMPLE', last4: '9002', reference: null, occurredAt: now - 3_600_000, balance: 9_876, balanceCurrency: 'EGP' }),
    },
  ],
];
const changes = rows.map(([tbl, pk, row]) => ({ tbl, pk, at: now - DAY, row }));

let dataset = '';
let cursorA = 0;
const DEVICE_A = 'device-a';
const DEVICE_B = 'device-b';

await check('reset empties the cloud copy', async () => {
  // Start signed out, so earlier runs' registrations and wrong passwords don't count.
  await app('/sync/sign-out-claude', { method: 'POST', body: '{}' });
  const r = await app('/sync/reset', { method: 'POST', body: '{}' });
  assert(r.status === 200 && r.body.empty === true, r.text);
  dataset = r.body.datasetId;
  cursorA = r.body.rev;
});

await check('device A uploads its data', async () => {
  const r = await app('/sync/push', { method: 'POST', body: JSON.stringify({ deviceId: DEVICE_A, datasetId: dataset, changes }) });
  assert(r.status === 200 && r.body.applied === changes.length && r.body.skipped === 0, r.text);
});

await check('push to a replaced cloud copy is refused (409)', async () => {
  const r = await app('/sync/push', { method: 'POST', body: JSON.stringify({ deviceId: DEVICE_A, datasetId: 'old', changes: [] }) });
  assert(r.status === 409 && r.body.error === 'dataset_changed', r.text);
});

await check('malformed changes are refused', async () => {
  const r = await app('/sync/push', { method: 'POST', body: JSON.stringify({ deviceId: DEVICE_A, datasetId: dataset, changes: [{ tbl: 'oauth_grants', pk: 'x', at: 1, row: null }] }) });
  assert(r.status === 400, r.text);
});

await check('device B gets everything; device A gets nothing back', async () => {
  const b = await app(`/sync/pull?since=0&device=${DEVICE_B}`);
  assert(b.body.changes.length === changes.length, `B got ${b.body.changes.length}`);
  const a = await app(`/sync/pull?since=${cursorA}&device=${DEVICE_A}`);
  assert(a.body.changes.length === 0, `A got ${a.body.changes.length}`);
  cursorA = a.body.next;
});

/* ---------- Claude signs in ---------- */

const b64url = (buf) => buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const REDIRECT = 'http://localhost:33418/callback';
let clientId = '';
let access = '';
let refresh = '';

async function authorize(password) {
  const verifier = b64url(randomBytes(32));
  const challenge = b64url(createHash('sha256').update(verifier).digest());
  const q = new URLSearchParams({ response_type: 'code', client_id: clientId, redirect_uri: REDIRECT, code_challenge: challenge, code_challenge_method: 'S256', state: 'st8', scope: 'mula' });
  const page = await http(`/authorize?${q}`);
  assert(page.status === 200 && page.text.includes('Allow'), `consent page ${page.status}`);
  const requestId = /name="request" value="([^"]+)"/.exec(page.text)?.[1];
  assert(requestId, 'request id on the page');
  const submit = await http('/authorize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ request: requestId, password, action: 'allow' }).toString(),
  });
  return { submit, verifier, requestId };
}

await check('Claude registers (dynamic client registration)', async () => {
  const r = await http('/oauth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_name: 'Claude', redirect_uris: ['http://localhost/callback'] }) });
  assert(r.status === 201 && r.body.client_id && r.body.token_endpoint_auth_method === 'none', r.text);
  clientId = r.body.client_id;
});

await check('a wrong password is rejected on the consent page', async () => {
  const { submit } = await authorize('not-the-password');
  assert(submit.status === 200 && submit.text.includes('isn’t right'), `status ${submit.status}`);
});

await check('a wrong PKCE verifier fails, and the code then stops working', async () => {
  const { submit } = await authorize(OWNER_PASSWORD);
  const loc = new URL(submit.headers.get('location'));
  const code = loc.searchParams.get('code');
  const bad = await http('/oauth/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'authorization_code', code, client_id: clientId, redirect_uri: REDIRECT, code_verifier: 'nope' }).toString() });
  assert(bad.status === 400 && bad.body.error === 'invalid_grant', bad.text);
});

await check('the right password returns a code; the code becomes tokens', async () => {
  const { submit, verifier } = await authorize(OWNER_PASSWORD);
  assert(submit.status === 302, `status ${submit.status}`);
  const loc = new URL(submit.headers.get('location'));
  assert(loc.origin + loc.pathname === 'http://localhost:33418/callback' && loc.searchParams.get('state') === 'st8' && loc.searchParams.get('iss') === BASE, loc.toString());
  const r = await http('/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'authorization_code', code: loc.searchParams.get('code'), client_id: clientId, redirect_uri: REDIRECT, code_verifier: verifier }).toString(),
  });
  assert(r.status === 200 && r.body.access_token && r.body.refresh_token && r.body.token_type === 'Bearer', r.text);
  access = r.body.access_token;
  refresh = r.body.refresh_token;
});

await check('refresh tokens rotate', async () => {
  const body = (t) => new URLSearchParams({ grant_type: 'refresh_token', refresh_token: t, client_id: clientId }).toString();
  const r = await http('/oauth/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body(refresh) });
  assert(r.status === 200 && r.body.refresh_token !== refresh, r.text);
  const again = await http('/oauth/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body(refresh) });
  assert(again.status === 400 && again.body.error === 'invalid_grant', `old refresh token: ${again.text}`);
  access = r.body.access_token;
  refresh = r.body.refresh_token;
});

/* ---------- Claude's tools ---------- */

let rpcId = 0;
async function rpc(method, params = {}) {
  const r = await http('/mcp', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream', Authorization: `Bearer ${access}` }, body: JSON.stringify({ jsonrpc: '2.0', id: ++rpcId, method, params }) });
  assert(r.status === 200, `${method}: HTTP ${r.status} ${r.text}`);
  assert(!r.body.error, `${method}: ${JSON.stringify(r.body.error)}`);
  return r.body.result;
}
async function tool(name, args = {}, { expectError = false } = {}) {
  const result = await rpc('tools/call', { name, arguments: args });
  const text = result.content?.[0]?.text ?? '';
  if (expectError) {
    assert(result.isError, `${name} should have failed but returned ${text.slice(0, 300)}`);
    return text;
  }
  assert(!result.isError, `${name}: ${text}`);
  return JSON.parse(text);
}

await check('initialize and list tools', async () => {
  const init = await rpc('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'smoke', version: '1' } });
  assert(init.protocolVersion === '2025-06-18' && init.serverInfo.name === 'mula', JSON.stringify(init));
  const { tools } = await rpc('tools/list');
  const names = tools.map((t) => t.name);
  for (const n of ['get_overview', 'find_transactions', 'add_transactions', 'update_transactions', 'delete_transactions', 'review_inbox', 'run_query', 'undo_claude_change']) {
    assert(names.includes(n), `missing ${n}`);
  }
  assert(tools.length >= 20, `${tools.length} tools`);
});

await check('get_overview', async () => {
  const o = await tool('get_overview');
  assert(o.base_currency === 'EGP' && o.time_zone === 'Africa/Cairo', JSON.stringify(o).slice(0, 200));
  assert(o.accounts.length === 2 && o.review_inbox.waiting === 1, JSON.stringify(o.accounts));
});

let added;
await check('add_transactions: names, local time, transfer, InstaPay fee', async () => {
  const r = await tool('add_transactions', {
    transactions: [
      { amount: 85, payee: 'Starbucks', category: 'Bar, cafe', account: 'CIB', date: '2026-10-10 09:15' },
      { type: 'transfer', amount: 500, account: 'CIB', to_account: 'Cash' },
      { amount: 850, payee: 'Nour', payee_kind: 'person', account: 'CIB', instapay: true, category: 'Groceries', note: 'Groceries run' },
    ],
  });
  added = r.added;
  assert(added.length === 3 && r.change_id, JSON.stringify(r).slice(0, 300));
  assert(added[0].date === '2026-10-10 09:15' && added[0].category === 'Food & Drinks › Bar, cafe', JSON.stringify(added[0]));
  assert(added[1].to_account === 'Cash', JSON.stringify(added[1]));
  assert(added[2].fee === 0.85 && added[2].payment === 'instapay', JSON.stringify(added[2]));
});

await check('a bad call reports the problem and changes nothing', async () => {
  const before = (await tool('run_query', { sql: 'SELECT COUNT(*) AS n FROM transactions' })).rows[0].n;
  const msg = await tool('add_transactions', { transactions: [{ amount: 10, account: 'CIB', category: 'Groceries' }, { amount: 5, account: 'Nowhere' }] }, { expectError: true });
  assert(msg.includes('transactions[1]') && msg.includes('nothing was changed'), msg);
  const after = (await tool('run_query', { sql: 'SELECT COUNT(*) AS n FROM transactions' })).rows[0].n;
  assert(before === after, `${before} -> ${after}`);
});

await check('find_transactions and update_transactions (bulk re-categorize)', async () => {
  const uber = await tool('find_transactions', { payee: 'Uber' });
  assert(uber.count === 2, JSON.stringify(uber).slice(0, 300));
  const r = await tool('update_transactions', { updates: uber.transactions.map((t) => ({ id: t.id, category: 'Taxi' })) });
  assert(r.updated.every((t) => t.category === 'Transportation › Taxi'), JSON.stringify(r.updated));
  const coffee = await tool('find_transactions', { search: 'Starbucks' });
  const e = await tool('update_transactions', { updates: [{ id: coffee.transactions[0].id, amount: 90, category: 'Restaurant, fast-food', note: 'with Sara' }] });
  assert(e.updated[0].amount === 90 && e.updated[0].note === 'with Sara', JSON.stringify(e.updated[0]));
});

await check('spending_report counts fees as spending and skips transfers', async () => {
  const r = await tool('spending_report', { period: 'all_time', group_by: 'category' });
  const by = Object.fromEntries(r.groups.map((g) => [g.label, g.amount]));
  assert(by['Food & Drinks'] === 940 && by['Financial expenses'] === 0.85 && by.Transportation === 240, JSON.stringify(r.groups));
  assert(r.total === 1180.85, `total ${r.total}`);
});

await check('run_query is read-only', async () => {
  await tool('run_query', { sql: 'DELETE FROM transactions' }, { expectError: true });
  const sneaky = await tool('run_query', { sql: 'WITH x AS (SELECT 1) DELETE FROM transactions' }, { expectError: true });
  assert(sneaky.includes('read-only'), sneaky);
  await tool('run_query', { sql: 'SELECT * FROM oauth_grants' }, { expectError: true });
  const n = (await tool('run_query', { sql: 'SELECT COUNT(*) AS n FROM transactions WHERE parent_id IS NULL' })).rows[0].n;
  assert(n === 6, `transactions left: ${n}`);
});

await check('review_inbox: suggestion, then confirm with a new payee name', async () => {
  const inbox = await tool('list_review_inbox');
  assert(inbox.waiting === 1 && inbox.items[0].suggestion.account === 'CIB' && inbox.items[0].suggestion.amount === 234.56, JSON.stringify(inbox.items[0]?.suggestion));
  const r = await tool('review_inbox', { items: [{ id: inbox.items[0].id, action: 'confirm', payee: 'Carrefour', category: 'Groceries' }] });
  assert(r.results[0].confirmed.payee === 'Carrefour' && r.results[0].confirmed.category === 'Food & Drinks › Groceries', JSON.stringify(r.results[0]));
  const after = await tool('list_review_inbox');
  assert(after.waiting === 0, `still waiting: ${after.waiting}`);
  const catalog = await tool('get_catalog');
  assert(catalog.payees.find((p) => p.name === 'Carrefour')?.bank_names?.includes('CARREFOUR SAMPLE'), 'bank name remembered');
});

await check('delete_transactions, then undo it', async () => {
  const coffee = await tool('find_transactions', { search: 'Starbucks' });
  const del = await tool('delete_transactions', { ids: [coffee.transactions[0].id] });
  assert(del.deleted.length === 1, JSON.stringify(del));
  assert((await tool('find_transactions', { search: 'Starbucks' })).count === 0, 'still there');
  const undo = await tool('undo_claude_change', { change_id: del.change_id });
  assert(undo.records_restored === 1, JSON.stringify(undo));
  const back = await tool('find_transactions', { search: 'Starbucks' });
  assert(back.count === 1 && back.transactions[0].amount === 90, JSON.stringify(back));
  await tool('undo_claude_change', { change_id: del.change_id }, { expectError: true });
});

await check('manage accounts, categories, payees', async () => {
  await tool('manage_accounts', { action: 'create', name: 'Savings', type: 'savings', starting_balance: 1000 });
  await tool('manage_accounts', { action: 'archive', account: 'Savings' });
  await tool('manage_accounts', { action: 'unarchive', account: 'Savings' });
  const c = await tool('manage_categories', { action: 'create', name: 'Coffee beans', parent: 'Food & Drinks', nature: 'want' });
  assert(c.created.path === 'Food & Drinks › Coffee beans', JSON.stringify(c));
  await tool('manage_categories', { action: 'archive', category: 'Charges, Fees' }, { expectError: true });
  await tool('manage_payees', { action: 'update', payee: 'Nour', name: 'Nour Test', usual_category: 'Groceries' });
  await tool('manage_payees', { action: 'add_bank_name', payee: 'Nour Test', bank_name: 'NOUR TEST PERSON' });
  await tool('manage_payees', { action: 'create', payee: 'Starbucks Sample St' });
  const m = await tool('manage_payees', { action: 'merge', payee: 'Starbucks Sample St', into: 'Starbucks' });
  assert(m.merged === 'Starbucks Sample St', JSON.stringify(m));
});

await check('planned payments and templates', async () => {
  const r = await tool('manage_planned_payments', { action: 'create', name: 'Rent', amount: 12000, account: 'CIB', category: 'Groceries', frequency: 'monthly', start_date: '2026-01-01' });
  assert(r.planned_payment.next_due && r.skipped_past_dates > 0, JSON.stringify(r));
  await tool('manage_planned_payments', { action: 'pause', id: r.planned_payment.id });
  await tool('manage_planned_payments', { action: 'create_template', name: 'Coffee', amount: 85, account: 'CIB', category: 'Bar, cafe', payee: 'Starbucks' });
  const list = await tool('list_planned_payments');
  assert(list.planned_payments[0].active === false && list.templates.length === 1, JSON.stringify(list).slice(0, 300));
});

await check('planned payment charged in another currency keeps it through edits', async () => {
  await tool('manage_accounts', { action: 'create', name: 'Dollar card', type: 'bank', currency: 'USD' });
  const r = await tool('manage_planned_payments', {
    action: 'create', name: 'Streaming', amount: 250, currency: 'EGP', account: 'Dollar card', category: 'Groceries', frequency: 'monthly', start_date: '2027-01-15',
  });
  const id = r.planned_payment.id;
  await tool('manage_planned_payments', { action: 'update', id, name: 'Video streaming' });
  const t = await tool('manage_planned_payments', { action: 'create_template', name: 'Cloud storage', amount: 100, currency: 'EGP', account: 'Dollar card', category: 'Groceries' });
  await tool('manage_planned_payments', { action: 'update_template', id: t.template.id, name: 'Cloud' });
  const list = await tool('list_planned_payments');
  const p = list.planned_payments.find((x) => x.id === id);
  assert(p?.name === 'Video streaming' && p.currency === 'EGP', JSON.stringify(p));
  assert(list.templates.find((x) => x.id === t.template.id)?.currency === 'EGP', JSON.stringify(list.templates));
  await tool('manage_planned_payments', { action: 'update', id, currency: 'XYZ' }, { expectError: true });
  // Following the account again: setting it back to the account's currency.
  await tool('manage_planned_payments', { action: 'update', id, currency: 'USD' });
  const after = await tool('list_planned_payments');
  assert(after.planned_payments.find((x) => x.id === id)?.currency === 'USD', 'back to USD');
});

await check('debts: lend over InstaPay (fee is spending), repay', async () => {
  const d = await tool('manage_debts', { action: 'create', direction: 'lent', person: 'Ahmed', amount: 1500, account: 'CIB', instapay: true });
  const fees = await tool('run_query', { sql: "SELECT amount FROM transactions WHERE parent_id IN (SELECT id FROM transactions WHERE debt_id = ?)", params: [d.debt.id] });
  assert(fees.rows[0]?.amount === 150, JSON.stringify(fees));
  const r = await tool('manage_debts', { action: 'repay', id: d.debt.id, amount: 500 });
  assert(r.remaining === 1000 && r.status === 'open', JSON.stringify(r));
});

await check('update_settings', async () => {
  const r = await tool('update_settings', { merge_window_minutes: 15 });
  assert(r.merge_window_minutes === 15, JSON.stringify(r));
});

/* ---------- Back to the phone ---------- */

await check('device A pulls Claude’s changes', async () => {
  const r = await app(`/sync/pull?since=${cursorA}&device=${DEVICE_A}&limit=1000`);
  assert(r.body.changes.length > 10 && r.body.fromClaude === r.body.changes.length, `${r.body.changes.length} changes, ${r.body.fromClaude} from Claude`);
  const inbox = r.body.changes.find((c) => c.tbl === 'inbox_items' && c.pk === 'inb_1');
  assert(inbox?.row?.status === 'confirmed', 'inbox item confirmed');
  assert(r.body.changes.some((c) => c.tbl === 'settings' && c.pk === 'mergeWindowMinutes' && c.row.value === '15'), 'setting synced');
  cursorA = r.body.next;
});

await check('an older phone edit loses to Claude’s newer one, and comes back down', async () => {
  const stale = { tbl: 'transactions', pk: 'tx_uber2', at: now - DAY, row: tx('tx_uber2', { amount: 9_000, base_amount: 9_000, payee_id: 'pay_uber', category_id: 'cat_others.missing', date: now - 2 * DAY }) };
  const push = await app('/sync/push', { method: 'POST', body: JSON.stringify({ deviceId: DEVICE_A, datasetId: dataset, changes: [stale] }) });
  assert(push.body.skipped === 1, push.text);
  const pull = await app(`/sync/pull?since=${cursorA}&device=${DEVICE_A}`);
  const row = pull.body.changes.find((c) => c.pk === 'tx_uber2')?.row;
  assert(row?.category_id === 'cat_transport.taxi', JSON.stringify(row));
  cursorA = pull.body.next;
});

await check('a newer phone edit wins', async () => {
  const fresh = { tbl: 'transactions', pk: 'tx_uber2', at: Date.now() + 1000, row: tx('tx_uber2', { amount: 9_500, base_amount: 9_500, payee_id: 'pay_uber', category_id: 'cat_transport.taxi', date: now - 2 * DAY, note: 'airport' }) };
  const push = await app('/sync/push', { method: 'POST', body: JSON.stringify({ deviceId: DEVICE_A, datasetId: dataset, changes: [fresh] }) });
  assert(push.body.applied === 1, push.text);
  const found = await tool('find_transactions', { search: 'airport' });
  assert(found.count === 1 && found.transactions[0].amount === 95, JSON.stringify(found));
});

await check('activity and undo from the app', async () => {
  const a = await app('/sync/activity');
  assert(a.body.activity.length >= 10, `${a.body.activity.length} changes`);
  const settingsChange = a.body.activity.find((x) => x.tool === 'update_settings');
  const u = await app('/sync/undo', { method: 'POST', body: JSON.stringify({ id: settingsChange.id }) });
  assert(u.status === 200 && u.body.restored === 1, u.text);
  const again = await app('/sync/undo', { method: 'POST', body: JSON.stringify({ id: settingsChange.id }) });
  assert(again.status === 400, again.text);
});

await check('undo leaves records edited again since alone', async () => {
  const a = await app('/sync/activity?limit=100');
  const recat = a.body.activity.find((x) => x.tool === 'update_transactions' && x.summary.includes('2 transactions'));
  const u = await app('/sync/undo', { method: 'POST', body: JSON.stringify({ id: recat.id }) });
  // tx_uber1 (and the payee's learned defaults) go back; tx_uber2 was edited on the phone since.
  assert(u.body.restored >= 1 && u.body.skipped === 1, u.text);
  const rows = await app(`/sync/pull?since=0&device=${DEVICE_B}&limit=1000`);
  const latest = (pk) => rows.body.changes.filter((c) => c.pk === pk).pop()?.row;
  assert(latest('tx_uber1')?.category_id === 'cat_transport.taxi' && latest('tx_uber2')?.note === 'airport', 'restored the untouched record only');
});

await check('signing Claude out revokes its tokens', async () => {
  const r = await app('/sync/sign-out-claude', { method: 'POST', body: '{}' });
  assert(r.status === 200 && r.body.revoked >= 1, r.text);
  const mcp = await http('/mcp', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${access}` }, body: '{}' });
  assert(mcp.status === 401, `status ${mcp.status}`);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
