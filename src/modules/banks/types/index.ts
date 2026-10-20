import type { ParsedMessage, SmsKind } from '../../shared/db/types';

/** What a template reads out of one message; the parser turns it into a `ParsedMessage`. */
export type TemplateMatch = Partial<ParsedMessage> & {
  /** The amount as written, e.g. "1,234.56" (Arabic-Indic digits are normalized first). */
  amountText: string;
  /** ISO code, or "جم" for Egyptian pounds. */
  ccy: string;
};

export type SmsTemplate = {
  kind: SmsKind;
  regex: RegExp;
  map: (m: RegExpMatchArray) => TemplateMatch;
};

export type IgnoreRule = { reason: 'otp' | 'declined' | 'info'; regex: RegExp };

/** A word to put in the iPhone Shortcuts "Message contains" automation. */
export type ShortcutKeyword = { word: string; label: string; testID: string };

/**
 * Everything Mula knows about one bank's SMS alerts. Adding a bank means adding one of these
 * (see docs/adding-a-bank.md); the rest of the app (inbox, matching, accounts by last 4 digits,
 * Shortcuts and Android capture) is bank-neutral.
 */
export type BankDefinition = {
  id: string;
  /** Short display name, e.g. "CIB". */
  name: string;
  /** ISO country code. Empty for the generic fallback. */
  country: string;
  /** Exact SMS sender names (compared case-insensitively). */
  senders: string[];
  templates: SmsTemplate[];
  ignore: IgnoreRule[];
  /** Words that appear in every money message, for the Shortcuts automation. */
  shortcutKeywords: ShortcutKeyword[];
  /** A made-up sample message (shown as the paste placeholder; must parse). */
  example: string;
  notes?: string;
};
