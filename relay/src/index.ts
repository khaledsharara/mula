/**
 * Mula relay: the cloud copy of Mula's data, which Claude reads and changes as a remote MCP
 * server (custom connector at /mcp, signed in with OAuth) and the Mula app keeps in sync (/sync,
 * with MULA_APP_TOKEN). Everything lives in one SQLite-backed Durable Object (vault.ts), which the
 * Workers free plan includes; this Worker only hands requests to it.
 */
import type { Env } from './vault';

export { Vault } from './vault';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Read the body here: the Durable Object may answer (e.g. 401) without reading it, and a
    // body still streaming after the response breaks the connection.
    const body = request.method === 'GET' || request.method === 'HEAD' ? undefined : await request.arrayBuffer();
    const forwarded = new Request(request.url, { method: request.method, headers: request.headers, body, redirect: 'manual' });
    return env.VAULT.get(env.VAULT.idFromName('mula')).fetch(forwarded);
  },
} satisfies ExportedHandler<Env>;
