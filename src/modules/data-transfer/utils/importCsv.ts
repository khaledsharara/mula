import { listAccounts } from '../../accounts/data/accountsRepo';
import { listCategories } from '../../categories/data/categoriesRepo';
import { convert } from '../../integrations/utils/fx';
import { findOrCreatePayee } from '../../payees/data/payeesRepo';
import { SYSTEM_CATEGORIES } from '../../shared/db/seeds/categories';
import type { Account, CategoryKind, ID } from '../../shared/db/types';
import { createTransaction } from '../../transactions/data/transactionsRepo';
import type { TxInput } from '../../transactions/types';
import type { DateOrder, ImportRow, ParsedCsv } from './csv';

const key = (s: string) => s.trim().toLowerCase();

/** Guesses the day/month order from a column's values ("25/03/2026" can only be day first). */
export function guessDateOrder(values: string[]): DateOrder {
  let dayFirst = false;
  let monthFirst = false;
  for (const raw of values.slice(0, 300)) {
    const v = raw.trim();
    if (/^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}/.test(v)) return 'ymd';
    const m = v.match(/^(\d{1,2})[-/.](\d{1,2})[-/.]\d{2,4}/);
    if (!m) continue;
    if (Number(m[1]) > 12) dayFirst = true;
    if (Number(m[2]) > 12) monthFirst = true;
  }
  return monthFirst && !dayFirst ? 'mdy' : 'dmy';
}

/** First non-empty value in a column, to show next to its name. */
export function sampleValue(csv: ParsedCsv, header: string): string | null {
  for (const r of csv.rows.slice(0, 50)) {
    const v = r[header]?.trim();
    if (v) return v;
  }
  return null;
}

/** "LE", "جم" and friends mean EGP; anything that isn't a 3-letter code is ignored. */
function normalizeCurrency(value: string | null): string | null {
  if (!value) return null;
  const v = value.trim().toUpperCase();
  if (/^(L\.?E\.?|جم|جنيه|EGP)$/.test(v)) return 'EGP';
  return /^[A-Z]{3}$/.test(v) ? v : null;
}

export type CsvImportResult = { created: number; failed: number };

/**
 * Creates a record for every valid row. Accounts and categories match by name (case-insensitive);
 * unknown accounts use `defaultAccountId`, unknown categories go to Others › Missing.
 */
export async function importCsvRows(
  rows: ImportRow[],
  opts: { defaultAccountId: ID; onProgress?: (done: number, total: number) => void },
): Promise<CsvImportResult> {
  const valid = rows.filter((r) => !r.error && r.date != null && r.amount != null);

  // Archived accounts first so an active account with the same name wins.
  const accounts = [...(await listAccounts(true))].sort((a, b) => Number(b.archived) - Number(a.archived));
  const accountByName = new Map<string, Account>(accounts.map((a) => [key(a.name), a]));
  const fallback = accounts.find((a) => a.id === opts.defaultAccountId);
  if (!fallback) throw new Error('Choose an account for the import');

  // Subcategories first ("Taxi" before a group of the same name), active before archived.
  const categories = [...(await listCategories(true))].sort(
    (a, b) => Number(Boolean(b.parentId)) - Number(Boolean(a.parentId)) || Number(a.archived) - Number(b.archived),
  );
  const categoryByName: Record<CategoryKind, Map<string, ID>> = { expense: new Map(), income: new Map() };
  for (const c of categories) {
    const map = categoryByName[c.kind];
    if (!map.has(key(c.name))) map.set(key(c.name), c.id);
  }

  const payeeIds = new Map<string, ID>();
  let created = 0;
  let failed = 0;

  for (let i = 0; i < valid.length; i++) {
    const r = valid[i];
    try {
      const account = (r.account ? accountByName.get(key(r.account)) : undefined) ?? fallback;
      // "Transportation > Taxi" style paths match on their last part.
      const categoryName = r.category?.split(/\s*[>›]\s*/).pop() ?? '';
      const categoryId = (categoryName ? categoryByName[r.type].get(key(categoryName)) : undefined) ?? SYSTEM_CATEGORIES.missing;

      let payeeId: ID | null = null;
      if (r.payee) {
        payeeId = payeeIds.get(key(r.payee)) ?? null;
        if (!payeeId) {
          payeeId = (await findOrCreatePayee(r.payee, 'merchant')).id;
          payeeIds.set(key(r.payee), payeeId);
        }
      }

      let amount = r.amount!;
      let original: TxInput['original'] = null;
      const currency = normalizeCurrency(r.currency);
      if (currency && currency !== account.currency) {
        const fx = await convert(r.amount!, currency, account.currency, r.date!);
        if (!fx) {
          failed++;
          continue;
        }
        amount = fx.amount;
        original = { amount: r.amount!, currency, rate: fx.rate };
      }

      await createTransaction({
        type: r.type,
        amount,
        accountId: account.id,
        categoryId,
        payeeId,
        paymentType: account.defaultPaymentType,
        date: r.date!,
        note: r.note,
        original,
        source: 'import',
      });
      created++;
    } catch {
      failed++;
    } finally {
      opts.onProgress?.(i + 1, valid.length);
    }
  }
  return { created, failed };
}
