/**
 * The Durable Object that holds the cloud copy of Mula's data in its own SQLite database, and
 * answers every request: sync from the app, Claude's MCP calls and Claude's sign-in.
 * The app's data code (src/modules/**) runs here as-is through the expo-sqlite shim.
 */
import { DurableObject } from 'cloudflare:workers';

import { getDb } from '../../src/modules/shared/db/client';
import { loadSettings } from '../../src/modules/shared/settings/settingsStore';
import { installServerSchema, listActivity, undoChange, UndoError } from './changes';
import { handleMcp } from './mcp';
import * as oauth from './oauth';
import { bindStorage } from './shims/expo-sqlite';
import * as sync from './sync';
import { InputError } from './tools/shared';

export interface Env {
  VAULT: DurableObjectNamespace<Vault>;
  /** Bearer token the Mula app uses for /sync (MULA_APP_TOKEN). */
  APP_TOKEN: string;
  /** What you type to let Claude in (MULA_OWNER_PASSWORD). */
  OWNER_PASSWORD: string;
}

const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, Mcp-Protocol-Version, Mcp-Session-Id',
  'Access-Control-Expose-Headers': 'WWW-Authenticate',
  'Access-Control-Max-Age': '86400',
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

export class Vault extends DurableObject<Env> {
  /** Requests run one at a time, so a sync never interleaves with a tool call. */
  private queue: Promise<unknown> = Promise.resolve();

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    bindStorage(ctx.storage);
    void ctx.blockConcurrencyWhile(async () => {
      await getDb();
      await installServerSchema();
      await oauth.installOAuthSchema();
      await loadSettings();
    });
  }

  private serial<T>(fn: () => Promise<T>): Promise<T> {
    const next = this.queue.then(fn, fn);
    this.queue = next.catch(() => undefined);
    return next;
  }

  async fetch(request: Request): Promise<Response> {
    const response = await this.serial(() => this.route(request)).catch((e: unknown) => {
      console.error('request failed', e);
      return json({ error: 'internal', message: 'The relay hit an error' }, 500);
    });
    const url = new URL(request.url);
    if (url.pathname.startsWith('/sync/') || url.pathname.startsWith('/.well-known/') || url.pathname.startsWith('/oauth/') || url.pathname === '/mcp') {
      const headers = new Headers(response.headers);
      for (const [k, v] of Object.entries(CORS)) headers.set(k, v);
      return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
    }
    return response;
  }

  /** Read-only SQL for Claude's run_query: anything that writes is rolled back. */
  private readOnlyQuery = (query: string, params: unknown[]): Record<string, unknown>[] => {
    let rows: Record<string, unknown>[] = [];
    try {
      this.ctx.storage.transactionSync(() => {
        const cursor = this.ctx.storage.sql.exec(query, ...params);
        rows = cursor.toArray() as Record<string, unknown>[];
        if (cursor.rowsWritten > 0) throw new ReadOnlyViolation();
      });
    } catch (e) {
      if (e instanceof ReadOnlyViolation) throw new InputError('run_query is read-only; that statement tried to write (it was rolled back)');
      throw new InputError(`SQL error: ${e instanceof Error ? e.message : String(e)}`);
    }
    return rows;
  };

  private async route(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const origin = url.origin;
    const path = url.pathname.replace(/\/+$/, '') || '/';
    const method = request.method;

    if (method === 'OPTIONS') return new Response(null, { status: 204 });
    if (path === '/' || path === '/health') return json({ ok: true, service: 'mula-relay' });

    // Claude's sign-in.
    if (path === '/.well-known/oauth-protected-resource' || path === '/.well-known/oauth-protected-resource/mcp') return oauth.protectedResourceMetadata(origin);
    if (path === '/.well-known/oauth-authorization-server' || path === '/.well-known/openid-configuration') return oauth.authorizationServerMetadata(origin);
    if (path === '/oauth/register' && method === 'POST') return oauth.register(request);
    if (path === '/authorize' && method === 'GET') return oauth.authorizePage(url, this.env.OWNER_PASSWORD);
    if (path === '/authorize' && method === 'POST') return oauth.authorizeSubmit(request, this.env.OWNER_PASSWORD, origin);
    if (path === '/oauth/token' && method === 'POST') return oauth.token(request);

    // Claude.
    if (path === '/mcp') {
      const auth = request.headers.get('authorization');
      if (!(await oauth.validAccessToken(auth))) return oauth.unauthorized(origin, Boolean(auth));
      if (method !== 'POST') return new Response('Method not allowed', { status: 405, headers: { Allow: 'POST' } });
      return handleMcp(request, { query: this.readOnlyQuery }, () => loadSettings());
    }

    // The Mula app.
    if (path.startsWith('/sync/')) {
      const token = (request.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
      if (!(await oauth.sameSecret(token, this.env.APP_TOKEN, 16))) return json({ error: 'unauthorized', message: 'Wrong app token' }, 401);
      try {
        return await this.syncRoute(path, method, request, url);
      } catch (e) {
        if (e instanceof sync.SyncError) return json({ error: e.code, message: e.message }, e.status);
        if (e instanceof UndoError) return json({ error: 'undo_failed', message: e.message }, 400);
        throw e;
      }
    }

    return new Response('Not found', { status: 404 });
  }

  private async syncRoute(path: string, method: string, request: Request, url: URL): Promise<Response> {
    const body = async () => (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (path === '/sync/status' && method === 'GET') return json({ ...(await sync.status()), claudeConnected: (await oauth.connectedClients()) > 0 });
    if (path === '/sync/push' && method === 'POST') return json(await sync.push(await body()));
    if (path === '/sync/pull' && method === 'GET') {
      const q = url.searchParams;
      return json(await sync.pull(Number(q.get('since') ?? 0), q.get('device') ?? '', Number(q.get('limit') ?? 500)));
    }
    if (path === '/sync/reset' && method === 'POST') return json(await sync.reset());
    if (path === '/sync/activity' && method === 'GET') return json({ activity: await listActivity(Number(url.searchParams.get('limit') ?? 50)) });
    if (path === '/sync/undo' && method === 'POST') {
      const id = (await body())?.id;
      if (typeof id !== 'string') throw new sync.SyncError(400, 'bad_request', 'id is required');
      return json(await undoChange(id));
    }
    if (path === '/sync/sign-out-claude' && method === 'POST') return json({ revoked: await oauth.revokeAll() });
    return json({ error: 'not_found', message: 'Unknown sync endpoint' }, 404);
  }
}

class ReadOnlyViolation extends Error {}
