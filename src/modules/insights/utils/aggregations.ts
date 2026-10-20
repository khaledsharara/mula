import { eachDayOfInterval, endOfDay, format, startOfDay, startOfMonth, subMonths } from 'date-fns';

import type { Category, ID, Minor, Nature, Transaction } from '../../shared/db/types';

/**
 * Pure statistics over transactions. Spending excludes transfers, debt movements and
 * accounts flagged "exclude from stats"; fee rows count as spending (they are real costs).
 * All sums use `baseAmount` so mixed currencies add up in EGP.
 */

export type StatsContext = {
  categories: Map<ID, Category>;
  excludedAccounts: Set<ID>;
};

export const isSpend = (t: Transaction, ctx: StatsContext): boolean =>
  t.type === 'expense' && !t.debtId && !ctx.excludedAccounts.has(t.accountId);

export const isEarn = (t: Transaction, ctx: StatsContext): boolean =>
  t.type === 'income' && !t.debtId && !ctx.excludedAccounts.has(t.accountId);

export function natureOf(t: Transaction, ctx: StatsContext): Nature {
  if (t.natureOverride) return t.natureOverride;
  const cat = t.categoryId ? ctx.categories.get(t.categoryId) : undefined;
  if (!cat) return 'none';
  if (cat.nature !== 'none' || !cat.parentId) return cat.nature;
  return ctx.categories.get(cat.parentId)?.nature ?? 'none';
}

export type Totals = { spent: Minor; earned: Minor; net: Minor; count: number };

export function totals(txs: Transaction[], ctx: StatsContext): Totals {
  let spent = 0;
  let earned = 0;
  let count = 0;
  for (const t of txs) {
    if (isSpend(t, ctx)) {
      spent += t.baseAmount;
      if (!t.parentId) count++;
    } else if (isEarn(t, ctx)) {
      earned += t.baseAmount;
      count++;
    }
  }
  return { spent, earned, net: earned - spent, count };
}

export type NatureSplit = Record<Nature, Minor>;

export function natureSplit(txs: Transaction[], ctx: StatsContext): NatureSplit {
  const out: NatureSplit = { need: 0, want: 0, saving: 0, none: 0 };
  for (const t of txs) if (isSpend(t, ctx)) out[natureOf(t, ctx)] += t.baseAmount;
  return out;
}

export type CategorySlice = { id: ID; name: string; color: string; icon: string; amount: Minor; count: number };

/** Spending per top-level category (or per subcategory when `parentId` is given), largest first. */
export function byCategory(txs: Transaction[], ctx: StatsContext, parentId?: ID | null): CategorySlice[] {
  const map = new Map<ID, CategorySlice>();
  for (const t of txs) {
    if (!isSpend(t, ctx)) continue;
    const cat = t.categoryId ? ctx.categories.get(t.categoryId) : undefined;
    let key: Category | undefined;
    if (parentId) {
      if (!cat || (cat.parentId !== parentId && cat.id !== parentId)) continue;
      key = cat;
    } else {
      key = cat?.parentId ? ctx.categories.get(cat.parentId) : cat;
    }
    const id = key?.id ?? 'uncategorized';
    const slice = map.get(id) ?? {
      id,
      name: key ? (parentId && key.id === parentId ? `${key.name} (general)` : key.name) : 'Uncategorized',
      color: key?.color ?? '#8A8A8F',
      icon: key?.icon ?? 'circle-question-mark',
      amount: 0,
      count: 0,
    };
    slice.amount += t.baseAmount;
    slice.count += 1;
    map.set(id, slice);
  }
  return [...map.values()].sort((a, b) => b.amount - a.amount);
}

export type DayPoint = { day: number; amount: Minor };

/** Spending per calendar day across [from, to]. */
export function dailySpend(txs: Transaction[], ctx: StatsContext, from: number, to: number): DayPoint[] {
  const byDay = new Map<string, number>();
  for (const t of txs) {
    if (!isSpend(t, ctx)) continue;
    const k = format(t.date, 'yyyy-MM-dd');
    byDay.set(k, (byDay.get(k) ?? 0) + t.baseAmount);
  }
  return eachDayOfInterval({ start: startOfDay(from), end: endOfDay(Math.min(to, Date.now())) }).map((d) => ({
    day: d.getTime(),
    amount: byDay.get(format(d, 'yyyy-MM-dd')) ?? 0,
  }));
}

/** Running total per day, for the "this month vs last month" line. */
export function cumulative(points: DayPoint[]): DayPoint[] {
  let acc = 0;
  return points.map((p) => ({ day: p.day, amount: (acc += p.amount) }));
}

export type MonthBucket = { month: number; spent: Minor; earned: Minor; nature: NatureSplit };

/** The last `n` months (oldest first) with spend, income and the needs/wants split. */
export function monthly(txs: Transaction[], ctx: StatsContext, n: number, now = Date.now()): MonthBucket[] {
  const months: MonthBucket[] = [];
  for (let i = n - 1; i >= 0; i--) {
    months.push({ month: startOfMonth(subMonths(now, i)).getTime(), spent: 0, earned: 0, nature: { need: 0, want: 0, saving: 0, none: 0 } });
  }
  const index = new Map(months.map((m, i) => [format(m.month, 'yyyy-MM'), i]));
  for (const t of txs) {
    const i = index.get(format(t.date, 'yyyy-MM'));
    if (i === undefined) continue;
    const m = months[i];
    if (isSpend(t, ctx)) {
      m.spent += t.baseAmount;
      m.nature[natureOf(t, ctx)] += t.baseAmount;
    } else if (isEarn(t, ctx)) m.earned += t.baseAmount;
  }
  return months;
}

/** 7 × 24 grid (Monday first) of spending by weekday and hour. */
export function weekHourGrid(txs: Transaction[], ctx: StatsContext): number[][] {
  const grid = Array.from({ length: 7 }, () => Array<number>(24).fill(0));
  for (const t of txs) {
    if (!isSpend(t, ctx) || t.parentId) continue;
    const d = new Date(t.date);
    grid[(d.getDay() + 6) % 7][d.getHours()] += t.baseAmount;
  }
  return grid;
}

export type PayeeStat = { payeeId: ID; amount: Minor; count: number; average: Minor };

export function topPayees(txs: Transaction[], ctx: StatsContext, limit = 6): PayeeStat[] {
  const map = new Map<ID, PayeeStat>();
  for (const t of txs) {
    if (!isSpend(t, ctx) || !t.payeeId || t.parentId) continue;
    const s = map.get(t.payeeId) ?? { payeeId: t.payeeId, amount: 0, count: 0, average: 0 };
    s.amount += t.baseAmount;
    s.count += 1;
    map.set(t.payeeId, s);
  }
  return [...map.values()]
    .map((s) => ({ ...s, average: Math.round(s.amount / s.count) }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit);
}

/** Total of generated fee rows (InstaPay and others). */
export function feesPaid(txs: Transaction[], ctx: StatsContext): { amount: Minor; count: number } {
  let amount = 0;
  let count = 0;
  for (const t of txs) {
    if (t.parentId && isSpend(t, ctx)) {
      amount += t.baseAmount;
      count++;
    }
  }
  return { amount, count };
}

/** Daily spending for `days` days back, used by the home sparkline. */
export function recentDailySpend(txs: Transaction[], ctx: StatsContext, from: number, to: number): number[] {
  return dailySpend(txs, ctx, from, to).map((p) => p.amount);
}
