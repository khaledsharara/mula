import type { Minor } from '../../shared/db/types';
import type { FeeRule } from '../../shared/settings/settingsStore';

/**
 * InstaPay fee: a percentage of the amount, clamped to [min, max], rounded to the piastre.
 * With the published tariff (0.1%, EGP 0.50–20): 100 → 0.50, 850 → 0.85, 25,000 → 20.00.
 */
export function instapayFee(amount: Minor, rule: FeeRule): Minor {
  if (amount <= 0) return 0;
  const raw = Math.round((Math.abs(amount) * rule.percent) / 100);
  return Math.min(rule.max, Math.max(rule.min, raw));
}

/** Published per-transaction ceiling (EGP 70,000); larger transfers are rejected by InstaPay. */
export const INSTAPAY_MAX_TRANSFER: Minor = 7_000_000;
