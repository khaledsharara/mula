/** Claude's read-only tools: overview, catalog, search, reports, SQL, inbox, plans, debts. */
import { listDebts } from '../../../src/modules/debts/data/debtsRepo';
import { buildSuggestion, listInbox, pendingSummary } from '../../../src/modules/inbox/data/inboxRepo';
import { SMS_KIND_LABEL } from '../../../src/modules/inbox/utils/parser';
import { loadStats } from '../../../src/modules/insights/data/insightsData';
import { isEarn, isSpend, natureOf, natureSplit, totals } from '../../../src/modules/insights/utils/aggregations';
import { listAliases } from '../../../src/modules/payees/data/payeesRepo';
import { listRecurring, listUpcoming } from '../../../src/modules/recurring/data/recurringRepo';
import { all } from '../../../src/modules/shared/db/client';
import type { Transaction } from '../../../src/modules/shared/db/types';
import { listTemplates } from '../../../src/modules/templates/data/templatesRepo';
import { rowToTx, type TxRow } from '../../../src/modules/transactions/data/transactionsRepo';
import { listActivity } from '../changes';
import { formatDay, formatLocal, localParts, PERIODS, resolvePeriod } from '../dates';
import { getMeta } from '../sync';
import {
  InputError,
  TX_TYPES,
  amountIn,
  balancesOut,
  categoryPath,
  flag,
  loadLookups,
  major,
  ok,
  oneOf,
  resolveAccount,
  resolveCategory,
  text,
  txOut,
  type Lookups,
  type Tool,
} from './shared';

const READ_ONLY = { readOnlyHint: true, openWorldHint: false };

const periodProps = {
  period: { type: 'string', enum: [...PERIODS], description: 'A named period in the user’s time zone. Ignored when from/to are given. Default this_month.' },
  from: { type: 'string', description: 'Start date, e.g. 2026-10-01 (inclusive, the user’s time zone)' },
  to: { type: 'string', description: 'End date, e.g. 2026-10-31 (inclusive)' },
};

function periodOf(args: Record<string, unknown>, lk: Lookups) {
  const p = resolvePeriod(args, lk.tz);
  if ('error' in p) throw new InputError(p.error);
  return p;
}

/** A category and, by default, its subcategories. */
function categoryIds(id: string, lk: Lookups, withChildren: boolean): string[] {
  return withChildren ? [id, ...lk.categories.filter((c) => c.parentId === id).map((c) => c.id)] : [id];
}

async function phoneSyncedAt(lk: Lookups): Promise<string | null> {
  const at = Number(await getMeta('last_push_at'));
  return at ? formatLocal(at, lk.tz) : null;
}

export const readTools: Tool[] = [
  {
    name: 'get_overview',
    title: 'Money overview',
    description:
      'Start here. Balances per account, this month and last month (spent, earned, needs vs wants), the review inbox, ' +
      'planned payments in the next 14 days and open debts. Amounts are in major units; totals are in the base currency.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    annotations: READ_ONLY,
    async run() {
      const lk = await loadLookups();
      const thisMonth = periodOf({ period: 'this_month' }, lk);
      const lastMonth = periodOf({ period: 'last_month' }, lk);
      const summary = async (from: number, to: number) => {
        const s = await loadStats(from, to);
        const t = totals(s.txs, s.ctx);
        const n = natureSplit(s.txs, s.ctx);
        return { spent: major(t.spent), earned: major(t.earned), net: major(t.net), records: t.count, needs: major(n.need), wants: major(n.want), savings: major(n.saving), unclassified: major(n.none) };
      };
      const pending = await pendingSummary();
      const upcoming = (await listUpcoming(14)).slice(0, 20).map((u) => ({
        id: u.recurring.id,
        name: u.recurring.name,
        date: formatDay(u.date, lk.tz),
        type: u.recurring.type,
        amount: major(u.recurring.amount),
        currency: u.recurring.currency,
        mode: u.recurring.mode === 'auto' ? 'logged automatically' : 'asks to confirm',
      }));
      const debts = (await listDebts()).filter((d) => d.status === 'open');
      const owed = (dir: 'lent' | 'borrowed') =>
        debts
          .filter((d) => d.direction === dir)
          .reduce<Record<string, number>>((m, d) => ({ ...m, [d.currency]: (m[d.currency] ?? 0) + (major(d.remaining) ?? 0) }), {});
      const accounts = (await balancesOut(lk)).filter((a) => !a.archived);
      return ok({
        base_currency: lk.base,
        time_zone: lk.tz,
        now: formatLocal(Date.now(), lk.tz),
        phone_last_synced: await phoneSyncedAt(lk),
        accounts,
        this_month: await summary(thisMonth.from, thisMonth.to),
        last_month: await summary(lastMonth.from, lastMonth.to),
        review_inbox: { waiting: pending.count, oldest: pending.oldest ? formatLocal(pending.oldest, lk.tz) : null },
        upcoming_planned_payments: upcoming,
        debts: { open: debts.length, owed_to_me: owed('lent'), i_owe: owed('borrowed') },
      });
    },
  },

  {
    name: 'get_catalog',
    title: 'Accounts, categories, payees and templates',
    description: 'Every account, category (with its parent and need/want nature), payee (with defaults and the bank names that map to it) and template, with ids to use in other tools.',
    inputSchema: {
      type: 'object',
      properties: { include_archived: { type: 'boolean', description: 'Also list archived accounts and categories' } },
      additionalProperties: false,
    },
    annotations: READ_ONLY,
    async run(args) {
      const lk = await loadLookups();
      const archived = flag(args.include_archived, 'include_archived') ?? false;
      const aliases = await all<{ raw: string; payee_id: string }>('SELECT raw, payee_id FROM payee_aliases');
      const aliasMap = new Map<string, string[]>();
      for (const a of aliases) aliasMap.set(a.payee_id, [...(aliasMap.get(a.payee_id) ?? []), a.raw]);
      const templates = await listTemplates();
      return ok({
        base_currency: lk.base,
        accounts: (await balancesOut(lk)).filter((a) => archived || !a.archived),
        categories: lk.categories
          .filter((c) => archived || !c.archived)
          .map((c) => ({
            id: c.id,
            name: c.name,
            ...(c.parentId ? { parent: lk.categoryById.get(c.parentId)?.name ?? c.parentId } : {}),
            kind: c.kind,
            ...(c.nature !== 'none' ? { nature: c.nature } : {}),
            ...(c.archived ? { archived: true } : {}),
          })),
        payees: lk.payees.map((p) => ({
          id: p.id,
          name: p.name,
          kind: p.kind,
          ...(p.defaultCategoryId ? { usual_category: categoryPath(p.defaultCategoryId, lk) } : {}),
          ...(p.defaultAccountId ? { usual_account: lk.accountById.get(p.defaultAccountId)?.name } : {}),
          ...(p.autoConfirm ? { auto_confirm: true } : {}),
          ...(aliasMap.get(p.id)?.length ? { bank_names: aliasMap.get(p.id) } : {}),
          ...(p.note ? { note: p.note } : {}),
        })),
        templates: templates.map((t) => ({
          id: t.id,
          name: t.name,
          type: t.type,
          amount: major(t.amount),
          account: t.accountId ? lk.accountById.get(t.accountId)?.name : null,
          category: categoryPath(t.categoryId, lk),
          payee: t.payeeId ? lk.payeeById.get(t.payeeId)?.name : null,
        })),
      });
    },
  },

  {
    name: 'find_transactions',
    title: 'Find transactions',
    description:
      'Searches records (newest first) with totals. Filters combine. Fee rows are folded into their record as "fee". ' +
      'Use the returned ids with update_transactions or delete_transactions.',
    inputSchema: {
      type: 'object',
      properties: {
        ...periodProps,
        period: { ...periodProps.period, description: 'Named period; default all_time when no from/to is given.' },
        account: { type: 'string', description: 'Account name or id' },
        category: { type: 'string', description: 'Category name, "Parent › Child" or id' },
        include_subcategories: { type: 'boolean', description: 'With category: include its subcategories (default true)' },
        uncategorized: { type: 'boolean', description: 'Only expenses/income without a category' },
        payee: { type: 'string', description: 'Payee name or id' },
        type: { type: 'string', enum: [...TX_TYPES] },
        search: { type: 'string', description: 'Text in the note, payee or category name' },
        min_amount: { type: 'number', description: 'In the record’s own currency' },
        max_amount: { type: 'number' },
        source: { type: 'string', enum: ['manual', 'sms', 'applepay', 'claude', 'import', 'recurring'] },
        ids: { type: 'array', items: { type: 'string' }, maxItems: 100, description: 'Fetch these records' },
        sort: { type: 'string', enum: ['newest', 'oldest', 'largest'] },
        limit: { type: 'integer', minimum: 1, maximum: 500, description: 'Default 100' },
        offset: { type: 'integer', minimum: 0 },
      },
      additionalProperties: false,
    },
    annotations: READ_ONLY,
    async run(args) {
      const lk = await loadLookups();
      const where: string[] = ['t.parent_id IS NULL'];
      const params: (string | number)[] = [];
      const ids = Array.isArray(args.ids) ? args.ids.filter((x): x is string => typeof x === 'string').slice(0, 100) : [];
      if (ids.length) {
        where.push(`t.id IN (${ids.map(() => '?').join(',')})`);
        params.push(...ids);
      } else {
        const p = periodOf({ period: args.period ?? (args.from || args.to ? undefined : 'all_time'), from: args.from, to: args.to }, lk);
        where.push('t.date >= ? AND t.date <= ?');
        params.push(p.from, p.to);
      }
      const account = resolveAccount(args.account, lk);
      if (account) {
        where.push('(t.account_id = ? OR t.to_account_id = ?)');
        params.push(account.id, account.id);
      }
      const type = oneOf(args.type, 'type', TX_TYPES);
      if (type) {
        where.push('t.type = ?');
        params.push(type);
      }
      if (args.category) {
        const kind = type === 'income' ? 'income' : 'expense';
        let cat = await resolveCategory(args.category, kind, lk).catch(() => null);
        if (!cat && !type) cat = await resolveCategory(args.category, 'income', lk);
        if (!cat) throw new InputError(`No category matches "${String(args.category)}"`);
        const set = categoryIds(cat.id, lk, flag(args.include_subcategories, 'include_subcategories') ?? true);
        where.push(`t.category_id IN (${set.map(() => '?').join(',')})`);
        params.push(...set);
      }
      if (flag(args.uncategorized, 'uncategorized')) where.push("t.category_id IS NULL AND t.type != 'transfer'");
      const payeeKey = text(args.payee, 'payee');
      if (payeeKey) {
        const payee = lk.payeeById.get(payeeKey) ?? lk.payees.find((p) => p.name.toLowerCase() === payeeKey.toLowerCase());
        if (!payee) return ok({ count: 0, transactions: [], note: `No payee is called "${payeeKey}"; try search instead.` });
        where.push('t.payee_id = ?');
        params.push(payee.id);
      }
      const search = text(args.search, 'search');
      if (search) {
        where.push('(t.note LIKE ? OR p.name LIKE ? OR c.name LIKE ?)');
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      }
      const min = amountIn(args.min_amount, 'min_amount', { allowZero: true });
      const max = amountIn(args.max_amount, 'max_amount', { allowZero: true });
      if (min != null) {
        where.push('t.amount >= ?');
        params.push(min);
      }
      if (max != null) {
        where.push('t.amount <= ?');
        params.push(max);
      }
      const source = text(args.source, 'source');
      if (source) {
        where.push('t.source = ?');
        params.push(source);
      }
      const sort = oneOf(args.sort, 'sort', ['newest', 'oldest', 'largest'] as const) ?? 'newest';
      const order = sort === 'oldest' ? 't.date ASC' : sort === 'largest' ? 't.base_amount DESC' : 't.date DESC, t.created_at DESC';
      const limit = Math.min(500, Math.max(1, Number(args.limit) || 100));
      const offset = Math.max(0, Number(args.offset) || 0);
      const from = 'FROM transactions t LEFT JOIN payees p ON p.id = t.payee_id LEFT JOIN categories c ON c.id = t.category_id';
      const sql = where.join(' AND ');
      const rows = await all<TxRow & { fee_total: number }>(
        `SELECT t.*, (SELECT COALESCE(SUM(x.amount), 0) FROM transactions x WHERE x.parent_id = t.id) AS fee_total ${from} WHERE ${sql} ORDER BY ${order} LIMIT ? OFFSET ?`,
        [...params, limit, offset],
      );
      const sums = await all<{ n: number; spent: number; earned: number }>(
        `SELECT COUNT(*) AS n,
           COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.base_amount END), 0) AS spent,
           COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.base_amount END), 0) AS earned
         ${from} WHERE ${sql}`,
        params,
      );
      return ok({
        count: sums[0]?.n ?? 0,
        [`expenses_total_${lk.base.toLowerCase()}`]: major(sums[0]?.spent ?? 0),
        [`income_total_${lk.base.toLowerCase()}`]: major(sums[0]?.earned ?? 0),
        showing: `${rows.length} from ${offset + 1}`,
        transactions: rows.map((r) => txOut({ ...rowToTx(r), feeTotal: r.fee_total }, lk)),
      });
    },
  },

  {
    name: 'spending_report',
    title: 'Spending or income report',
    description:
      'Totals for a period grouped by category, subcategory, payee, account, month, week, day, weekday, hour or nature (need/want/saving). ' +
      'Counts like Mula’s Insights: transfers and debt movements are excluded, fees count as spending, accounts marked "exclude from stats" are left out. ' +
      'Amounts are in the base currency.',
    inputSchema: {
      type: 'object',
      properties: {
        ...periodProps,
        group_by: { type: 'string', enum: ['category', 'subcategory', 'payee', 'account', 'month', 'week', 'day', 'weekday', 'hour', 'nature'], description: 'Default category' },
        type: { type: 'string', enum: ['expense', 'income'], description: 'Default expense' },
        account: { type: 'string' },
        category: { type: 'string', description: 'Only this category (and its subcategories)' },
        limit: { type: 'integer', minimum: 1, maximum: 100, description: 'Largest groups to return (default 20); time groupings return all' },
      },
      additionalProperties: false,
    },
    annotations: READ_ONLY,
    async run(args) {
      const lk = await loadLookups();
      const p = periodOf(args, lk);
      const type = oneOf(args.type, 'type', ['expense', 'income'] as const) ?? 'expense';
      const groupBy = oneOf(args.group_by, 'group_by', ['category', 'subcategory', 'payee', 'account', 'month', 'week', 'day', 'weekday', 'hour', 'nature'] as const) ?? 'category';
      const account = resolveAccount(args.account, lk);
      const cat = args.category ? await resolveCategory(args.category, type, lk) : null;
      const catSet = cat ? new Set(categoryIds(cat.id, lk, true)) : null;
      const stats = await loadStats(p.from, p.to, account?.id ?? null);
      const counted = stats.txs.filter((t) => (type === 'expense' ? isSpend(t, stats.ctx) : isEarn(t, stats.ctx)) && (!catSet || (t.categoryId != null && catSet.has(t.categoryId))));
      const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const keyOf = (t: Transaction): string => {
        switch (groupBy) {
          case 'category': {
            const c = t.categoryId ? lk.categoryById.get(t.categoryId) : null;
            const top = c?.parentId ? lk.categoryById.get(c.parentId) : c;
            return top?.name ?? 'Uncategorized';
          }
          case 'subcategory':
            return categoryPath(t.categoryId, lk) ?? 'Uncategorized';
          case 'payee':
            return t.payeeId ? (lk.payeeById.get(t.payeeId)?.name ?? 'Unknown payee') : t.parentId ? 'Fees' : 'No payee';
          case 'account':
            return lk.accountById.get(t.accountId)?.name ?? t.accountId;
          case 'month':
            return formatDay(t.date, lk.tz).slice(0, 7);
          case 'week': {
            const d = localParts(t.date, lk.tz);
            const back = (d.weekday + 6) % 7;
            return `week of ${formatDay(t.date - back * 86_400_000, lk.tz)}`;
          }
          case 'day':
            return formatDay(t.date, lk.tz);
          case 'weekday':
            return WEEKDAYS[localParts(t.date, lk.tz).weekday];
          case 'hour':
            return `${String(localParts(t.date, lk.tz).h).padStart(2, '0')}:00`;
          case 'nature':
            return natureOf(t, stats.ctx);
        }
      };
      const groups = new Map<string, { amount: number; count: number }>();
      let total = 0;
      for (const t of counted) {
        const g = groups.get(keyOf(t)) ?? { amount: 0, count: 0 };
        g.amount += t.baseAmount;
        if (!t.parentId) g.count++;
        groups.set(keyOf(t), g);
        total += t.baseAmount;
      }
      const timeline = ['month', 'week', 'day', 'hour'].includes(groupBy);
      let out = [...groups.entries()].map(([label, g]) => ({ label, amount: major(g.amount), records: g.count, share: total ? Math.round((g.amount / total) * 1000) / 10 : 0 }));
      out = timeline ? out.sort((a, b) => a.label.localeCompare(b.label)) : out.sort((a, b) => (b.amount ?? 0) - (a.amount ?? 0));
      if (!timeline) out = out.slice(0, Math.min(100, Math.max(1, Number(args.limit) || 20)));
      return ok({
        period: p.label,
        from: formatDay(p.from || 0, lk.tz),
        to: formatDay(p.to, lk.tz),
        type,
        currency: lk.base,
        total: major(total),
        records: counted.filter((t) => !t.parentId).length,
        groups: out,
      });
    },
  },

  {
    name: 'run_query',
    title: 'Read-only SQL',
    description:
      'Runs one read-only SQLite SELECT on Mula’s database for questions the other tools can’t answer. Results are capped at 500 rows. ' +
      'Amounts are integers in minor units (divide by 100); dates are milliseconds since the epoch (UTC; the user’s zone is in get_overview). ' +
      'Tables: transactions(id, type expense|income|transfer, amount, currency, account_id, to_account_id, to_amount, category_id, payee_id, ' +
      'payment_type, date, note, is_instapay, parent_id (set on fee rows), nature_override, original_amount, original_currency, fx_rate, ' +
      'base_amount (in the base currency), recurring_id, debt_id, source, created_at, updated_at); accounts(id, name, type, currency, ' +
      'initial_balance, identifiers JSON, bank_balance, archived, exclude_from_stats); categories(id, parent_id, name, kind, nature, archived); ' +
      'payees(id, name, kind, default_category_id, default_account_id, auto_confirm); payee_aliases(raw, payee_id); inbox_items(id, source, ' +
      'raw_text, parsed JSON, received_at, status pending|confirmed|dismissed|merged, transaction_id); recurring(...); templates(...); debts(...).',
    inputSchema: {
      type: 'object',
      properties: {
        sql: { type: 'string', description: 'One SELECT (or WITH … SELECT) statement; use ? for parameters' },
        params: { type: 'array', items: { type: ['string', 'number', 'null'] }, maxItems: 50 },
      },
      required: ['sql'],
      additionalProperties: false,
    },
    annotations: READ_ONLY,
    async run(args, ctx) {
      const sql = text(args.sql, 'sql', 20_000);
      if (!sql) throw new InputError('sql is required');
      const body = sql.replace(/;\s*$/, '');
      if (body.includes(';')) throw new InputError('Send one statement at a time');
      if (!/^\s*(select|with)\b/i.test(body)) throw new InputError('Only SELECT queries are allowed here; use the other tools to change data');
      if (/\b(oauth_\w+|_schema_version|undo_ctx|claude_change_rows)\b/i.test(body)) throw new InputError('Those tables are internal to the relay');
      const params = Array.isArray(args.params) ? args.params : [];
      const rows = ctx.query(body, params);
      return ok({ rows: rows.slice(0, 500), ...(rows.length > 500 ? { truncated: true, total_rows: rows.length } : {}) });
    },
  },

  {
    name: 'list_review_inbox',
    title: 'Review inbox',
    description:
      'Bank messages, Apple Pay payments and planned payments waiting for review, newest first, each with what Mula would file it as ' +
      '(account, category, payee, possible duplicate). Resolve them with review_inbox.',
    inputSchema: {
      type: 'object',
      properties: { limit: { type: 'integer', minimum: 1, maximum: 100, description: 'Default 30' } },
      additionalProperties: false,
    },
    annotations: READ_ONLY,
    async run(args) {
      const lk = await loadLookups();
      const items = await listInbox('pending', Math.min(100, Math.max(1, Number(args.limit) || 30)));
      const out = [];
      for (const item of items) {
        const s = await buildSuggestion(item);
        out.push({
          id: item.id,
          received: formatLocal(item.receivedAt, lk.tz),
          source: item.source,
          ...(item.parsed ? { kind: SMS_KIND_LABEL[item.parsed.kind] ?? item.parsed.kind } : {}),
          message: item.rawText.slice(0, 400),
          ...(item.parsed?.counterparty ? { bank_name: item.parsed.counterparty } : {}),
          suggestion: {
            type: s.draft.type,
            amount: major(s.draft.amount),
            currency: s.account?.currency ?? item.parsed?.currency ?? lk.base,
            date: formatLocal(s.draft.date, lk.tz),
            account: s.account?.name ?? null,
            ...(s.toAccount ? { to_account: s.toAccount.name } : {}),
            category: categoryPath(s.draft.categoryId ?? null, lk),
            payee: s.payee?.name ?? s.suggestedName ?? null,
            ...(s.needsPayee ? { needs_payee: 'InstaPay messages don’t say who received the money' } : {}),
            ...(s.draft.fee ? { fee: major(s.draft.fee) } : {}),
            ...(s.original ? { charged: { amount: major(s.original.amount), currency: s.original.currency, rate: s.original.rate } } : {}),
            ...(s.unconverted
              ? { needs_exchange_rate: { amount: major(s.unconverted.amount), currency: s.unconverted.currency, note: 'No rate yet: pass amount in the account’s currency to confirm' } }
              : {}),
            ready_to_confirm: s.ready,
          },
          ...(s.possibleDuplicate ? { possible_duplicate: txOut(s.possibleDuplicate, lk) } : {}),
          ...(s.recurringMatch ? { looks_like_planned_payment: s.recurringMatch.name } : {}),
          ...(s.openDebts.length ? { open_debts_with_this_person: s.openDebts.map((d) => ({ id: d.id, direction: d.direction, remaining: major(d.remaining) })) } : {}),
        });
      }
      const pending = await pendingSummary();
      return ok({ waiting: pending.count, items: out });
    },
  },

  {
    name: 'list_planned_payments',
    title: 'Planned payments and templates',
    description: 'Recurring (planned) payments with their schedule, what is due in the next 30 days, and saved templates.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    annotations: READ_ONLY,
    async run() {
      const lk = await loadLookups();
      const recurring = await listRecurring();
      const upcoming = await listUpcoming(30);
      const templates = await listTemplates();
      return ok({
        planned_payments: recurring.map((r) => ({
          id: r.id,
          name: r.name,
          type: r.type,
          amount: major(r.amount),
          currency: r.currency,
          account: r.accountId ? lk.accountById.get(r.accountId)?.name : null,
          ...(r.toAccountId ? { to_account: lk.accountById.get(r.toAccountId)?.name } : {}),
          category: categoryPath(r.categoryId, lk),
          payee: r.payeeId ? lk.payeeById.get(r.payeeId)?.name : null,
          every: `${r.interval > 1 ? `${r.interval} ` : ''}${r.frequency}`,
          starts: formatDay(r.startDate, lk.tz),
          ends: r.endType === 'never' ? 'never' : r.endType === 'until' && r.endDate ? `on ${formatDay(r.endDate, lk.tz)}` : `after ${r.endCount} times`,
          next_due: r.nextDue ? formatDay(r.nextDue, lk.tz) : null,
          done: r.occurrences,
          mode: r.mode === 'auto' ? 'logged automatically' : 'asks to confirm',
          active: r.active,
          ...(r.isInstapay ? { instapay: true } : {}),
          ...(r.note ? { note: r.note } : {}),
        })),
        next_30_days: upcoming.map((u) => ({
          id: u.recurring.id,
          name: u.recurring.name,
          date: formatDay(u.date, lk.tz),
          amount: major(u.recurring.amount),
          currency: u.recurring.currency,
        })),
        templates: templates.map((t) => ({
          id: t.id,
          name: t.name,
          type: t.type,
          amount: major(t.amount),
          currency: t.currency,
          account: t.accountId ? lk.accountById.get(t.accountId)?.name : null,
          category: categoryPath(t.categoryId, lk),
          payee: t.payeeId ? lk.payeeById.get(t.payeeId)?.name : null,
          ...(t.isInstapay ? { instapay: true } : {}),
        })),
      });
    },
  },

  {
    name: 'list_debts',
    title: 'Debts',
    description: 'Money lent and borrowed, per person, with how much has been repaid.',
    inputSchema: {
      type: 'object',
      properties: { include_closed: { type: 'boolean', description: 'Also list settled debts' } },
      additionalProperties: false,
    },
    annotations: READ_ONLY,
    async run(args) {
      const lk = await loadLookups();
      const debts = (await listDebts()).filter((d) => (flag(args.include_closed, 'include_closed') ? true : d.status === 'open'));
      return ok({
        debts: debts.map((d) => ({
          id: d.id,
          direction: d.direction === 'lent' ? 'I lent' : 'I borrowed',
          person: d.payeeName,
          amount: major(d.amount),
          currency: d.currency,
          repaid: major(d.repaid),
          remaining: major(d.remaining),
          date: formatDay(d.date, lk.tz),
          ...(d.dueDate ? { due: formatDay(d.dueDate, lk.tz) } : {}),
          ...(d.accountId ? { account: lk.accountById.get(d.accountId)?.name } : {}),
          ...(d.note ? { note: d.note } : {}),
          status: d.status,
        })),
      });
    },
  },

  {
    name: 'list_claude_changes',
    title: 'What Claude changed',
    description: 'Your recent changes to Mula (newest first), with ids for undo_claude_change.',
    inputSchema: {
      type: 'object',
      properties: { limit: { type: 'integer', minimum: 1, maximum: 100 } },
      additionalProperties: false,
    },
    annotations: READ_ONLY,
    async run(args) {
      const lk = await loadLookups();
      const activity = await listActivity(Number(args.limit) || 20);
      return ok({
        changes: activity.map((a) => ({ id: a.id, at: formatLocal(a.at, lk.tz), tool: a.tool, summary: a.summary, records: a.rows, ...(a.undoneAt ? { undone: formatLocal(a.undoneAt, lk.tz) } : {}) })),
      });
    },
  },
];
