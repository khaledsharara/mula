import { CIB } from './definitions/cib';
import { GENERIC } from './definitions/generic';
import type { BankDefinition, IgnoreRule } from './types';

/**
 * Every bank Mula can read, in the order their templates are tried. Add yours above GENERIC
 * (see docs/adding-a-bank.md).
 */
export const BANKS: readonly BankDefinition[] = [CIB, GENERIC];

/** Banks with their own definition (not the generic fallback). */
export const SUPPORTED_BANKS = BANKS.filter((b) => b.senders.length > 0);

/** "CIB", or "CIB and NBE", for on-screen copy. */
export const SUPPORTED_BANK_NAMES = joinNames(SUPPORTED_BANKS.map((b) => b.name));

/** Every known bank SMS sender name. */
export const BANK_SENDERS: readonly string[] = BANKS.flatMap((b) => b.senders);

const norm = (s: string) => s.trim().toLowerCase();

/** The bank that sends from this SMS sender name, if Mula knows it. */
export function bankForSender(sender: string | null | undefined): BankDefinition | null {
  if (!sender) return null;
  const s = norm(sender);
  return BANKS.find((b) => b.senders.some((x) => norm(x) === s)) ?? null;
}

export function isBankSender(sender: string | null | undefined): boolean {
  return bankForSender(sender) != null;
}

/** Banks in the order to try for a message: the sender's own bank first, then the rest. */
export function banksFor(sender?: string | null): readonly BankDefinition[] {
  const own = bankForSender(sender);
  return own ? [own, ...BANKS.filter((b) => b !== own)] : BANKS;
}

const IGNORE_ORDER: IgnoreRule['reason'][] = ['declined', 'otp', 'info'];

/** Why a message should be skipped (declines first, then codes, then notices), if it should. */
export function ignoreReason(body: string, banks: readonly BankDefinition[] = BANKS): IgnoreRule['reason'] | null {
  for (const reason of IGNORE_ORDER) {
    for (const b of banks) if (b.ignore.some((i) => i.reason === reason && i.regex.test(body))) return reason;
  }
  return null;
}

function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? 'your bank';
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

export type { BankDefinition, IgnoreRule, ShortcutKeyword, SmsTemplate, TemplateMatch } from './types';
export { CIB, GENERIC };
