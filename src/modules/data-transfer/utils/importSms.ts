import { listAccounts } from '../../accounts/data/accountsRepo';
import { isOutflow } from '../../inbox/utils/parser';
import { convert } from '../../integrations/utils/fx';
import { findOrCreatePayee, getPayee, learnFromUse, resolveAlias, setAlias, updatePayee } from '../../payees/data/payeesRepo';
import { first } from '../../shared/db/client';
import { SYSTEM_CATEGORIES } from '../../shared/db/seeds/categories';
import type { Account, CategoryKind, ID, PaymentType, SmsKind, TxType } from '../../shared/db/types';
import { getSettings } from '../../shared/settings/settingsStore';
import { createTransaction } from '../../transactions/data/transactionsRepo';
import type { TxInput } from '../../transactions/types';
import { instapayFee } from '../../transactions/utils/instapay';
import type { ArchiveCandidate, MerchantGroup } from './smsArchive';

/** Kinds where money comes in; a group made only of these gets an income category. */
export const INCOME_KINDS: SmsKind[] = ['instapay_in', 'refund', 'cash_deposit', 'unknown_credit'];

export const groupCategoryKind = (g: MerchantGroup): CategoryKind =>
  [...g.kinds].every((k) => INCOME_KINDS.includes(k as SmsKind)) ? 'income' : 'expense';

/** Card/account digits a candidate belongs to ("" when the message had none). */
export const last4Key = (c: ArchiveCandidate): string => c.parsed.last4 ?? '';

export const isCashKind = (k: SmsKind): boolean => k === 'atm_withdrawal' || k === 'cash_deposit';

const PAYMENT_BY_KIND: Partial<Record<SmsKind, PaymentType>> = {
  card_purchase: 'debit_card',
  applepay_purchase: 'apple_pay',
  instapay_out: 'instapay',
  instapay_in: 'instapay',
  atm_withdrawal: 'cash',
  cash_deposit: 'cash',
  refund: 'debit_card',
};

export type SmsImportPlan = {
  candidates: ArchiveCandidate[];
  /** Account per card/account digits; null or missing means skip those messages. */
  accountByLast4: Record<string, ID | null>;
  /** Where ATM withdrawals go and deposits come from; null files them as expense/income. */
  cashAccountId: ID | null;
  groups: MerchantGroup[];
  categoryByGroup: Record<string, ID | null>;
};

export type SmsImportResult = { created: number; alreadyImported: number; unmapped: number; failed: number };

async function inCurrency(amount: number, from: string, to: string, date: number) {
  if (from === to) return { amount, original: null as TxInput['original'] };
  const fx = await convert(amount, from, to, date);
  return fx ? { amount: fx.amount, original: { amount, currency: from, rate: fx.rate } as TxInput['original'] } : null;
}

/**
 * Turns archive candidates into records. Messages already imported (same `source_ref`) are
 * skipped, so running it twice is safe. Named groups become payees with the bank name as alias.
 */
export async function importSmsHistory(plan: SmsImportPlan, onProgress?: (done: number, total: number) => void): Promise<SmsImportResult> {
  const accounts = new Map<ID, Account>((await listAccounts(true)).map((a) => [a.id, a]));
  const cash = plan.cashAccountId ? (accounts.get(plan.cashAccountId) ?? null) : null;
  const feeRule = getSettings().instapayFee;
  const groupByKey = new Map(plan.groups.map((g) => [g.key, g]));
  const payees = new Map<string, { id: ID; categoryBefore: ID | null; accountId: ID }>();
  const result: SmsImportResult = { created: 0, alreadyImported: 0, unmapped: 0, failed: 0 };

  const payeeFor = async (c: ArchiveCandidate, accountId: ID): Promise<ID | null> => {
    if (!c.groupKey) return null;
    const known = payees.get(c.groupKey);
    if (known) return known.id;
    const group = groupByKey.get(c.groupKey);
    // Reuse the payee this bank name already points at (e.g. renamed earlier) instead of making a twin.
    const aliased = await resolveAlias(c.groupKey);
    const payee =
      aliased ?? (await findOrCreatePayee(group?.name ?? c.displayName ?? c.groupKey, group?.kinds.has('instapay_in') || c.parsed.kind === 'instapay_in' ? 'person' : 'merchant'));
    if (!aliased) await setAlias(c.groupKey, payee.id);
    payees.set(c.groupKey, { id: payee.id, categoryBefore: payee.defaultCategoryId, accountId });
    return payee.id;
  };

  const list = [...plan.candidates].sort((a, b) => (a.parsed.occurredAt ?? 0) - (b.parsed.occurredAt ?? 0));

  for (let i = 0; i < list.length; i++) {
    const c = list[i];
    try {
      const accountId = plan.accountByLast4[last4Key(c)];
      const account = accountId ? accounts.get(accountId) : undefined;
      if (!account) {
        result.unmapped++;
        continue;
      }
      if (await first<{ x: number }>('SELECT 1 AS x FROM transactions WHERE source_ref = ?', [c.ref])) {
        result.alreadyImported++;
        continue;
      }

      const { kind, amount: parsedAmount, currency } = c.parsed;
      const date = c.parsed.occurredAt ?? Date.now();
      const transfer = Boolean(cash && cash.id !== account.id && isCashKind(kind));
      const from = transfer && kind === 'cash_deposit' ? cash! : account;
      const to = transfer ? (kind === 'cash_deposit' ? account : cash!) : null;

      const main = await inCurrency(parsedAmount, currency, from.currency, date);
      if (!main) {
        result.failed++;
        continue;
      }
      let toAmount: number | null = null;
      if (to) {
        const landed = to.currency === from.currency ? main : await inCurrency(parsedAmount, currency, to.currency, date);
        if (!landed) {
          result.failed++;
          continue;
        }
        toAmount = landed.amount;
      }

      const type: TxType = to ? 'transfer' : isOutflow(kind) ? 'expense' : 'income';
      const chosen = c.groupKey ? (plan.categoryByGroup[c.groupKey] ?? null) : null;
      const categoryId = type === 'transfer' ? null : (chosen ?? (kind === 'refund' ? SYSTEM_CATEGORIES.refunds : SYSTEM_CATEGORIES.missing));
      const isInstapay = kind === 'instapay_out' || kind === 'instapay_in';

      await createTransaction({
        type,
        amount: main.amount,
        accountId: from.id,
        toAccountId: to?.id ?? null,
        toAmount,
        categoryId,
        payeeId: type === 'transfer' ? null : await payeeFor(c, account.id),
        paymentType: PAYMENT_BY_KIND[kind] ?? account.defaultPaymentType,
        date,
        note: isCashKind(kind) ? c.parsed.counterparty : null,
        isInstapay,
        fee: kind === 'instapay_out' ? instapayFee(main.amount, feeRule) : null,
        original: main.original,
        source: 'import',
        sourceRef: c.ref,
      });
      result.created++;
    } catch (e) {
      console.warn('[mula] archive import', e);
      result.failed++;
    } finally {
      onProgress?.(i + 1, list.length);
    }
  }

  // Each record teaches its payee a category as it is saved. Settle on the group's chosen category,
  // and don't let Missing/Refunds become a payee's default when no category was picked.
  for (const [groupKey, p] of payees) {
    const chosen = plan.categoryByGroup[groupKey] ?? null;
    if (chosen) {
      await learnFromUse(p.id, chosen, p.accountId);
      continue;
    }
    const now = await getPayee(p.id);
    if (now && now.defaultCategoryId !== p.categoryBefore) {
      await updatePayee({
        id: now.id,
        name: now.name,
        kind: now.kind,
        defaultCategoryId: p.categoryBefore,
        defaultAccountId: now.defaultAccountId,
        autoConfirm: now.autoConfirm,
        note: now.note,
      });
    }
  }
  return result;
}
