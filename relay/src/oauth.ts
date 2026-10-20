/**
 * Sign-in for Claude (OAuth 2.1, as Claude's custom connectors expect it): Claude registers itself
 * (dynamic client registration), sends you to /authorize, where you approve with the relay's
 * OWNER_PASSWORD, and then uses short-lived access tokens it refreshes on its own.
 * Tokens and codes are stored only as SHA-256 hashes. See
 * https://claude.com/docs/connectors/building/authentication for what Claude requires.
 */
import { all, first, run } from '../../src/modules/shared/db/client';

const ACCESS_TTL = 60 * 60 * 1000;
const REFRESH_TTL = 30 * 24 * 60 * 60 * 1000;
const CODE_TTL = 2 * 60 * 1000;
const REQUEST_TTL = 15 * 60 * 1000;
const MAX_CLIENTS = 50;
const MAX_FAILURES_PER_HOUR = 10;
// Anyone can reach these endpoints, and each call writes a row. Caps keep a stranger from using
// up the free plan's daily writes (which would stop your sync until the next day).
const MAX_REGISTRATIONS_PER_HOUR = 20;
const MAX_OPEN_SIGN_INS = 30;
export const SCOPE = 'mula';

export async function installOAuthSchema(): Promise<void> {
  await run(`CREATE TABLE IF NOT EXISTS oauth_clients (
    id TEXT PRIMARY KEY NOT NULL, name TEXT, redirect_uris TEXT NOT NULL, created_at INTEGER NOT NULL)`);
  await run(`CREATE TABLE IF NOT EXISTS oauth_grants (
    hash TEXT PRIMARY KEY NOT NULL, kind TEXT NOT NULL, client_id TEXT NOT NULL, data TEXT, expires_at INTEGER NOT NULL)`);
  await run('CREATE TABLE IF NOT EXISTS oauth_failures (at INTEGER NOT NULL)');
}

/* ---------- Helpers ---------- */

const b64url = (bytes: ArrayBuffer | Uint8Array): string =>
  btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

const randomToken = (bytes = 32) => b64url(crypto.getRandomValues(new Uint8Array(bytes)));

async function sha256(text: string): Promise<string> {
  return b64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)));
}

export async function sameSecret(given: string, expected: string | undefined, minLength = 8): Promise<boolean> {
  if (!expected || expected.length < minLength || !given) return false;
  const enc = new TextEncoder();
  const [a, b] = await Promise.all([crypto.subtle.digest('SHA-256', enc.encode(given)), crypto.subtle.digest('SHA-256', enc.encode(expected))]);
  return crypto.subtle.timingSafeEqual(a, b);
}

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers } });

const oauthError = (error: string, description: string, status = 400) => json({ error, error_description: description }, status);

/* ---------- Discovery ---------- */

export function protectedResourceMetadata(origin: string): Response {
  return json({
    resource: `${origin}/mcp`,
    authorization_servers: [origin],
    scopes_supported: [SCOPE],
    bearer_methods_supported: ['header'],
    resource_name: 'Mula',
  });
}

export function authorizationServerMetadata(origin: string): Response {
  return json({
    issuer: origin,
    authorization_endpoint: `${origin}/authorize`,
    token_endpoint: `${origin}/oauth/token`,
    registration_endpoint: `${origin}/oauth/register`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    code_challenge_methods_supported: ['S256'],
    token_endpoint_auth_methods_supported: ['none'],
    scopes_supported: [SCOPE, 'offline_access'],
  });
}

/** The 401 that starts Claude's sign-in. */
export function unauthorized(origin: string, invalidToken: boolean): Response {
  const challenge = `Bearer resource_metadata="${origin}/.well-known/oauth-protected-resource", scope="${SCOPE}"${invalidToken ? ', error="invalid_token"' : ''}`;
  return json({ error: 'unauthorized', message: 'Sign in to Mula first.' }, 401, { 'WWW-Authenticate': challenge });
}

/* ---------- Clients ---------- */

const HOSTED_CALLBACKS = new Set(['https://claude.ai/api/mcp/auth_callback', 'https://claude.com/api/mcp/auth_callback']);

/** Claude's hosted apps, or a loopback address on any port (Claude Code, local tests). */
function allowedRedirect(uri: string): boolean {
  if (HOSTED_CALLBACKS.has(uri)) return true;
  try {
    const u = new URL(uri);
    return u.protocol === 'http:' && (u.hostname === 'localhost' || u.hostname === '127.0.0.1') && !u.username && !u.password;
  } catch {
    return false;
  }
}

/** Loopback redirects match without the port (RFC 8252 §7.3). */
function redirectMatches(registered: string[], uri: string): boolean {
  if (registered.includes(uri)) return true;
  try {
    const u = new URL(uri);
    if (u.hostname !== 'localhost' && u.hostname !== '127.0.0.1') return false;
    return registered.some((r) => {
      const v = new URL(r);
      return v.protocol === u.protocol && v.hostname === u.hostname && v.pathname === u.pathname;
    });
  } catch {
    return false;
  }
}

type Client = { id: string; name: string | null; redirectUris: string[] };

async function getClient(id: string): Promise<Client | null> {
  const r = await first<{ id: string; name: string | null; redirect_uris: string }>('SELECT * FROM oauth_clients WHERE id = ?', [id]);
  return r ? { id: r.id, name: r.name, redirectUris: JSON.parse(r.redirect_uris) as string[] } : null;
}

export async function register(request: Request): Promise<Response> {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return oauthError('invalid_client_metadata', 'Send the registration as JSON');
  }
  const uris = Array.isArray(body.redirect_uris) ? body.redirect_uris.filter((u): u is string => typeof u === 'string') : [];
  if (!uris.length || uris.length > 10) return oauthError('invalid_redirect_uri', 'redirect_uris is required');
  const bad = uris.find((u) => !allowedRedirect(u));
  if (bad) return oauthError('invalid_redirect_uri', `This relay only signs in Claude; ${bad} is not one of Claude's callback addresses`);
  if (body.token_endpoint_auth_method && body.token_endpoint_auth_method !== 'none') {
    return oauthError('invalid_client_metadata', 'Only public clients (token_endpoint_auth_method "none") are supported');
  }
  const now = Date.now();
  const recent = (await first<{ n: number }>('SELECT COUNT(*) AS n FROM oauth_clients WHERE created_at > ?', [now - 3_600_000]))?.n ?? 0;
  if (recent >= MAX_REGISTRATIONS_PER_HOUR) return oauthError('temporarily_unavailable', 'Too many registrations; try again in an hour', 429);
  const id = randomToken(16);
  const name = typeof body.client_name === 'string' ? body.client_name.slice(0, 80) : null;
  await run('INSERT INTO oauth_clients (id, name, redirect_uris, created_at) VALUES (?, ?, ?, ?)', [id, name, JSON.stringify(uris), now]);
  // Claude registers again on every fresh connection; keep the newest few.
  await run('DELETE FROM oauth_clients WHERE id IN (SELECT id FROM oauth_clients ORDER BY created_at DESC LIMIT -1 OFFSET ?)', [MAX_CLIENTS]);
  return json(
    {
      client_id: id,
      client_id_issued_at: Math.floor(now / 1000),
      client_name: name ?? undefined,
      redirect_uris: uris,
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      token_endpoint_auth_method: 'none',
    },
    201,
  );
}

/* ---------- Authorize ---------- */

type AuthRequest = { clientId: string; redirectUri: string; state: string | null; challenge: string; scope: string };

const escape = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

function page(title: string, body: string, status = 200): Response {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(title)}</title><style>
:root{color-scheme:light dark;--bg:#F6F5F1;--ink:#16161A;--muted:#6B6B70;--line:#DDDBD4;--accent:#2F45D0;--danger:#C2412D}
@media (prefers-color-scheme:dark){:root{--bg:#121214;--ink:#F2F1EC;--muted:#9A9AA0;--line:#2A2A2E;--accent:#7F90FF;--danger:#FF7A66}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.5 -apple-system,system-ui,sans-serif;padding:32px 16px}
main{max-width:420px;margin:0 auto}h1{font-size:24px;line-height:1.25;margin:0 0 12px}p{color:var(--muted);margin:0 0 16px}
ul{color:var(--muted);padding-left:20px;margin:0 0 20px}label{display:block;font-weight:600;margin:0 0 6px}
input{width:100%;font:inherit;padding:12px 14px;border:1px solid var(--line);border-radius:12px;background:transparent;color:var(--ink)}
.row{display:flex;gap:10px;margin-top:16px}button{flex:1;font:inherit;font-weight:600;padding:12px;border-radius:12px;border:1px solid var(--line);background:transparent;color:var(--ink)}
button.primary{background:var(--accent);border-color:var(--accent);color:#fff}.err{color:var(--danger);font-weight:600}.mark{width:44px;height:44px;border-radius:11px;background:linear-gradient(160deg,#3B56EA,#2235B4);margin-bottom:20px}
</style></head><body><main><div class="mark" aria-hidden="true"></div>${body}</main></body></html>`;
  return new Response(html, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Frame-Options': 'DENY',
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; form-action 'self' https://claude.ai https://claude.com http://localhost:* http://127.0.0.1:*; frame-ancestors 'none'",
      'Referrer-Policy': 'no-referrer',
    },
  });
}

function redirectWith(uri: string, params: Record<string, string | null>): Response {
  const u = new URL(uri);
  for (const [k, v] of Object.entries(params)) if (v != null) u.searchParams.set(k, v);
  return new Response(null, { status: 302, headers: { Location: u.toString(), 'Cache-Control': 'no-store' } });
}

function consentPage(requestId: string, client: Client, redirectUri: string, error: string | null): Response {
  const who = client.name ? escape(client.name) : 'Claude';
  const host = escape(new URL(redirectUri).host);
  return page(
    'Allow Claude to use Mula?',
    `<h1>Allow ${who} to use Mula?</h1>
<p>${who} (returning to <strong>${host}</strong>) will be able to read and change everything in your Mula cloud copy:</p>
<ul><li>transactions, accounts, categories and payees</li><li>planned payments, templates and debts</li><li>your review inbox, including bank message text</li></ul>
<p>Changes show up on your phone the next time Mula syncs, and you can undo them in Mula under Automation › Claude.</p>
<form method="post" action="/authorize"><input type="hidden" name="request" value="${escape(requestId)}">
<label for="password">Relay password</label><input id="password" name="password" type="password" autocomplete="current-password" autofocus>
${error ? `<p class="err" role="alert">${escape(error)}</p>` : ''}
<div class="row"><button type="submit" name="action" value="deny">Deny</button><button class="primary" type="submit" name="action" value="allow">Allow</button></div></form>`,
  );
}

export async function authorizePage(url: URL, ownerPassword: string | undefined): Promise<Response> {
  if (!ownerPassword || ownerPassword.length < 8) {
    return page('Relay not ready', '<h1>Set a password first</h1><p>This relay has no OWNER_PASSWORD yet (at least 8 characters). Add it as a secret and deploy again; see docs/cloud-and-claude.md in the Mula repository.</p>', 503);
  }
  const q = url.searchParams;
  const client = await getClient(q.get('client_id') ?? '');
  const redirectUri = q.get('redirect_uri') ?? '';
  // Without a known client and redirect, never redirect anywhere.
  if (!client || !redirectMatches(client.redirectUris, redirectUri)) {
    return page('Sign-in link not valid', '<h1>This sign-in link isn’t valid</h1><p>Remove the Mula connector in Claude and add it again.</p>', 400);
  }
  const state = q.get('state');
  if (q.get('response_type') !== 'code') return redirectWith(redirectUri, { error: 'unsupported_response_type', state });
  const challenge = q.get('code_challenge') ?? '';
  if (!challenge || q.get('code_challenge_method') !== 'S256') {
    return redirectWith(redirectUri, { error: 'invalid_request', error_description: 'PKCE with S256 is required', state });
  }
  const open = (await first<{ n: number }>("SELECT COUNT(*) AS n FROM oauth_grants WHERE kind = 'request' AND expires_at > ?", [Date.now()]))?.n ?? 0;
  if (open >= MAX_OPEN_SIGN_INS) return page('Too many sign-ins', '<h1>Too many sign-ins at once</h1><p>Try again in 15 minutes.</p>', 429);
  const requestId = randomToken();
  const data: AuthRequest = { clientId: client.id, redirectUri, state, challenge, scope: SCOPE };
  await run('INSERT INTO oauth_grants (hash, kind, client_id, data, expires_at) VALUES (?, ?, ?, ?, ?)', [
    await sha256(requestId),
    'request',
    client.id,
    JSON.stringify(data),
    Date.now() + REQUEST_TTL,
  ]);
  return consentPage(requestId, client, redirectUri, null);
}

async function recentFailures(): Promise<number> {
  await run('DELETE FROM oauth_failures WHERE at < ?', [Date.now() - 3_600_000]);
  return (await first<{ n: number }>('SELECT COUNT(*) AS n FROM oauth_failures'))?.n ?? 0;
}

export async function authorizeSubmit(request: Request, ownerPassword: string | undefined, origin: string): Promise<Response> {
  const form = await readForm(request);
  const requestId = form.request ?? '';
  const hash = await sha256(requestId);
  const row = await first<{ data: string; expires_at: number }>("SELECT data, expires_at FROM oauth_grants WHERE hash = ? AND kind = 'request'", [hash]);
  if (!row || row.expires_at < Date.now()) {
    return page('Sign-in expired', '<h1>This sign-in expired</h1><p>Go back to Claude and connect Mula again.</p>', 400);
  }
  const req = JSON.parse(row.data) as AuthRequest;
  const client = await getClient(req.clientId);
  if (!client) return page('Sign-in link not valid', '<h1>This sign-in link isn’t valid</h1><p>Remove the Mula connector in Claude and add it again.</p>', 400);

  if (form.action !== 'allow') {
    await run('DELETE FROM oauth_grants WHERE hash = ?', [hash]);
    return redirectWith(req.redirectUri, { error: 'access_denied', state: req.state, iss: origin });
  }
  if ((await recentFailures()) >= MAX_FAILURES_PER_HOUR) {
    return consentPage(requestId, client, req.redirectUri, 'Too many wrong passwords. Try again in an hour.');
  }
  if (!(await sameSecret(form.password ?? '', ownerPassword))) {
    await run('INSERT INTO oauth_failures (at) VALUES (?)', [Date.now()]);
    return consentPage(requestId, client, req.redirectUri, 'That password isn’t right.');
  }

  await run('DELETE FROM oauth_grants WHERE hash = ?', [hash]);
  const code = randomToken();
  await run('INSERT INTO oauth_grants (hash, kind, client_id, data, expires_at) VALUES (?, ?, ?, ?, ?)', [
    await sha256(code),
    'code',
    client.id,
    JSON.stringify(req),
    Date.now() + CODE_TTL,
  ]);
  return redirectWith(req.redirectUri, { code, state: req.state, iss: origin });
}

/* ---------- Tokens ---------- */

async function issueTokens(clientId: string, family: string): Promise<Response> {
  const now = Date.now();
  await run('DELETE FROM oauth_grants WHERE expires_at < ?', [now]);
  const access = randomToken();
  const refresh = randomToken();
  await run('INSERT INTO oauth_grants (hash, kind, client_id, data, expires_at) VALUES (?, ?, ?, ?, ?)', [await sha256(access), 'access', clientId, JSON.stringify({ family }), now + ACCESS_TTL]);
  await run('INSERT INTO oauth_grants (hash, kind, client_id, data, expires_at) VALUES (?, ?, ?, ?, ?)', [await sha256(refresh), 'refresh', clientId, JSON.stringify({ family }), now + REFRESH_TTL]);
  return json({ access_token: access, token_type: 'Bearer', expires_in: ACCESS_TTL / 1000, refresh_token: refresh, scope: SCOPE });
}

async function readForm(request: Request): Promise<Record<string, string>> {
  const type = request.headers.get('content-type') ?? '';
  if (type.includes('application/json')) {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    return Object.fromEntries(Object.entries(body).map(([k, v]) => [k, String(v ?? '')]));
  }
  const text = await request.text();
  return Object.fromEntries(new URLSearchParams(text));
}

export async function token(request: Request): Promise<Response> {
  const p = await readForm(request);
  const client = p.client_id ? await getClient(p.client_id) : null;
  if (!client) return oauthError('invalid_client', 'Unknown client; register again', 401);

  if (p.grant_type === 'authorization_code') {
    const hash = await sha256(p.code ?? '');
    const row = await first<{ client_id: string; data: string; expires_at: number }>("SELECT client_id, data, expires_at FROM oauth_grants WHERE hash = ? AND kind = 'code'", [hash]);
    // Codes work once, even when the exchange fails.
    if (row) await run('DELETE FROM oauth_grants WHERE hash = ?', [hash]);
    if (!row || row.expires_at < Date.now() || row.client_id !== client.id) return oauthError('invalid_grant', 'The code is invalid or expired');
    const req = JSON.parse(row.data) as AuthRequest;
    if (p.redirect_uri && p.redirect_uri !== req.redirectUri) return oauthError('invalid_grant', 'redirect_uri does not match');
    if (!p.code_verifier || (await sha256(p.code_verifier)) !== req.challenge) return oauthError('invalid_grant', 'PKCE verification failed');
    return issueTokens(client.id, randomToken(12));
  }

  if (p.grant_type === 'refresh_token') {
    const hash = await sha256(p.refresh_token ?? '');
    const row = await first<{ client_id: string; data: string; expires_at: number }>("SELECT client_id, data, expires_at FROM oauth_grants WHERE hash = ? AND kind = 'refresh'", [hash]);
    if (!row || row.expires_at < Date.now() || row.client_id !== client.id) return oauthError('invalid_grant', 'The refresh token is invalid or expired');
    // Rotation: the old refresh token stops working as soon as the new one is issued.
    await run('DELETE FROM oauth_grants WHERE hash = ?', [hash]);
    const { family } = JSON.parse(row.data ?? '{}') as { family?: string };
    return issueTokens(client.id, family ?? randomToken(12));
  }

  return oauthError('unsupported_grant_type', 'Use authorization_code or refresh_token');
}

/** Whether a bearer token from Claude is a live access token. */
export async function validAccessToken(authorization: string | null): Promise<boolean> {
  const raw = (authorization ?? '').replace(/^Bearer\s+/i, '').trim();
  if (!raw) return false;
  const row = await first<{ expires_at: number }>("SELECT expires_at FROM oauth_grants WHERE hash = ? AND kind = 'access'", [await sha256(raw)]);
  return Boolean(row && row.expires_at > Date.now());
}

/** Signs Claude out everywhere (Automation › Claude › Sign Claude out). */
export async function revokeAll(): Promise<number> {
  const n = (await first<{ n: number }>("SELECT COUNT(*) AS n FROM oauth_grants WHERE kind IN ('access', 'refresh')"))?.n ?? 0;
  await run('DELETE FROM oauth_grants');
  await run('DELETE FROM oauth_clients');
  // You signed in to the app to do this, so a lockout from wrong passwords is lifted too.
  await run('DELETE FROM oauth_failures');
  return n;
}

export async function connectedClients(): Promise<number> {
  const rows = await all<{ n: number }>("SELECT COUNT(DISTINCT client_id) AS n FROM oauth_grants WHERE kind = 'refresh' AND expires_at > ?", [Date.now()]);
  return rows[0]?.n ?? 0;
}
