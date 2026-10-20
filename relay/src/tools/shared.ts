/** Lookups, input parsing and output shapes shared by Claude's tools. */
import { getBalances, listAccounts } from '../../../src/modules/accounts/data/accountsRepo';
import { findCategoryByHint, listCategories } from '../../../src/modules/categories/data/categoriesRepo';
import { findOrCreatePayee, findPayeeByName, listPayees } from '../../../src/modules/payees/data/payeesRepo';
import type { Account, Category, CategoryKind, ID, Nature, Payee, PaymentType, PayeeKind, Transaction, TxType } from '../../../src/modules/shared/db/types';
import { getSettings } from '../../../src/modules/shared/settings/settingsStore';
import { toMajor, toMinor } from '../../../src/modules/shared/utils/money';
import { formatLocal, parseMoment, validZone } from '../dates';

export type ToolResult = { content: { type: 'text'; text: string }[]; isError?: boolean };

export type ToolContext = {
  /** Read-only SQL straight on the database (rolled back if it tries to write). */
  query: (sql: string, params: unknown[]) => Record<string, unknown>[];
};

export type Tool = {
  name: string;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations: Record<string, boolean | string>;
  run: (args: Record<string, unknown>, ctx: ToolContext) => Promise<ToolResult>;
};

/** A problem with what Claude sent; reported back so it can fix the call. */
export class InputError extends Error {}

export const ok = (body: unknown): ToolResult => ({ content: [{ type: 'text', text: typeof body === 'string' ? body : JSON.stringify(body) }] });
export const fail = (message: string): ToolResult => ({ content: [{ type: 'text', text: message }], isError: true });

/* ---------- Input ---------- */

export function text(v: unknown, field: string, max = 200): string | null {
  if (v === undefined || v === null || v === '') return null;
  if (typeof v !== 'string') throw new InputError(`${field} must be text`);
  const t = v.trim();
  return t ? t.slice(0, max) : null;
}

export function flag(v: unknown, field: string): boolean | null {
  if (v === undefined || v === null) return null;
  if (typeof v !== 'boolean') throw new InputError(`${field} must be true or false`);
  return v;
}

/** A positive amount in major units (45.5) → minor units (4550). */
export function amountIn(v: unknown, field: string, opts: { allowZero?: boolean } = {}): number | null {
  if (v === undefined || v === null || v === '') return null;
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v.replace(/,/g, '')) : NaN;
  if (!Number.isFinite(n) || n < 0 || (!opts.allowZero && n === 0)) throw new InputError(`${field} must be a positive number`);
  if (n > 1e10) throw new InputError(`${field} is too large`);
  return toMinor(n);
}

export function oneOf<T extends string>(v: unknown, field: string, values: readonly T[]): T | null {
  if (v === undefined || v === null || v === '') return null;
  if (typeof v !== 'string' || !values.includes(v as T)) throw new InputError(`${field} must be one of ${values.join(', ')}`);
  return v as T;
}

export function currencyIn(v: unknown, field = 'currency'): string | null {
  const c = text(v, field, 10)?.toUpperCase() ?? null;
  if (c && !/^[A-Z]{3}$/.test(c)) throw new InputError(`${field} must be a 3-letter code like EGP or USD`);
  return c;
}

export function list(v: unknown, field: string, max: number): Record<string, unknown>[] {
  if (!Array.isArray(v) || !v.length) throw new InputError(`${field} must be a non-empty list`);
  if (v.length > max) throw new InputError(`${field} can have at most ${max} items per call`);
  return v.map((x, i) => {
    if (!x || typeof x !== 'object' || Array.isArray(x)) throw new InputError(`${field}[${i}] must be an object`);
    return x as Record<string, unknown>;
  });
}

export const TX_TYPES = ['expense', 'income', 'transfer'] as const satisfies readonly TxType[];
export const PAYMENT_TYPES = ['cash', 'debit_card', 'credit_card', 'apple_pay', 'instapay', 'bank_transfer', 'mobile_wallet', 'web_payment', 'voucher'] as const satisfies readonly PaymentType[];
export const NATURES = ['need', 'want', 'saving', 'none'] as const satisfies readonly Nature[];

/* ---------- Lookups ---------- */

export type Lookups = {
  tz: string;
  base: string;
  accounts: Account[];
  accountById: Map<ID, Account>;
  categories: Category[];
  categoryById: Map<ID, Category>;
  payees: Payee[];
  payeeById: Map<ID, Payee>;
};

export async function loadLookups(): Promise<Lookups> {
  const [accounts, categories, payees] = await Promise.all([listAccounts(true), listCategories(true), listPayees()]);
  const s = getSettings();
  return {
    tz: validZone(s.timeZone),
    base: s.baseCurrency,
    accounts,
    accountById: new Map(accounts.map((a) => [a.id, a])),
    categories,
    categoryById: new Map(categories.map((c) => [c.id, c])),
    payees,
    payeeById: new Map(payees.map((p) => [p.id, p])),
  };
}

export function categoryPath(id: ID | null, lk: Lookups): string | null {
  if (!id) return null;
  const c = lk.categoryById.get(id);
  if (!c) return null;
  const parent = c.parentId ? lk.categoryById.get(c.parentId) : null;
  return parent ? `${parent.name} › ${c.name}` : c.name;
}

const norm = (s: string) => s.trim().toLowerCase();

/** An account by id or name ("CIB", "cash"). */
export function resolveAccount(v: unknown, lk: Lookups, field = 'account'): Account | null {
  const key = text(v, field);
  if (!key) return null;
  const byId = lk.accountById.get(key);
  if (byId) return byId;
  const live = lk.accounts.filter((a) => !a.archived);
  // An exact name may be archived (to unarchive it); a partial match only looks at live accounts.
  const exact = lk.accounts.filter((a) => norm(a.name) === norm(key));
  const exactLive = exact.filter((a) => !a.archived);
  if (exactLive.length === 1) return exactLive[0];
  if (exact.length === 1) return exact[0];
  const partial = live.filter((a) => norm(a.name).includes(norm(key)) || norm(key).includes(norm(a.name)));
  if (partial.length === 1) return partial[0];
  throw new InputError(`No single account matches "${key}". Accounts: ${live.map((a) => `${a.name} (${a.currency}, id ${a.id})`).join('; ')}`);
}

/** A category by id, name or "Parent › Child". */
export async function resolveCategory(v: unknown, kind: CategoryKind, lk: Lookups, field = 'category'): Promise<Category | null> {
  const key = text(v, field);
  if (!key) return null;
  const byId = lk.categoryById.get(key);
  if (byId) return byId;
  const found = await findCategoryByHint(key, kind);
  if (found) return found;
  throw new InputError(`No ${kind} category matches "${key}". Call get_catalog for the category names and ids.`);
}

/** A payee by id or name; with `create`, a new name becomes a new payee. */
export async function resolvePayee(v: unknown, lk: Lookups, opts: { create: boolean; kind?: PayeeKind }, field = 'payee'): Promise<Payee | null> {
  const key = text(v, field);
  if (!key) return null;
  const byId = lk.payeeById.get(key);
  if (byId) return byId;
  const byName = await findPayeeByName(key);
  if (byName) return byName;
  if (!opts.create) throw new InputError(`No payee is called "${key}"`);
  const created = await findOrCreatePayee(key, opts.kind ?? 'merchant');
  lk.payees.push(created);
  lk.payeeById.set(created.id, created);
  return created;
}

export function momentIn(v: unknown, lk: Lookups, field: string, edge: 'start' | 'end' | 'noon' = 'noon'): number | null {
  if (v === undefined || v === null || v === '') return null;
  const t = parseMoment(v, lk.tz, edge);
  if (t == null) throw new InputError(`${field} must be a date like 2026-10-16, a local time like 2026-10-16 13:30, or ISO 8601`);
  return t;
}

/* ---------- Output ---------- */

export const major = (minor: number | null | undefined): number | null => (minor == null ? null : Math.round(toMajor(minor) * 100) / 100);

export function txOut(t: Transaction & { feeTotal?: number }, lk: Lookups) {
  const account = lk.accountById.get(t.accountId);
  return {
    id: t.id,
    date: formatLocal(t.date, lk.tz),
    type: t.type,
    amount: major(t.amount),
    currency: t.currency,
    ...(t.currency !== lk.base ? { [`in_${lk.base.toLowerCase()}`]: major(t.baseAmount) } : {}),
    account: account?.name ?? t.accountId,
    ...(t.toAccountId ? { to_account: lk.accountById.get(t.toAccountId)?.name ?? t.toAccountId, to_amount: major(t.toAmount) } : {}),
    ...(t.categoryId ? { category: categoryPath(t.categoryId, lk) } : {}),
    ...(t.payeeId ? { payee: lk.payeeById.get(t.payeeId)?.name ?? t.payeeId } : {}),
    ...(t.note ? { note: t.note } : {}),
    payment: t.paymentType,
    ...(t.isInstapay ? { instapay: true } : {}),
    ...(t.feeTotal ? { fee: major(t.feeTotal) } : {}),
    ...(t.natureOverride ? { nature: t.natureOverride } : {}),
    ...(t.originalCurrency ? { entered_as: `${t.originalCurrency} ${major(t.originalAmount)}` } : {}),
    ...(t.debtId ? { debt_id: t.debtId } : {}),
    ...(t.recurringId ? { planned_payment_id: t.recurringId } : {}),
    ...(t.parentId ? { fee_of: t.parentId } : {}),
    source: t.source,
  };
}

export async function balancesOut(lk: Lookups) {
  const balances = await getBalances();
  return lk.accounts.map((a) => ({
    id: a.id,
    name: a.name,
    type: a.type,
    currency: a.currency,
    balance: major(balances[a.id] ?? 0),
    ...(a.bankBalance != null && a.bankBalanceAt ? { bank_reported: { balance: major(a.bankBalance), at: formatLocal(a.bankBalanceAt, lk.tz) } } : {}),
    ...(a.identifiers.length ? { card_digits: a.identifiers } : {}),
    ...(a.excludeFromStats ? { excluded_from_stats: true } : {}),
    ...(a.archived ? { archived: true } : {}),
  }));
}
