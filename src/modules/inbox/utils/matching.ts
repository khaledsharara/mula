import type { InboxItem, InboxSource, Minor, ParsedMessage } from '../../shared/db/types';
import { parseAmount } from '../../shared/utils/money';
import { normalizeRaw } from '../../shared/utils/text';
import { isOutflow } from './parser';

const MIN = 60_000;

/** Same SMS delivered twice (Shortcuts delivery is at-least-once) produces the same key. */
export function dedupeKey(p: ParsedMessage, source: InboxSource, rawText: string): string {
  if (p.reference) return `${source}|${p.kind}|ref:${p.reference}`;
  const minute = p.occurredAt ? Math.floor(p.occurredAt / MIN) : 'na';
  const who = p.counterparty ? normalizeRaw(p.counterparty) : '';
  return `${source}|${p.kind}|${p.amount}|${p.currency}|${p.last4 ?? ''}|${minute}|${who}|${rawText.length}`;
}

const firstWord = (s: string | null) => (s ? normalizeRaw(s).split(' ')[0] : '');

/**
 * Card holds (Uber/DiDi charge 5 EGP then credit it back): a refund for the same amount
 * from the same merchant within 30 minutes of a charge.
 */
export function isHoldReversal(charge: ParsedMessage, refund: ParsedMessage, windowMin = 30): boolean {
  if (refund.kind !== 'refund' || !isOutflow(charge.kind) || charge.kind === 'instapay_out') return false;
  if (charge.amount !== refund.amount || charge.currency !== refund.currency) return false;
  const a = firstWord(charge.counterparty);
  const b = firstWord(refund.counterparty);
  if (!a || !b || (a !== b && !a.startsWith(b) && !b.startsWith(a))) return false;
  const dt = (refund.occurredAt ?? 0) - (charge.occurredAt ?? 0);
  return dt >= -2 * MIN && dt <= windowMin * MIN;
}

/** An Apple Pay automation entry and a bank SMS describing the same purchase. */
export function isSamePayment(a: ParsedMessage, b: ParsedMessage, windowMin = 10): boolean {
  if (!isOutflow(a.kind) || !isOutflow(b.kind)) return false;
  if (Math.abs(a.amount - b.amount) > Math.max(1, Math.round(a.amount * 0.001))) return false;
  if (a.last4 && b.last4 && a.last4 !== b.last4) return false;
  const dt = Math.abs((a.occurredAt ?? 0) - (b.occurredAt ?? 0));
  return dt <= windowMin * MIN;
}

/** Pending holds to auto-dismiss: returns ids of [charge, refund] pairs. */
export function findHoldPairs(items: InboxItem[]): [string, string][] {
  const pending = items.filter((i) => i.status === 'pending' && i.parsed);
  const refunds = pending.filter((i) => i.parsed!.kind === 'refund');
  const used = new Set<string>();
  const pairs: [string, string][] = [];
  for (const r of refunds) {
    const charge = pending.find((c) => !used.has(c.id) && c.id !== r.id && isHoldReversal(c.parsed!, r.parsed!));
    if (charge) {
      used.add(charge.id);
      pairs.push([charge.id, r.id]);
    }
  }
  return pairs;
}

/** Wallet's Amount as Shortcuts passes it: "EGP 1,250.00", "1.250,00 E£", "١٥٠٫٥٠ ج.م.", "$4.99". */
export function parseWalletAmount(raw: string | number | null | undefined): { amount: Minor; currency: string } {
  const text = String(raw ?? '').trim();
  const digits = text.match(/[0-9٠-٩۰-۹][0-9٠-٩۰-۹.,٫٬\s]*/)?.[0]?.trim() ?? '';
  const amount = Math.abs(parseAmount(digits) ?? 0);
  const currency =
    text.match(/[A-Z]{3}/)?.[0] ??
    (/E£|ج\.?\s?م|جنيه/.test(text) ? 'EGP' : text.includes('€') ? 'EUR' : text.includes('£') ? 'GBP' : text.includes('$') ? 'USD' : 'EGP');
  return { amount, currency };
}

/**
 * Values the Wallet "Transaction" automation passes in. Amount may arrive as "EGP 123.45",
 * "123.45" or 0 (a known iOS glitch); card is the Wallet pass name, e.g. "CIB Debit ••9002".
 */
export function parseWalletTransaction(input: { amount?: string | number | null; merchant?: string | null; card?: string | null }, receivedAt = Date.now()): ParsedMessage | null {
  const { amount, currency: ccy } = parseWalletAmount(input.amount);
  const card = input.card?.trim() || null;
  const last4 = card?.match(/(\d{4})\s*$/)?.[1] ?? null;
  const merchant = input.merchant?.trim() || null;
  if (!amount && !merchant) return null;
  return {
    kind: 'applepay_purchase',
    amount,
    currency: ccy,
    counterparty: merchant,
    last4,
    reference: null,
    occurredAt: receivedAt,
    balance: null,
    balanceCurrency: null,
    // Wallet card names rarely carry digits ("CIB Debit"); match them by name instead.
    accountHint: last4 ? null : card,
  };
}
