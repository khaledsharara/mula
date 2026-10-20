/**
 * The local relay for the browser tests (`cd relay && npm run dev`), and a stand-in for Claude:
 * it signs in the way Claude does (registration, consent with the relay password, PKCE) and
 * calls the MCP tools.
 */
import { createHash, randomBytes } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';

export const RELAY = process.env.MULA_RELAY ?? 'http://127.0.0.1:8787';

const file = new URL('../../relay/.dev.vars', import.meta.url);
export const relayVars = existsSync(file)
  ? Object.fromEntries(
      readFileSync(file, 'utf8')
        .split(/\r?\n/)
        .filter((l) => l.includes('=') && !l.startsWith('#'))
        .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
    )
  : {};

export const relayUp = async () => Boolean(relayVars.APP_TOKEN) && (await fetch(`${RELAY}/health`).then((r) => r.ok).catch(() => false));

/** What the app does, without the app: the relay's sync API. */
export async function relayApp(path, init = {}) {
  const res = await fetch(`${RELAY}${path}`, { ...init, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${relayVars.APP_TOKEN}`, ...(init.headers ?? {}) } });
  return res.json();
}

const b64url = (buf) => buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

let access = null;

async function signIn() {
  const redirect = 'http://localhost:33420/callback';
  const reg = await (await fetch(`${RELAY}/oauth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_name: 'Claude (test)', redirect_uris: [redirect] }) })).json();
  const verifier = b64url(randomBytes(32));
  const challenge = b64url(createHash('sha256').update(verifier).digest());
  const q = new URLSearchParams({ response_type: 'code', client_id: reg.client_id, redirect_uri: redirect, code_challenge: challenge, code_challenge_method: 'S256', state: 'e2e' });
  const page = await (await fetch(`${RELAY}/authorize?${q}`)).text();
  const request = /name="request" value="([^"]+)"/.exec(page)?.[1];
  const submit = await fetch(`${RELAY}/authorize`, {
    method: 'POST',
    redirect: 'manual',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ request, password: relayVars.OWNER_PASSWORD, action: 'allow' }).toString(),
  });
  const code = new URL(submit.headers.get('location')).searchParams.get('code');
  const tokens = await (
    await fetch(`${RELAY}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'authorization_code', code, client_id: reg.client_id, redirect_uri: redirect, code_verifier: verifier }).toString(),
    })
  ).json();
  access = tokens.access_token;
}

/** Calls one of Claude's tools; returns its parsed result, or throws with the error text. */
export async function claude(name, args = {}) {
  if (!access) await signIn();
  const res = await fetch(`${RELAY}/mcp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream', Authorization: `Bearer ${access}` },
    body: JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method: 'tools/call', params: { name, arguments: args } }),
  });
  const { result } = await res.json();
  const text = result?.content?.[0]?.text ?? '';
  if (result?.isError) throw new Error(`${name}: ${text}`);
  return JSON.parse(text);
}
