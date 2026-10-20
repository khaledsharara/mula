import { banksFor, ignoreReason } from '../../banks';
import { normalizeDigits, toMinorText } from '../../banks/utils/patterns';
import type { ParsedMessage, SmsKind } from '../../shared/db/types';

/**
 * Turns a bank SMS alert into a transaction candidate. The bank-specific formats live in
 * src/modules/banks; this tries the sender's bank first (when known), then every other bank,
 * then a generic "money out / money in" fallback.
 */

export type ParseResult =
  | { status: 'transaction'; parsed: ParsedMessage }
  | { status: 'ignored'; reason: 'otp' | 'declined' | 'info' }
  | { status: 'unrecognized' };

/** Generic fallback: any "debit/credit" wording with an amount still reaches the inbox. */
const GENERIC_AMOUNT = /(?:([A-Z]{3})\s*([\d,]+(?:\.\d{1,2})?)|([\d,]+(?:\.\d{1,2})?)\s*(EGP|USD|EUR|GBP|SAR|AED|جم|جنيه))/;
const DEBIT_WORDS = /تم خصم|تم سحب|من حسابك|debited|charged|withdraw|purchase|paid/i;
const CREDIT_WORDS = /تم إيداع|تم ايداع|إلى حسابك|الى حسابك|تم اضافة|تم إضافة|credited|received|deposit|refund/i;

export function parseBankSms(text: string, receivedAt: number = Date.now(), opts: { sender?: string | null } = {}): ParseResult {
  const body = normalizeDigits(text).replace(/ /g, ' ');
  const banks = banksFor(opts.sender);

  for (const bank of banks) {
    for (const t of bank.templates) {
      const m = body.match(t.regex);
      if (!m) continue;
      const { amountText, ccy, ...rest } = t.map(m);
      const amount = toMinorText(amountText);
      if (amount == null) continue;
      return {
        status: 'transaction',
        parsed: {
          kind: t.kind,
          amount,
          currency: ccy === 'جم' ? 'EGP' : ccy,
          counterparty: rest.counterparty ?? null,
          last4: rest.last4 ?? null,
          reference: rest.reference ?? null,
          occurredAt: rest.occurredAt ?? receivedAt,
          balance: rest.balance ?? null,
          balanceCurrency: rest.balanceCurrency ?? null,
        },
      };
    }
  }

  const ignored = ignoreReason(body, banks);
  if (ignored) return { status: 'ignored', reason: ignored };

  const amt = body.match(GENERIC_AMOUNT);
  const isDebit = DEBIT_WORDS.test(body);
  const isCredit = CREDIT_WORDS.test(body);
  if (amt && (isDebit || isCredit)) {
    const amount = toMinorText(amt[2] ?? amt[3]);
    const currency = amt[1] ?? (amt[4] === 'جم' || amt[4] === 'جنيه' ? 'EGP' : amt[4]);
    if (amount != null && currency) {
      const last4 = body.match(/\*{2,}\s*(\d{4})/)?.[1] ?? null;
      return {
        status: 'transaction',
        parsed: {
          kind: isDebit && !isCredit ? 'unknown_debit' : 'unknown_credit',
          amount,
          currency,
          counterparty: null,
          last4,
          reference: null,
          occurredAt: receivedAt,
          balance: null,
          balanceCurrency: null,
        },
      };
    }
  }

  // Money-movement wording but no amount we can read: let the user look at it.
  if ((isDebit || isCredit) && /\d+\.\d{2}/.test(body)) return { status: 'unrecognized' };
  // Marketing, notices and anything else without money movement.
  return { status: 'ignored', reason: 'info' };
}

/** Whether a kind moves money out of the account. */
export const isOutflow = (k: SmsKind): boolean =>
  k === 'card_purchase' || k === 'applepay_purchase' || k === 'instapay_out' || k === 'atm_withdrawal' || k === 'unknown_debit';

export const SMS_KIND_LABEL: Record<SmsKind, string> = {
  card_purchase: 'Card payment',
  applepay_purchase: 'Apple Pay',
  instapay_out: 'InstaPay sent',
  instapay_in: 'InstaPay received',
  atm_withdrawal: 'ATM withdrawal',
  cash_deposit: 'Cash deposit',
  refund: 'Refund',
  unknown_debit: 'Money out',
  unknown_credit: 'Money in',
};

/* ---------- display names ---------- */

const GATEWAYS = /^(?:PAYMOBS?|PAYTABS|GEIDEAE?|KASHIER|ACCEPT|EASYKASH|OPAY|PAYSKY|FAWRYPAY|PAY\s?MOB)\s+/i;

/**
 * Turns a bank's merchant string into a friendlier first guess:
 * "PAYMOB  Sample Coffee Co" -> "Sample Coffee Co", "SAMPLE DONUTS  100200" -> "Sample Donuts", "GAMESTORE COM 1002003" -> "Gamestore Com".
 */
export function suggestPayeeName(raw: string): string {
  let s = raw.replace(/\s+/g, ' ').trim().replace(GATEWAYS, '');
  s = s
    .split(' ')
    .filter((tok, i, arr) => !(i > 0 && i === arr.length - 1 && /\d{3,}|^\d+[A-Z]*$/i.test(tok)))
    .join(' ')
    .replace(/\s+\d{3,}\b.*$/, '')
    .trim();
  if (!s) s = raw.trim();
  const isAllCaps = s === s.toUpperCase() && /[A-Z]/.test(s);
  return isAllCaps ? s.toLowerCase().replace(/(^|[\s(/&-])([a-z])/g, (_, sep: string, ch: string) => sep + ch.toUpperCase()) : s;
}
