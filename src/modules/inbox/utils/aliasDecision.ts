import { askAlias } from '../../payees/components/AliasPrompt';
import type { ID } from '../../shared/db/types';
import type { Suggestion } from '../data/inboxRepo';

/**
 * Inbox save: decide whether the bank's raw name should become an alias.
 * - Already recognized and unchanged: nothing to ask.
 * - Accepted the suggested name: remember it silently.
 * - Typed or picked a different name: ask "always?".
 */
export async function aliasDecisionForInbox(s: Suggestion, payeeId: ID | null, name: string | null) {
  if (!s.rawName || !payeeId || !name) return null;
  if (s.payee && s.payee.id === payeeId) return null;
  if (!s.payee && s.suggestedName === name) return { raw: s.rawName, payeeId };
  const decision = await askAlias(s.rawName, name, Boolean(s.payee));
  if (!decision) return null;
  return decision.always ? { raw: s.rawName, payeeId, relabelPast: decision.relabelPast } : null;
}
