/**
 * Claude's tools that change data. Each call is one all-or-nothing change set (see changes.ts):
 * inputs are checked first, then everything is written together, logged, and can be undone.
 * They reuse the app's own repositories, so fees, transfers and currency conversion follow
 * exactly the same rules as in Mula.
 */
import { deleteAccount, getAccount, saveAccount, type AccountInput } from '../../../src/modules/accounts/data/accountsRepo';
import { ACCOUNT_COLORS, accountTypeMeta } from '../../../src/modules/accounts/utils/accountMeta';
import { restoreCategory, saveCategory, setCategoryArchived, setCategoryNature } from '../../../src/modules/categories/data/categoriesRepo';
import { CATEGORY_COLORS, isSystemCategory } from '../../../src/modules/categories/utils/categoryMeta';
import { addRepayment, deleteDebt, getDebt, saveDebt, setDebtStatus } from '../../../src/modules/debts/data/debtsRepo';
import { buildSuggestion, confirmItem, dismissItem, getInboxItem, linkToExisting, restoreItem } from '../../../src/modules/inbox/data/inboxRepo';
import { convert } from '../../../src/modules/integrations/utils/fx';
import { deletePayee, findPayeeByName, mergePayees, removeAlias, setAlias, updatePayee } from '../../../src/modules/payees/data/payeesRepo';
import { deleteRecurring, getRecurring, saveRecurring, setRecurringActive, skipMissedRecurring, type RecurringInput } from '../../../src/modules/recurring/data/recurringRepo';
import { first } from '../../../src/modules/shared/db/client';
import { SYSTEM_CATEGORIES } from '../../../src/modules/shared/db/seeds/categories';
import type { Account, AccountType, Category, CategoryKind, Frequency, ID, PaymentType, RecurringEnd, Transaction, TxPreset } from '../../../src/modules/shared/db/types';
import { getSettings, setSetting } from '../../../src/modules/shared/settings/settingsStore';
import { CURRENCIES } from '../../../src/modules/shared/utils/money';
import { deleteTemplate, getTemplate, saveTemplate, type TemplateInput } from '../../../src/modules/templates/data/templatesRepo';
import { createTransaction, deleteTransaction, getFeeTotal, getTransaction, updateTransaction } from '../../../src/modules/transactions/data/transactionsRepo';
import type { TxInput } from '../../../src/modules/transactions/types';
import { instapayFee } from '../../../src/modules/transactions/utils/instapay';
import { recordChange, undoChange } from '../changes';
import { formatLocal } from '../dates';
import {
  InputError,
  NATURES,
  PAYMENT_TYPES,
  TX_TYPES,
  amountIn,
  categoryPath,
  currencyIn,
  flag,
  list,
  loadLookups,
  major,
  momentIn,
  ok,
  oneOf,
  resolveAccount,
  resolveCategory,
  resolvePayee,
  text,
  txOut,
  type Lookups,
  type Tool,
} from './shared';

const WRITES = { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false };
const DESTRUCTIVE = { ...WRITES, destructiveHint: true };

/** Wraps a change set and tells Claude how to undo it. */
async function changed(tool: string, fn: () => Promise<{ value: Record<string, unknown>; summary: string }>) {
  const { value, changeId } = await recordChange(tool, fn);
  return ok({ ...value, ...(changeId ? { change_id: changeId, undo: 'undo_claude_change with this change_id reverses it' } : { note: 'Nothing changed' }) });
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/* ---------- Transactions ---------- */

const txFields = {
  type: { type: 'string', enum: [...TX_TYPES], description: 'Default expense' },
  amount: { type: 'number', exclusiveMinimum: 0, description: 'Positive, in major units (45.5)' },
  currency: { type: 'string', description: 'If not the account’s currency, Mula converts at that day’s rate and keeps the original' },
  account: { type: 'string', description: 'Account name or id. Default: the payee’s usual account, else the last one used' },
  to_account: { type: 'string', description: 'Transfers: the receiving account' },
  to_amount: { type: 'number', description: 'Transfers between currencies: the amount that arrived' },
  category: { type: 'string', description: 'Category name, "Parent › Child" or id. Default: the payee’s usual category' },
  payee: { type: 'string', description: 'Shop or person (name or id); new names become new payees' },
  payee_kind: { type: 'string', enum: ['merchant', 'person'], description: 'For a new payee; default merchant' },
  date: { type: 'string', description: '2026-10-16, "2026-10-16 13:30" (user’s time zone) or ISO 8601. Default now' },
  note: { type: 'string' },
  payment_type: { type: 'string', enum: [...PAYMENT_TYPES], description: 'Default: the account’s usual one' },
  instapay: { type: 'boolean', description: 'Sent or received with InstaPay; outgoing ones get the InstaPay fee' },
  fee: { type: 'number', minimum: 0, description: 'A fee to book as its own expense (overrides the InstaPay fee; 0 for none)' },
  nature: { type: 'string', enum: [...NATURES], description: 'Override need/want for this record' },
};

/** What a transaction would be, from Claude's fields over an optional existing record. */
async function buildTx(item: Record<string, unknown>, lk: Lookups, existing: (Transaction & { feeTotal: number }) | null): Promise<TxInput> {
  const type = oneOf(item.type, 'type', TX_TYPES) ?? existing?.type ?? 'expense';
  const payee =
    item.payee === null
      ? null
      : ((await resolvePayee(item.payee, lk, { create: true, kind: oneOf(item.payee_kind, 'payee_kind', ['merchant', 'person'] as const) ?? 'merchant' })) ??
        (existing?.payeeId ? (lk.payeeById.get(existing.payeeId) ?? null) : null));

  let account = resolveAccount(item.account, lk);
  if (!account && existing) account = lk.accountById.get(existing.accountId) ?? null;
  if (!account && payee?.defaultAccountId) account = lk.accountById.get(payee.defaultAccountId) ?? null;
  const last = getSettings().lastAccountId;
  if (!account && last) account = lk.accountById.get(last) ?? null;
  const live = lk.accounts.filter((a) => !a.archived);
  if (!account && live.length === 1) account = live[0];
  if (!account) throw new InputError(`Which account? ${live.map((a) => a.name).join(', ')}`);

  const date = momentIn(item.date, lk, 'date') ?? existing?.date ?? Date.now();

  // Amount, in the account's currency.
  const typed = amountIn(item.amount, 'amount');
  const currency = currencyIn(item.currency);
  let amount = typed ?? existing?.amount ?? null;
  let original: TxInput['original'] =
    existing && typed == null && existing.originalAmount != null && existing.originalCurrency && existing.fxRate != null
      ? { amount: existing.originalAmount, currency: existing.originalCurrency, rate: existing.fxRate }
      : null;
  if (amount == null) throw new InputError('amount is required');
  if (typed != null && currency && currency !== account.currency) {
    const c = await convert(typed, currency, account.currency, date);
    if (!c) throw new InputError(`No ${currency}→${account.currency} rate is available for that date; give the amount in ${account.currency}`);
    amount = c.amount;
    original = { amount: typed, currency, rate: c.rate };
  } else if (typed != null) {
    original = null;
  }
  if (existing && typed == null && item.account && existing.currency !== account.currency) {
    throw new InputError(`${account.name} is in ${account.currency}; also give the amount in ${account.currency}`);
  }

  let toAccount: Account | null = null;
  let toAmount: number | null = null;
  if (type === 'transfer') {
    toAccount = resolveAccount(item.to_account, lk, 'to_account') ?? (existing?.toAccountId ? (lk.accountById.get(existing.toAccountId) ?? null) : null);
    if (!toAccount) throw new InputError('A transfer needs to_account');
    if (toAccount.id === account.id) throw new InputError('to_account must be a different account');
    toAmount = amountIn(item.to_amount, 'to_amount') ?? (typed == null ? (existing?.toAmount ?? null) : null);
    if (toAmount == null) {
      if (toAccount.currency === account.currency) toAmount = amount;
      else {
        const c = await convert(amount, account.currency, toAccount.currency, date);
        if (!c) throw new InputError(`No ${account.currency}→${toAccount.currency} rate; give to_amount`);
        toAmount = c.amount;
      }
    }
  }

  let categoryId: ID | null = null;
  if (type !== 'transfer') {
    const kind: CategoryKind = type === 'income' ? 'income' : 'expense';
    const cat = await resolveCategory(item.category, kind, lk);
    const keep = existing && existing.type === type && existing.categoryId ? existing.categoryId : null;
    categoryId = cat?.id ?? keep ?? payee?.defaultCategoryId ?? null;
    if (categoryId && lk.categoryById.get(categoryId)?.kind !== kind) categoryId = cat?.id ?? null;
    if (!categoryId) {
      if (kind === 'expense') categoryId = SYSTEM_CATEGORIES.missing;
      else throw new InputError('Income needs a category (e.g. "Wage, invoices"); see get_catalog');
    }
  }

  const instapay = flag(item.instapay, 'instapay') ?? existing?.isInstapay ?? false;
  const paymentType: PaymentType = oneOf(item.payment_type, 'payment_type', PAYMENT_TYPES) ?? (flag(item.instapay, 'instapay') ? 'instapay' : (existing?.paymentType ?? account.defaultPaymentType));
  const feeArg = amountIn(item.fee, 'fee', { allowZero: true });
  const feeBasisChanged = !existing || amount !== existing.amount || instapay !== existing.isInstapay;
  const fee =
    feeArg != null
      ? feeArg
      : instapay && type !== 'income'
        ? feeBasisChanged
          ? instapayFee(amount, getSettings().instapayFee)
          : (existing?.feeTotal ?? 0)
        : !instapay && existing?.isInstapay
          ? 0
          : (existing?.feeTotal ?? 0);

  const note = item.note === null ? null : (text(item.note, 'note', 1000) ?? existing?.note ?? null);
  const natureArg = oneOf(item.nature, 'nature', NATURES);
  return {
    type,
    amount,
    accountId: account.id,
    toAccountId: toAccount?.id ?? null,
    toAmount,
    categoryId,
    payeeId: payee?.id ?? null,
    paymentType,
    date,
    note,
    isInstapay: instapay,
    fee: fee || null,
    natureOverride: natureArg === 'none' ? null : (natureArg ?? existing?.natureOverride ?? null),
    original,
    recurringId: existing?.recurringId ?? null,
    debtId: existing?.debtId ?? null,
    source: existing?.source ?? 'claude',
    sourceRef: existing?.sourceRef ?? null,
  };
}

async function existingTx(id: unknown): Promise<Transaction & { feeTotal: number }> {
  if (typeof id !== 'string' || !id) throw new InputError('id is required');
  const t = await getTransaction(id);
  if (!t) throw new InputError(`No transaction has id ${id}`);
  if (t.parentId) throw new InputError(`${id} is the fee of ${t.parentId}; change that record instead (its fee field)`);
  return { ...t, feeTotal: await getFeeTotal(id) };
}

const transactionTools: Tool[] = [
  {
    name: 'add_transactions',
    title: 'Add transactions',
    description:
      'Adds expenses, income or transfers (up to 100 per call) straight into Mula. Use names from get_catalog; ' +
      'without a category, an expense goes to Others › Missing. InstaPay transfers out get the InstaPay fee automatically.',
    inputSchema: {
      type: 'object',
      properties: {
        transactions: { type: 'array', minItems: 1, maxItems: 100, items: { type: 'object', properties: txFields, required: ['amount'], additionalProperties: false } },
      },
      required: ['transactions'],
      additionalProperties: false,
    },
    annotations: WRITES,
    async run(args) {
      const lk = await loadLookups();
      const items = list(args.transactions, 'transactions', 100);
      return changed('add_transactions', async () => {
        const inputs: TxInput[] = [];
        for (const [i, item] of items.entries()) {
          try {
            inputs.push(await buildTx(item, lk, null));
          } catch (e) {
            throw new InputError(`transactions[${i}]: ${(e as Error).message}`);
          }
        }
        const added = [];
        for (const input of inputs) {
          const id = await createTransaction(input);
          added.push(txOut({ ...(await getTransaction(id))!, feeTotal: input.fee ?? 0 }, lk));
        }
        return { value: { added }, summary: added.length === 1 ? `Added ${describe(added[0])}` : `Added ${plural(added.length, 'transaction')}` };
      });
    },
  },
  {
    name: 'update_transactions',
    title: 'Edit transactions',
    description:
      'Changes existing records (up to 200 per call, e.g. re-categorize every Uber ride). Give each record’s id and only the fields to change; ' +
      'use null for note or payee to clear them. Changing an InstaPay amount recalculates its fee.',
    inputSchema: {
      type: 'object',
      properties: {
        updates: {
          type: 'array',
          minItems: 1,
          maxItems: 200,
          items: {
            type: 'object',
            properties: { id: { type: 'string' }, ...txFields, note: { type: ['string', 'null'] }, payee: { type: ['string', 'null'] } },
            required: ['id'],
            additionalProperties: false,
          },
        },
      },
      required: ['updates'],
      additionalProperties: false,
    },
    annotations: WRITES,
    async run(args) {
      const lk = await loadLookups();
      const items = list(args.updates, 'updates', 200);
      return changed('update_transactions', async () => {
        const plans: { id: string; input: TxInput }[] = [];
        for (const [i, item] of items.entries()) {
          try {
            const existing = await existingTx(item.id);
            plans.push({ id: existing.id, input: await buildTx(item, lk, existing) });
          } catch (e) {
            throw new InputError(`updates[${i}]: ${(e as Error).message}`);
          }
        }
        const updated = [];
        for (const p of plans) {
          await updateTransaction(p.id, p.input);
          updated.push(txOut({ ...(await getTransaction(p.id))!, feeTotal: await getFeeTotal(p.id) }, lk));
        }
        return { value: { updated }, summary: updated.length === 1 ? `Edited ${describe(updated[0])}` : `Edited ${plural(updated.length, 'transaction')}` };
      });
    },
  },
  {
    name: 'delete_transactions',
    title: 'Delete transactions',
    description: 'Deletes records by id (with their fees). Bank messages that produced them go back to the review inbox.',
    inputSchema: {
      type: 'object',
      properties: { ids: { type: 'array', minItems: 1, maxItems: 200, items: { type: 'string' } } },
      required: ['ids'],
      additionalProperties: false,
    },
    annotations: DESTRUCTIVE,
    async run(args) {
      const lk = await loadLookups();
      const ids = Array.isArray(args.ids) ? [...new Set(args.ids.filter((x): x is string => typeof x === 'string'))] : [];
      if (!ids.length || ids.length > 200) throw new InputError('ids must list 1 to 200 transaction ids');
      return changed('delete_transactions', async () => {
        const found: Transaction[] = [];
        for (const id of ids) {
          const t = await getTransaction(id);
          if (!t) throw new InputError(`No transaction has id ${id}`);
          found.push(t);
        }
        for (const t of found) await deleteTransaction(t.id);
        const out = found.map((t) => txOut(t, lk));
        return { value: { deleted: out }, summary: out.length === 1 ? `Deleted ${describe(out[0])}` : `Deleted ${plural(out.length, 'transaction')}` };
      });
    },
  },
];

function describe(t: ReturnType<typeof txOut>): string {
  const who = t.payee ? ` at ${t.payee}` : t.to_account ? ` to ${t.to_account}` : '';
  return `${t.type} ${t.currency} ${t.amount}${who} (${t.date.slice(0, 10)})`;
}

/* ---------- Review inbox ---------- */

const reviewTool: Tool = {
  name: 'review_inbox',
  title: 'Resolve review items',
  description:
    'Confirms, dismisses or links items from list_review_inbox (up to 100 per call). Confirm files the suggestion, with any fields ' +
    'you override (same fields as add_transactions); outgoing InstaPay needs a payee. A new name for a bank name is remembered for next time ' +
    'unless remember_name is false. Link marks an item as already recorded by an existing transaction.',
  inputSchema: {
    type: 'object',
    properties: {
      items: {
        type: 'array',
        minItems: 1,
        maxItems: 100,
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            action: { type: 'string', enum: ['confirm', 'dismiss', 'link', 'restore'] },
            link_to: { type: 'string', description: 'For link: the transaction id that already covers it' },
            remember_name: { type: 'boolean', description: 'Map the bank’s name to the payee for next time (default true)' },
            reason: { type: 'string', description: 'For dismiss: why (kept as a note)' },
            ...txFields,
          },
          required: ['id', 'action'],
          additionalProperties: false,
        },
      },
    },
    required: ['items'],
    additionalProperties: false,
  },
  annotations: WRITES,
  async run(args) {
    const lk = await loadLookups();
    const items = list(args.items, 'items', 100);
    return changed('review_inbox', async () => {
      const results = [];
      let confirmed = 0;
      let dismissed = 0;
      for (const [i, item] of items.entries()) {
        const where = `items[${i}]`;
        const inbox = typeof item.id === 'string' ? await getInboxItem(item.id) : null;
        if (!inbox) throw new InputError(`${where}: no inbox item has id ${String(item.id)}`);
        const action = oneOf(item.action, 'action', ['confirm', 'dismiss', 'link', 'restore'] as const);
        if (action === 'restore') {
          await restoreItem(inbox.id);
          results.push({ id: inbox.id, restored: true });
          continue;
        }
        if (inbox.status !== 'pending') throw new InputError(`${where}: that item is already ${inbox.status}`);
        if (action === 'dismiss') {
          await dismissItem(inbox.id, text(item.reason, 'reason', 200) ?? 'Dismissed by Claude');
          results.push({ id: inbox.id, dismissed: true });
          dismissed++;
          continue;
        }
        if (action === 'link') {
          const target = typeof item.link_to === 'string' ? await getTransaction(item.link_to) : null;
          if (!target) throw new InputError(`${where}: link_to must be an existing transaction id`);
          await linkToExisting(inbox.id, target.id);
          results.push({ id: inbox.id, linked_to: target.id });
          continue;
        }
        const s = await buildSuggestion(inbox);
        if (s.unconverted && item.amount == null) {
          const acc = s.account?.currency ?? 'the account’s currency';
          throw new InputError(`${where}: no ${s.unconverted.currency} to ${acc} exchange rate yet; pass amount (in ${acc}), or amount with currency`);
        }
        const isPerson = inbox.parsed?.kind === 'instapay_in' || inbox.parsed?.kind === 'instapay_out';
        // The payee: what Claude named, else the recognized one, else Mula's suggested name.
        const payeeName = item.payee ?? (s.payee ? s.payee.id : s.suggestedName);
        const draft = { ...s.draft, payeeId: null, categoryId: s.draft.categoryId ?? null } as TxInput;
        let input: TxInput;
        try {
          input = await buildTx(
            { ...item, payee: payeeName ?? undefined, payee_kind: item.payee_kind ?? (isPerson ? 'person' : 'merchant'), account: item.account ?? s.account?.id ?? undefined, to_account: item.to_account ?? s.toAccount?.id ?? undefined },
            lk,
            { ...(draftAsTx(draft, s.account?.currency ?? lk.base)), feeTotal: s.draft.fee ?? 0 },
          );
        } catch (e) {
          throw new InputError(`${where}: ${(e as Error).message}`);
        }
        if (s.needsPayee && !input.payeeId) throw new InputError(`${where}: who received this InstaPay transfer? Pass payee.`);
        if (input.type !== 'transfer' && input.categoryId === SYSTEM_CATEGORIES.missing && !item.category) {
          throw new InputError(`${where}: pick a category (Mula has no usual category for this payee)`);
        }
        const remember = flag(item.remember_name, 'remember_name') ?? true;
        const alias = remember && s.rawName && input.payeeId && input.payeeId !== s.payee?.id ? { raw: s.rawName, payeeId: input.payeeId } : null;
        const txId = await confirmItem(inbox.id, { ...input, source: s.draft.source, sourceRef: inbox.id }, { alias });
        results.push({ id: inbox.id, confirmed: txOut({ ...(await getTransaction(txId))!, feeTotal: await getFeeTotal(txId) }, lk) });
        confirmed++;
      }
      const parts = [confirmed ? `confirmed ${confirmed}` : '', dismissed ? `dismissed ${dismissed}` : ''].filter(Boolean);
      return { value: { results }, summary: `Review inbox: ${parts.join(', ') || `${results.length} updated`}` };
    });
  },
};

/** The inbox suggestion as an "existing record" for buildTx, so unspecified fields keep its values. */
function draftAsTx(d: TxInput, currency: string): Transaction {
  return {
    id: '',
    type: d.type,
    amount: d.amount,
    currency,
    accountId: d.accountId ?? '',
    toAccountId: d.toAccountId ?? null,
    toAmount: d.toAmount ?? null,
    categoryId: d.categoryId ?? null,
    payeeId: d.payeeId ?? null,
    paymentType: d.paymentType,
    date: d.date,
    note: d.note ?? null,
    isInstapay: Boolean(d.isInstapay),
    parentId: null,
    natureOverride: d.natureOverride ?? null,
    originalAmount: d.original?.amount ?? null,
    originalCurrency: d.original?.currency ?? null,
    fxRate: d.original?.rate ?? null,
    baseAmount: d.amount,
    recurringId: d.recurringId ?? null,
    debtId: d.debtId ?? null,
    source: d.source ?? 'sms',
    sourceRef: d.sourceRef ?? null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

/* ---------- Accounts ---------- */

const ACCOUNT_TYPES = ['bank', 'card', 'cash', 'wallet', 'savings', 'other'] as const satisfies readonly AccountType[];

const accountsTool: Tool = {
  name: 'manage_accounts',
  title: 'Manage accounts',
  description:
    'Creates, edits, archives or deletes an account. Deleting also deletes every transaction on it (archive keeps them). ' +
    'card_digits are the last digits of cards and accounts that bank messages mention, used to route them.',
  inputSchema: {
    type: 'object',
    properties: {
      action: { type: 'string', enum: ['create', 'update', 'archive', 'unarchive', 'delete'] },
      account: { type: 'string', description: 'For update/archive/unarchive/delete: name or id' },
      name: { type: 'string' },
      type: { type: 'string', enum: [...ACCOUNT_TYPES] },
      currency: { type: 'string', description: 'Only when creating' },
      starting_balance: { type: 'number', description: 'Balance before the first record (can be negative)' },
      default_payment_type: { type: 'string', enum: [...PAYMENT_TYPES] },
      card_digits: { type: 'array', items: { type: 'string' }, maxItems: 10 },
      exclude_from_stats: { type: 'boolean' },
    },
    required: ['action'],
    additionalProperties: false,
  },
  annotations: DESTRUCTIVE,
  async run(args) {
    const lk = await loadLookups();
    const action = oneOf(args.action, 'action', ['create', 'update', 'archive', 'unarchive', 'delete'] as const)!;
    const startingBalance = (): number | null => {
      if (args.starting_balance === undefined || args.starting_balance === null) return null;
      const n = Number(args.starting_balance);
      if (!Number.isFinite(n)) throw new InputError('starting_balance must be a number');
      return Math.round(n * 100);
    };
    const digits = Array.isArray(args.card_digits) ? args.card_digits.map((d) => String(d).replace(/\D/g, '')).filter(Boolean) : null;
    if (action === 'create') {
      const name = text(args.name, 'name', 60);
      if (!name) throw new InputError('name is required');
      const type = oneOf(args.type, 'type', ACCOUNT_TYPES) ?? 'bank';
      const meta = accountTypeMeta(type);
      const input: AccountInput = {
        name,
        type,
        currency: currencyIn(args.currency) ?? lk.base,
        initialBalance: startingBalance() ?? 0,
        color: ACCOUNT_COLORS[lk.accounts.length % ACCOUNT_COLORS.length],
        icon: meta.icon,
        defaultPaymentType: oneOf(args.default_payment_type, 'default_payment_type', PAYMENT_TYPES) ?? meta.payment,
        identifiers: digits ?? [],
        excludeFromStats: flag(args.exclude_from_stats, 'exclude_from_stats') ?? false,
        archived: false,
      };
      return changed('manage_accounts', async () => {
        const id = await saveAccount(input);
        return { value: { created: { id, name, type, currency: input.currency } }, summary: `Created account ${name}` };
      });
    }
    const account = resolveAccount(args.account, lk);
    if (!account) throw new InputError('account is required');
    if (action === 'delete') {
      const n = (await first<{ n: number }>('SELECT COUNT(*) AS n FROM transactions WHERE account_id = ? OR to_account_id = ?', [account.id, account.id]))?.n ?? 0;
      return changed('manage_accounts', async () => {
        await deleteAccount(account.id);
        return { value: { deleted: account.name, transactions_deleted: n }, summary: `Deleted account ${account.name} and ${plural(n, 'record')}` };
      });
    }
    if (args.currency && currencyIn(args.currency) !== account.currency) throw new InputError('An account’s currency can’t change; create a new account instead');
    const type = oneOf(args.type, 'type', ACCOUNT_TYPES) ?? account.type;
    const input: AccountInput = {
      ...account,
      name: text(args.name, 'name', 60) ?? account.name,
      type,
      initialBalance: startingBalance() ?? account.initialBalance,
      icon: type !== account.type ? accountTypeMeta(type).icon : account.icon,
      defaultPaymentType: oneOf(args.default_payment_type, 'default_payment_type', PAYMENT_TYPES) ?? account.defaultPaymentType,
      identifiers: digits ?? account.identifiers,
      excludeFromStats: flag(args.exclude_from_stats, 'exclude_from_stats') ?? account.excludeFromStats,
      archived: action === 'archive' ? true : action === 'unarchive' ? false : account.archived,
    };
    return changed('manage_accounts', async () => {
      await saveAccount(input);
      const after = await getAccount(account.id);
      const verb = action === 'archive' ? 'Archived' : action === 'unarchive' ? 'Unarchived' : 'Edited';
      return { value: { account: { id: account.id, name: after?.name, archived: after?.archived } }, summary: `${verb} account ${after?.name ?? account.name}` };
    });
  },
};

/* ---------- Categories ---------- */

const categoriesTool: Tool = {
  name: 'manage_categories',
  title: 'Manage categories',
  description:
    'Creates or edits a category or subcategory, archives or restores it, or sets whether it is a need, want or saving. ' +
    'A subcategory takes its group’s kind and color. Icons are lucide names, e.g. coffee, utensils, car, house, shopping-bag, gift, plane, tag.',
  inputSchema: {
    type: 'object',
    properties: {
      action: { type: 'string', enum: ['create', 'update', 'archive', 'unarchive'] },
      category: { type: 'string', description: 'For update/archive/unarchive: name, "Parent › Child" or id' },
      kind: { type: 'string', enum: ['expense', 'income'], description: 'Default expense' },
      name: { type: 'string' },
      parent: { type: 'string', description: 'Make it a subcategory of this group (name or id)' },
      nature: { type: 'string', enum: [...NATURES] },
      icon: { type: 'string' },
    },
    required: ['action'],
    additionalProperties: false,
  },
  annotations: WRITES,
  async run(args) {
    const lk = await loadLookups();
    const action = oneOf(args.action, 'action', ['create', 'update', 'archive', 'unarchive'] as const)!;
    const kind: CategoryKind = oneOf(args.kind, 'kind', ['expense', 'income'] as const) ?? 'expense';
    const parentOf = async (k: CategoryKind): Promise<Category | null> => {
      if (!args.parent) return null;
      const p = await resolveCategory(args.parent, k, lk, 'parent');
      if (p?.parentId) throw new InputError('parent must be a top-level category (groups only go one level deep)');
      return p;
    };
    if (action === 'create') {
      const name = text(args.name, 'name', 60);
      if (!name) throw new InputError('name is required');
      const parent = await parentOf(kind);
      const nature = oneOf(args.nature, 'nature', NATURES) ?? 'none';
      return changed('manage_categories', async () => {
        const id = await saveCategory({
          parentId: parent?.id ?? null,
          name,
          kind: parent?.kind ?? kind,
          icon: text(args.icon, 'icon', 40) ?? parent?.icon ?? 'tag',
          color: parent?.color ?? CATEGORY_COLORS[lk.categories.filter((c) => !c.parentId).length % CATEGORY_COLORS.length],
          nature,
        });
        return { value: { created: { id, path: parent ? `${parent.name} › ${name}` : name } }, summary: `Created category ${parent ? `${parent.name} › ` : ''}${name}` };
      });
    }
    let cat = await resolveCategory(args.category, kind, lk).catch(() => null);
    if (!cat && !args.kind) cat = await resolveCategory(args.category, 'income', lk);
    if (!cat) throw new InputError('category is required');
    const target = cat;
    const path = categoryPath(target.id, lk) ?? target.name;
    if (action === 'archive' || action === 'unarchive') {
      if (action === 'archive' && isSystemCategory(target.id)) throw new InputError(`${path} is used by Mula itself and can’t be archived`);
      return changed('manage_categories', async () => {
        if (action === 'archive') await setCategoryArchived(target.id, true);
        else await restoreCategory(target.id);
        return { value: { [action === 'archive' ? 'archived' : 'restored']: path }, summary: `${action === 'archive' ? 'Archived' : 'Restored'} category ${path}` };
      });
    }
    const parent = args.parent ? await parentOf(target.kind) : target.parentId ? (lk.categoryById.get(target.parentId) ?? null) : null;
    if (parent?.id === target.id) throw new InputError('A category can’t be its own parent');
    if (args.parent && lk.categories.some((c) => c.parentId === target.id)) throw new InputError(`${path} has subcategories, so it has to stay a group`);
    const nature = oneOf(args.nature, 'nature', NATURES);
    return changed('manage_categories', async () => {
      if (args.name || args.parent || args.icon) {
        await saveCategory({
          id: target.id,
          parentId: parent?.id ?? null,
          name: text(args.name, 'name', 60) ?? target.name,
          kind: target.kind,
          icon: text(args.icon, 'icon', 40) ?? target.icon,
          color: parent?.color ?? target.color,
          nature: nature ?? target.nature,
        });
      } else if (nature) {
        await setCategoryNature(target.id, nature);
      }
      return { value: { updated: target.id }, summary: `Edited category ${path}` };
    });
  },
};

/* ---------- Payees ---------- */

const payeesTool: Tool = {
  name: 'manage_payees',
  title: 'Manage payees',
  description:
    'Creates, renames or edits a payee (usual category and account, auto-confirm), merges duplicates, deletes one, or maps a bank’s ' +
    'raw name (e.g. "PAYMOB Sample Coffee Co") to a payee so future messages are recognized. relabel_past also moves records filed under the payee that name used to map to.',
  inputSchema: {
    type: 'object',
    properties: {
      action: { type: 'string', enum: ['create', 'update', 'merge', 'delete', 'add_bank_name', 'remove_bank_name'] },
      payee: { type: 'string', description: 'Name or id (for create: the new name)' },
      name: { type: 'string', description: 'For update: a new name' },
      kind: { type: 'string', enum: ['merchant', 'person'] },
      usual_category: { type: ['string', 'null'] },
      usual_account: { type: ['string', 'null'] },
      auto_confirm: { type: 'boolean', description: 'Bank messages from this payee skip review' },
      note: { type: ['string', 'null'] },
      into: { type: 'string', description: 'For merge: the payee to keep' },
      bank_name: { type: 'string', description: 'For add_bank_name/remove_bank_name' },
      relabel_past: { type: 'boolean' },
    },
    required: ['action'],
    additionalProperties: false,
  },
  annotations: DESTRUCTIVE,
  async run(args) {
    const lk = await loadLookups();
    const action = oneOf(args.action, 'action', ['create', 'update', 'merge', 'delete', 'add_bank_name', 'remove_bank_name'] as const)!;
    if (action === 'remove_bank_name') {
      const raw = text(args.bank_name, 'bank_name', 120);
      if (!raw) throw new InputError('bank_name is required');
      return changed('manage_payees', async () => {
        await removeAlias(raw);
        return { value: { removed: raw }, summary: `Forgot bank name ${raw}` };
      });
    }
    const usual = async (p: { defaultCategoryId: ID | null; defaultAccountId: ID | null }) => ({
      defaultCategoryId:
        args.usual_category === null ? null : args.usual_category ? ((await resolveCategory(args.usual_category, 'expense', lk).catch(() => null)) ?? (await resolveCategory(args.usual_category, 'income', lk)))!.id : p.defaultCategoryId,
      defaultAccountId: args.usual_account === null ? null : args.usual_account ? resolveAccount(args.usual_account, lk, 'usual_account')!.id : p.defaultAccountId,
    });
    if (action === 'create') {
      const name = text(args.payee, 'payee', 80);
      if (!name) throw new InputError('payee (the name) is required');
      if (await findPayeeByName(name)) throw new InputError(`${name} already exists; use update`);
      const defaults = await usual({ defaultCategoryId: null, defaultAccountId: null });
      return changed('manage_payees', async () => {
        const p = (await resolvePayee(name, lk, { create: true, kind: oneOf(args.kind, 'kind', ['merchant', 'person'] as const) ?? 'merchant' }))!;
        await updatePayee({ id: p.id, name: p.name, kind: p.kind, ...defaults, autoConfirm: flag(args.auto_confirm, 'auto_confirm') ?? false, note: text(args.note, 'note', 300) });
        return { value: { created: { id: p.id, name: p.name } }, summary: `Created payee ${p.name}` };
      });
    }
    const payee = await resolvePayee(args.payee, lk, { create: false });
    if (!payee) throw new InputError('payee is required');
    if (action === 'merge') {
      const into = await resolvePayee(args.into, lk, { create: false }, 'into');
      if (!into) throw new InputError('into is required');
      if (into.id === payee.id) throw new InputError('Those are the same payee');
      return changed('manage_payees', async () => {
        await mergePayees(payee.id, into.id);
        return { value: { merged: payee.name, into: into.name }, summary: `Merged ${payee.name} into ${into.name}` };
      });
    }
    if (action === 'delete') {
      return changed('manage_payees', async () => {
        await deletePayee(payee.id);
        return { value: { deleted: payee.name }, summary: `Deleted payee ${payee.name} (records kept without a payee)` };
      });
    }
    if (action === 'add_bank_name') {
      const raw = text(args.bank_name, 'bank_name', 120);
      if (!raw) throw new InputError('bank_name is required');
      return changed('manage_payees', async () => {
        await setAlias(raw, payee.id, { relabelPast: flag(args.relabel_past, 'relabel_past') ?? false });
        return { value: { bank_name: raw, payee: payee.name }, summary: `"${raw}" now means ${payee.name}` };
      });
    }
    const name = text(args.name, 'name', 80) ?? payee.name;
    const clash = name.toLowerCase() !== payee.name.toLowerCase() ? await findPayeeByName(name) : null;
    if (clash) throw new InputError(`${clash.name} already exists; merge into it instead`);
    const defaults = await usual(payee);
    return changed('manage_payees', async () => {
      await updatePayee({
        id: payee.id,
        name,
        kind: oneOf(args.kind, 'kind', ['merchant', 'person'] as const) ?? payee.kind,
        ...defaults,
        autoConfirm: flag(args.auto_confirm, 'auto_confirm') ?? payee.autoConfirm,
        note: args.note === null ? null : (text(args.note, 'note', 300) ?? payee.note),
      });
      return { value: { updated: { id: payee.id, name } }, summary: name !== payee.name ? `Renamed ${payee.name} to ${name}` : `Edited payee ${name}` };
    });
  },
};

/* ---------- Planned payments and templates ---------- */

const FREQUENCIES = ['daily', 'weekly', 'monthly', 'yearly'] as const satisfies readonly Frequency[];
const ENDS = ['never', 'until', 'count'] as const satisfies readonly RecurringEnd[];

const plannedTool: Tool = {
  name: 'manage_planned_payments',
  title: 'Manage planned payments and templates',
  description:
    'Planned (recurring) payments: create, update, pause, resume, delete. Mula on the phone logs them when due ("auto") or asks first ' +
    '("confirm", the default). A start date in the past does not log the missed dates unless log_missed is true. ' +
    'Templates: create_template, update_template, delete_template.',
  inputSchema: {
    type: 'object',
    properties: {
      action: { type: 'string', enum: ['create', 'update', 'pause', 'resume', 'delete', 'create_template', 'update_template', 'delete_template'] },
      id: { type: 'string', description: 'For everything except create/create_template' },
      name: { type: 'string' },
      type: { type: 'string', enum: [...TX_TYPES] },
      amount: { type: 'number', exclusiveMinimum: 0 },
      currency: {
        type: 'string',
        description:
          'Currency the amount is charged in, e.g. EGP for a subscription billed in pounds on a USD card. Default: the account’s. ' +
          'Converted to the account’s currency at the rate of each payment date when it is logged.',
      },
      account: { type: 'string' },
      to_account: { type: 'string' },
      category: { type: 'string' },
      payee: { type: 'string' },
      payment_type: { type: 'string', enum: [...PAYMENT_TYPES] },
      instapay: { type: 'boolean' },
      note: { type: ['string', 'null'] },
      frequency: { type: 'string', enum: [...FREQUENCIES] },
      interval: { type: 'integer', minimum: 1, maximum: 365, description: 'Every N periods (default 1)' },
      start_date: { type: 'string', description: 'First due date, e.g. 2026-11-01' },
      ends: { type: 'string', enum: [...ENDS] },
      end_date: { type: 'string' },
      end_count: { type: 'integer', minimum: 1 },
      mode: { type: 'string', enum: ['auto', 'confirm'] },
      remind_days_before: { type: 'integer', minimum: 0, maximum: 30 },
      log_missed: { type: 'boolean', description: 'create/resume: also log dates that are already past' },
    },
    required: ['action'],
    additionalProperties: false,
  },
  annotations: DESTRUCTIVE,
  async run(args) {
    const lk = await loadLookups();
    const action = oneOf(args.action, 'action', ['create', 'update', 'pause', 'resume', 'delete', 'create_template', 'update_template', 'delete_template'] as const);
    if (!action) throw new InputError('action is required');
    const logMissed = flag(args.log_missed, 'log_missed') ?? false;

    /** The transaction fields shared by templates and planned payments. */
    const preset = async (prev: TxPreset | null): Promise<TxPreset> => {
      const type = oneOf(args.type, 'type', TX_TYPES) ?? prev?.type ?? 'expense';
      const account = resolveAccount(args.account, lk) ?? (prev?.accountId ? (lk.accountById.get(prev.accountId) ?? null) : null);
      const toAccount =
        type === 'transfer' ? (resolveAccount(args.to_account, lk, 'to_account') ?? (prev?.toAccountId ? (lk.accountById.get(prev.toAccountId) ?? null) : null)) : null;
      const cat = type === 'transfer' ? null : await resolveCategory(args.category, type === 'income' ? 'income' : 'expense', lk);
      const payee = (await resolvePayee(args.payee, lk, { create: true })) ?? (prev?.payeeId ? (lk.payeeById.get(prev.payeeId) ?? null) : null);
      const isInstapay = flag(args.instapay, 'instapay') ?? prev?.isInstapay ?? false;
      const typed = currencyIn(args.currency);
      if (typed && !(CURRENCIES as readonly string[]).includes(typed)) throw new InputError(`currency must be one of ${CURRENCIES.join(', ')}`);
      // A charge currency set on purpose (unlike its account's) survives updates; otherwise it follows the account.
      const prevAccount = prev?.accountId ? (lk.accountById.get(prev.accountId) ?? null) : null;
      const kept = prev?.currency && prev.currency !== prevAccount?.currency ? prev.currency : null;
      return {
        type,
        amount: amountIn(args.amount, 'amount') ?? prev?.amount ?? null,
        // InstaPay is EGP-only, so it always uses the account's currency.
        currency: isInstapay ? (account?.currency ?? lk.base) : (typed ?? kept ?? account?.currency ?? prev?.currency ?? lk.base),
        accountId: account?.id ?? null,
        toAccountId: toAccount?.id ?? null,
        categoryId: type === 'transfer' ? null : (cat?.id ?? (prev?.type === type ? prev.categoryId : null) ?? payee?.defaultCategoryId ?? null),
        payeeId: payee?.id ?? null,
        paymentType:
          oneOf(args.payment_type, 'payment_type', PAYMENT_TYPES) ?? (flag(args.instapay, 'instapay') ? 'instapay' : (prev?.paymentType ?? account?.defaultPaymentType ?? null)),
        note: args.note === null ? null : (text(args.note, 'note', 500) ?? prev?.note ?? null),
        isInstapay,
      };
    };

    if (action === 'create_template' || action === 'update_template' || action === 'delete_template') {
      const existing = action === 'create_template' ? null : await getTemplate(String(args.id ?? ''));
      if (action !== 'create_template' && !existing) throw new InputError('id must be a template id (see list_planned_payments)');
      return changed('manage_planned_payments', async () => {
        if (action === 'delete_template') {
          await deleteTemplate(existing!.id);
          return { value: { deleted_template: existing!.name }, summary: `Deleted template ${existing!.name}` };
        }
        const name = text(args.name, 'name', 60) ?? existing?.name;
        if (!name) throw new InputError('A template needs a name');
        const input: TemplateInput = { ...(await preset(existing)), id: existing?.id, name };
        const id = await saveTemplate(input);
        return { value: { template: { id, name } }, summary: `${existing ? 'Edited' : 'Created'} template ${name}` };
      });
    }

    const existing = action === 'create' ? null : await getRecurring(String(args.id ?? ''));
    if (action !== 'create' && !existing) throw new InputError('id must be a planned payment id (see list_planned_payments)');
    return changed('manage_planned_payments', async () => {
      if (action === 'delete') {
        await deleteRecurring(existing!.id);
        return { value: { deleted: existing!.name }, summary: `Deleted planned payment ${existing!.name}` };
      }
      if (action === 'pause' || action === 'resume') {
        await setRecurringActive(existing!.id, action === 'resume');
        const skipped = action === 'resume' && !logMissed ? await skipMissedRecurring(existing!.id) : 0;
        return {
          value: { [action === 'pause' ? 'paused' : 'resumed']: existing!.name, ...(skipped ? { skipped_missed_dates: skipped } : {}) },
          summary: `${action === 'pause' ? 'Paused' : 'Resumed'} ${existing!.name}`,
        };
      }
      const fields = await preset(existing);
      const name = text(args.name, 'name', 60) ?? existing?.name ?? (fields.payeeId ? lk.payeeById.get(fields.payeeId)?.name : null);
      if (!name) throw new InputError('A planned payment needs a name');
      if (!fields.accountId) throw new InputError('account is required');
      if (!fields.amount) throw new InputError('amount is required');
      if (fields.type === 'transfer' && !fields.toAccountId) throw new InputError('A transfer needs to_account');
      if (fields.type !== 'transfer' && !fields.categoryId) throw new InputError('category is required');
      const ends = oneOf(args.ends, 'ends', ENDS) ?? existing?.endType ?? 'never';
      const input: RecurringInput = {
        ...fields,
        id: existing?.id,
        name,
        frequency: oneOf(args.frequency, 'frequency', FREQUENCIES) ?? existing?.frequency ?? 'monthly',
        interval: args.interval != null ? Math.max(1, Math.round(Number(args.interval))) : (existing?.interval ?? 1),
        startDate: momentIn(args.start_date, lk, 'start_date', 'noon') ?? existing?.startDate ?? Date.now(),
        endType: ends,
        endDate: ends === 'until' ? (momentIn(args.end_date, lk, 'end_date', 'end') ?? existing?.endDate ?? null) : null,
        endCount: ends === 'count' ? (args.end_count != null ? Math.max(1, Math.round(Number(args.end_count))) : (existing?.endCount ?? null)) : null,
        mode: oneOf(args.mode, 'mode', ['auto', 'confirm'] as const) ?? existing?.mode ?? 'confirm',
        remindDaysBefore: args.remind_days_before != null ? Math.round(Number(args.remind_days_before)) : (existing?.remindDaysBefore ?? 1),
        active: existing?.active ?? true,
      };
      if (input.endType === 'until' && !input.endDate) throw new InputError('ends "until" needs end_date');
      if (input.endType === 'count' && !input.endCount) throw new InputError('ends "count" needs end_count');
      const id = await saveRecurring(input);
      // Like the app: a new or rescheduled series doesn't log the dates already behind it.
      const skipped = logMissed ? 0 : await skipMissedRecurring(id);
      const after = await getRecurring(id);
      return {
        value: {
          planned_payment: { id, name, next_due: after?.nextDue ? formatLocal(after.nextDue, lk.tz).slice(0, 10) : null },
          ...(skipped ? { skipped_past_dates: skipped } : {}),
        },
        summary: `${existing ? 'Edited' : 'Created'} planned payment ${name}`,
      };
    });
  },
};

/* ---------- Debts ---------- */

const debtsTool: Tool = {
  name: 'manage_debts',
  title: 'Manage debts',
  description:
    'Records money lent or borrowed (with the money leaving or arriving on an account, unless record_movement is false), records a repayment, ' +
    'closes, reopens, edits or deletes a debt. Debt movements never count as spending or income. Lending over InstaPay books the fee as spending.',
  inputSchema: {
    type: 'object',
    properties: {
      action: { type: 'string', enum: ['create', 'repay', 'close', 'reopen', 'update', 'delete'] },
      id: { type: 'string', description: 'For everything except create' },
      direction: { type: 'string', enum: ['lent', 'borrowed'] },
      person: { type: 'string', description: 'Name or payee id' },
      amount: { type: 'number', exclusiveMinimum: 0 },
      currency: { type: 'string' },
      account: { type: 'string' },
      date: { type: 'string' },
      due_date: { type: ['string', 'null'] },
      note: { type: ['string', 'null'] },
      record_movement: { type: 'boolean', description: 'create: also book the money on the account (default true when an account is given)' },
      instapay: { type: 'boolean' },
      payment_type: { type: 'string', enum: [...PAYMENT_TYPES] },
      delete_transactions: { type: 'boolean', description: 'delete: also delete the loan and repayment records (default false keeps them, unlinked)' },
    },
    required: ['action'],
    additionalProperties: false,
  },
  annotations: DESTRUCTIVE,
  async run(args) {
    const lk = await loadLookups();
    const action = oneOf(args.action, 'action', ['create', 'repay', 'close', 'reopen', 'update', 'delete'] as const)!;
    if (action === 'create') {
      const direction = oneOf(args.direction, 'direction', ['lent', 'borrowed'] as const);
      if (!direction) throw new InputError('direction (lent or borrowed) is required');
      const amount = amountIn(args.amount, 'amount');
      if (!amount) throw new InputError('amount is required');
      const account = resolveAccount(args.account, lk);
      const instapay = flag(args.instapay, 'instapay') ?? false;
      const date = momentIn(args.date, lk, 'date') ?? Date.now();
      const due = momentIn(args.due_date, lk, 'due_date', 'end');
      const personName = text(args.person, 'person', 80);
      if (!personName) throw new InputError('person is required');
      return changed('manage_debts', async () => {
        const person = (await resolvePayee(personName, lk, { create: true, kind: 'person' }))!;
        const id = await saveDebt(
          { direction, payeeId: person.id, accountId: account?.id ?? null, amount, currency: account?.currency ?? currencyIn(args.currency) ?? lk.base, date, dueDate: due, note: text(args.note, 'note', 300) },
          { recordMovement: (flag(args.record_movement, 'record_movement') ?? true) && Boolean(account), instapay, paymentType: oneOf(args.payment_type, 'payment_type', PAYMENT_TYPES) ?? account?.defaultPaymentType },
        );
        return { value: { debt: { id, direction, person: person.name, amount: major(amount) } }, summary: `${direction === 'lent' ? 'Lent' : 'Borrowed'} ${major(amount)} ${direction === 'lent' ? 'to' : 'from'} ${person.name}` };
      });
    }
    const debt = await getDebt(String(args.id ?? ''));
    if (!debt) throw new InputError('id must be a debt id (see list_debts)');
    if (action === 'repay') {
      const amount = amountIn(args.amount, 'amount');
      if (!amount) throw new InputError('amount is required');
      const account = resolveAccount(args.account, lk) ?? (debt.accountId ? (lk.accountById.get(debt.accountId) ?? null) : null);
      if (!account) throw new InputError('account is required');
      const instapay = flag(args.instapay, 'instapay') ?? false;
      return changed('manage_debts', async () => {
        await addRepayment(debt.id, {
          amount,
          accountId: account.id,
          date: momentIn(args.date, lk, 'date') ?? Date.now(),
          paymentType: oneOf(args.payment_type, 'payment_type', PAYMENT_TYPES) ?? (instapay ? 'instapay' : account.defaultPaymentType),
          note: text(args.note, 'note', 300),
          isInstapay: instapay,
          fee: instapay && debt.direction === 'borrowed' ? instapayFee(amount, getSettings().instapayFee) : null,
        });
        const after = await getDebt(debt.id);
        return { value: { debt: debt.id, remaining: major(after?.remaining), status: after?.status }, summary: `Repayment of ${major(amount)} on ${debt.payeeName}’s debt` };
      });
    }
    if (action === 'close' || action === 'reopen') {
      return changed('manage_debts', async () => {
        await setDebtStatus(debt.id, action === 'close' ? 'closed' : 'open');
        return { value: { debt: debt.id, status: action === 'close' ? 'closed' : 'open' }, summary: `${action === 'close' ? 'Closed' : 'Reopened'} the debt with ${debt.payeeName}` };
      });
    }
    if (action === 'delete') {
      const withRecords = flag(args.delete_transactions, 'delete_transactions') ?? false;
      return changed('manage_debts', async () => {
        await deleteDebt(debt.id, { deleteTransactions: withRecords });
        return { value: { deleted: debt.id }, summary: `Deleted the debt with ${debt.payeeName}` };
      });
    }
    return changed('manage_debts', async () => {
      const person = args.person ? await resolvePayee(args.person, lk, { create: true, kind: 'person' }) : null;
      await saveDebt({
        id: debt.id,
        direction: oneOf(args.direction, 'direction', ['lent', 'borrowed'] as const) ?? debt.direction,
        payeeId: person?.id ?? debt.payeeId,
        accountId: args.account ? resolveAccount(args.account, lk)!.id : debt.accountId,
        amount: amountIn(args.amount, 'amount') ?? debt.amount,
        currency: debt.currency,
        date: momentIn(args.date, lk, 'date') ?? debt.date,
        dueDate: args.due_date === null ? null : (momentIn(args.due_date, lk, 'due_date', 'end') ?? debt.dueDate),
        note: args.note === null ? null : (text(args.note, 'note', 300) ?? debt.note),
      });
      return { value: { updated: debt.id }, summary: `Edited the debt with ${person?.name ?? debt.payeeName}` };
    });
  },
};

/* ---------- Settings and undo ---------- */

const settingsTool: Tool = {
  name: 'update_settings',
  title: 'Update Mula settings',
  description: 'Changes the InstaPay fee rule (percent of the amount, with a minimum and maximum) or how close in time an Apple Pay entry must be to its bank message to be merged.',
  inputSchema: {
    type: 'object',
    properties: {
      instapay_fee_percent: { type: 'number', minimum: 0, maximum: 10 },
      instapay_fee_min: { type: 'number', minimum: 0 },
      instapay_fee_max: { type: 'number', minimum: 0 },
      merge_window_minutes: { type: 'integer', minimum: 1, maximum: 120 },
    },
    additionalProperties: false,
  },
  annotations: WRITES,
  async run(args) {
    const s = getSettings();
    const percent = args.instapay_fee_percent != null ? Number(args.instapay_fee_percent) : s.instapayFee.percent;
    if (!Number.isFinite(percent) || percent < 0 || percent > 10) throw new InputError('instapay_fee_percent must be between 0 and 10');
    const rule = {
      percent,
      min: amountIn(args.instapay_fee_min, 'instapay_fee_min', { allowZero: true }) ?? s.instapayFee.min,
      max: amountIn(args.instapay_fee_max, 'instapay_fee_max', { allowZero: true }) ?? s.instapayFee.max,
    };
    if (rule.max < rule.min) throw new InputError('instapay_fee_max must be at least instapay_fee_min');
    const window = args.merge_window_minutes != null ? Math.round(Number(args.merge_window_minutes)) : s.mergeWindowMinutes;
    const feeChanged = args.instapay_fee_percent != null || args.instapay_fee_min != null || args.instapay_fee_max != null;
    return changed('update_settings', async () => {
      if (feeChanged) await setSetting('instapayFee', rule);
      if (window !== s.mergeWindowMinutes) await setSetting('mergeWindowMinutes', window);
      return {
        value: { instapay_fee: { percent: rule.percent, min: major(rule.min), max: major(rule.max) }, merge_window_minutes: window },
        summary: `Settings: InstaPay fee ${rule.percent}% (${major(rule.min)}–${major(rule.max)}), merge window ${window} min`,
      };
    });
  },
};

const undoTool: Tool = {
  name: 'undo_claude_change',
  title: 'Undo a change',
  description: 'Reverses one of your earlier changes (ids from list_claude_changes or a tool result). Records edited again since then are left alone.',
  inputSchema: { type: 'object', properties: { change_id: { type: 'string' } }, required: ['change_id'], additionalProperties: false },
  annotations: DESTRUCTIVE,
  async run(args) {
    const id = text(args.change_id, 'change_id', 100);
    if (!id) throw new InputError('change_id is required');
    const r = await undoChange(id);
    return ok({ undone: r.summary, records_restored: r.restored, ...(r.skipped ? { left_alone: r.skipped, why: 'changed again after your edit' } : {}) });
  },
};

export const writeTools: Tool[] = [...transactionTools, reviewTool, accountsTool, categoriesTool, payeesTool, plannedTool, debtsTool, settingsTool, undoTool];
