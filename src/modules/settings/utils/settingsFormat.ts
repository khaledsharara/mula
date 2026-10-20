import type { FeeRule } from '../../shared/settings/settingsStore';
import { parseAmount } from '../../shared/utils/money';

/** "21:00" for the reminder hour stepper. */
export const hourLabel = (h: number): string => `${String(h).padStart(2, '0')}:00`;

/** The InstaPay fee as typed: percent as-is, minimum and maximum in EGP (not piastres). */
export type FeeDraft = { percent: string; min: string; max: string };

const major = (minor: number): string => (minor / 100).toFixed(2);

export function feeDraftFrom(rule: FeeRule): FeeDraft {
  return { percent: String(rule.percent), min: major(rule.min), max: major(rule.max) };
}

export const sameFee = (a: FeeRule, b: FeeRule): boolean => a.percent === b.percent && a.min === b.min && a.max === b.max;

export type FeeCheck =
  | { rule: FeeRule; problem: null; field: null }
  | { rule: null; problem: string; field: 'percent' | 'amounts' };

/** Validates a draft; returns the rule in minor units, or what's wrong and where. */
export function parseFeeDraft(d: FeeDraft): FeeCheck {
  const percent = Number(d.percent.trim().replace(',', '.'));
  if (!d.percent.trim() || !Number.isFinite(percent) || percent < 0 || percent > 10) {
    return { rule: null, problem: 'Use a percent between 0 and 10.', field: 'percent' };
  }
  const min = parseAmount(d.min.trim() || '0');
  const max = parseAmount(d.max.trim() || '0');
  if (min == null || max == null || min < 0 || max < 0) return { rule: null, problem: 'Enter the minimum and maximum in EGP.', field: 'amounts' };
  if (max < min) return { rule: null, problem: 'The maximum can’t be lower than the minimum.', field: 'amounts' };
  return { rule: { percent, min, max }, problem: null, field: null };
}
