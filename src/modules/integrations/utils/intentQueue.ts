/**
 * What the Shortcuts actions (native/ios/MulaIntents.swift) leave in Documents/intents: one JSON
 * object per run. Kept free of native imports so it can be unit tested.
 */
export type QueuedIntent =
  | { kind: 'sms'; text: string; sender: string | null; receivedAt: number }
  | { kind: 'applepay'; amount: string; merchant: string | null; card: string | null; receivedAt: number };

const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null);

/** Parses one queued file; null when it's not something Mula can use. */
export function parseQueuedIntent(text: string, fallbackTime: number): QueuedIntent | null {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const at = typeof o.receivedAt === 'number' && Number.isFinite(o.receivedAt) && o.receivedAt > 0 ? o.receivedAt : fallbackTime;
  if (o.kind === 'sms') {
    const body = str(o.text);
    return body ? { kind: 'sms', text: body, sender: str(o.sender), receivedAt: at } : null;
  }
  if (o.kind === 'applepay') {
    const amount = str(o.amount);
    return amount ? { kind: 'applepay', amount, merchant: str(o.merchant), card: str(o.card), receivedAt: at } : null;
  }
  return null;
}
