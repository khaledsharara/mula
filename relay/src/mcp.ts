/** MCP over Streamable HTTP: stateless, JSON responses (no server-initiated streams). */
import { UndoError } from './changes';
import { InputError, type Tool, type ToolContext, type ToolResult } from './tools/shared';
import { readTools } from './tools/read';
import { writeTools } from './tools/write';

const PROTOCOL_VERSIONS = ['2025-11-25', '2025-06-18', '2025-03-26', '2024-11-05'];

const INSTRUCTIONS =
  'Mula is the user’s personal budgeting app; this connector reads and changes its data directly. ' +
  'Start with get_overview, and use get_catalog for the exact account, category and payee names and ids. ' +
  'Amounts are in major units (45.5, not 4550) and dates in the user’s time zone. ' +
  'Changes take effect immediately and reach the phone the next time Mula syncs; every change can be undone ' +
  '(list_claude_changes, undo_claude_change, or Automation › Claude in the app). Tell the user what you changed, ' +
  'and confirm with them before deleting records or changing many records at once if their request was ambiguous. ' +
  'The data is as of the phone’s last sync (phone_last_synced in get_overview).';

const TOOLS: Tool[] = [...readTools, ...writeTools];
const BY_NAME = new Map(TOOLS.map((t) => [t.name, t]));

type RpcMessage = { jsonrpc?: unknown; id?: unknown; method?: unknown; params?: unknown };
type RpcResponse = { jsonrpc: '2.0'; id: unknown; result?: unknown; error?: { code: number; message: string } };

const rpcResult = (id: unknown, result: unknown): RpcResponse => ({ jsonrpc: '2.0', id, result });
const rpcError = (id: unknown, code: number, message: string): RpcResponse => ({ jsonrpc: '2.0', id, error: { code, message } });

export async function handleMcp(request: Request, ctx: ToolContext, beforeTool: () => Promise<void>): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(rpcError(null, -32700, 'Parse error'), { status: 400 });
  }
  const messages = (Array.isArray(body) ? body : [body]) as RpcMessage[];
  const responses: RpcResponse[] = [];
  for (const message of messages) {
    const response = await handleMessage(message, ctx, beforeTool);
    if (response) responses.push(response);
  }
  // Only notifications or responses came in: acknowledge without a body.
  if (!responses.length) return new Response(null, { status: 202 });
  return Response.json(Array.isArray(body) ? responses : responses[0]);
}

async function handleMessage(m: RpcMessage, ctx: ToolContext, beforeTool: () => Promise<void>): Promise<RpcResponse | null> {
  if (!m || typeof m !== 'object' || m.jsonrpc !== '2.0') return rpcError(null, -32600, 'Invalid request');
  const isRequest = typeof m.method === 'string' && m.id !== undefined && m.id !== null;
  if (!isRequest) return null;
  const params = (m.params && typeof m.params === 'object' ? m.params : {}) as Record<string, unknown>;

  switch (m.method) {
    case 'initialize': {
      const asked = typeof params.protocolVersion === 'string' ? params.protocolVersion : '';
      return rpcResult(m.id, {
        protocolVersion: PROTOCOL_VERSIONS.includes(asked) ? asked : PROTOCOL_VERSIONS[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: 'mula', title: 'Mula', version: '2.0.0' },
        instructions: INSTRUCTIONS,
      });
    }
    case 'ping':
      return rpcResult(m.id, {});
    case 'tools/list':
      return rpcResult(m.id, { tools: TOOLS.map(({ run: _run, ...t }) => t) });
    case 'tools/call': {
      const tool = BY_NAME.get(String(params.name ?? ''));
      if (!tool) return rpcResult(m.id, failure(`Unknown tool: ${String(params.name)}`));
      const args = params.arguments && typeof params.arguments === 'object' && !Array.isArray(params.arguments) ? (params.arguments as Record<string, unknown>) : {};
      await beforeTool();
      return rpcResult(m.id, await callTool(tool, args, ctx));
    }
    default:
      return rpcError(m.id, -32601, `Method not found: ${String(m.method)}`);
  }
}

const failure = (message: string): ToolResult => ({ content: [{ type: 'text', text: message }], isError: true });

async function callTool(tool: Tool, args: Record<string, unknown>, ctx: ToolContext): Promise<ToolResult> {
  try {
    return await tool.run(args, ctx);
  } catch (e) {
    // Problems with the call go back to Claude so it can fix them; nothing was changed.
    if (e instanceof InputError || e instanceof UndoError) return failure(`${e.message} (nothing was changed)`);
    console.error('tool failed', tool.name, e);
    return failure(`Mula couldn’t do that: ${e instanceof Error ? e.message : String(e)} (nothing was changed)`);
  }
}
