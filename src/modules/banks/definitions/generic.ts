import type { BankDefinition } from '../types';
import { clean } from '../utils/patterns';

/**
 * Common English alert wording (for banks switched to English, or ones without a definition yet).
 * Tried after every specific bank. Anything still unmatched with money-movement wording falls back
 * to "Money out" / "Money in" in the parser.
 */
export const GENERIC: BankDefinition = {
  id: 'generic',
  name: 'Other banks',
  country: '',
  senders: [],
  templates: [
    {
      kind: 'card_purchase',
      regex: /(?:charged|debited|purchase of|used for)[^\d]{0,40}?([A-Z]{3})\s*([\d,]+(?:\.\d+)?).*?(?:ending|\*\*)\s*\**(\d{4}).*?\bat\s+(.+?)(?:\s+on\s+|\.|,|$)/is,
      map: (m) => ({ ccy: m[1].toUpperCase(), amountText: m[2], last4: m[3], counterparty: clean(m[4]) }),
    },
    {
      kind: 'instapay_out',
      regex: /(?:instant transfer|instapay|IPN)[^\d]{0,60}?(?:EGP|LE)\s*([\d,]+(?:\.\d+)?).*?(?:from your account|debited).*?(\d{4})/is,
      map: (m) => ({ ccy: 'EGP', amountText: m[1], last4: m[2] }),
    },
    {
      kind: 'instapay_in',
      regex: /(?:instant transfer|instapay|IPN)[^\d]{0,60}?(?:EGP|LE)\s*([\d,]+(?:\.\d+)?).*?(?:to your account|credited).*?(\d{4})(?:.*?from\s+([A-Z][A-Z .'-]+?)(?:\s+ref|\s+on|\.|,|$))?/is,
      map: (m) => ({ ccy: 'EGP', amountText: m[1], last4: m[2], counterparty: clean(m[3]) }),
    },
  ],
  ignore: [
    { reason: 'declined', regex: /declined|was rejected/i },
    { reason: 'otp', regex: /One Time Password|\bOTP\b|Activation Code|IPN PIN|token/i },
    { reason: 'info', regex: /voucher/i },
  ],
  shortcutKeywords: [],
  example: 'Purchase of EGP 123.45 with your card ending 9002 at SAMPLE MARKET on 20/08/26.',
};
