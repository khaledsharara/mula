import { CIB_SMS } from './cib';
import { GENERIC_SMS } from './generic';

/** Sample messages per bank id. Every template of every bank must match at least one of them. */
export const BANK_FIXTURES: Record<string, Record<string, string>> = {
  cib: CIB_SMS,
  generic: GENERIC_SMS,
};

export { CIB_SMS, GENERIC_SMS };
