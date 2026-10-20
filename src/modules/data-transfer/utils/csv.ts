import { format, isValid, parse } from 'date-fns';
import Papa from 'papaparse';

import type { Account, Category, ID, Payee, Transaction } from '../../shared/db/types';
import { paymentTypeLabel } from '../../transactions/types';

/* ---------- Export ---------- */

export const EXPORT_COLUMNS = [
  'date', 'time', 'type', 'amount', 'currency', 'account', 'to_account', 'category', 'subcategory', 'payee',
  'payment_type', 'note', 'fee', 'original_amount', 'original_currency', 'amount_egp', 'need_or_want', 'source',
] as const;

export function transactionsToCsv(
  txs: (Transaction & { feeTotal?: number })[],
  lookups: { accounts: Map<ID, Account>; categories: Map<ID, Category>; payees: Map<ID, Payee> },
): string {
  const rows = txs.map((t) => {
    const cat = t.categoryId ? lookups.categories.get(t.categoryId) : undefined;
    const parent = cat?.parentId ? lookups.categories.get(cat.parentId) : undefined;
    const signed = t.type === 'expense' ? -t.amount : t.amount;
    return {
      date: format(t.date, 'yyyy-MM-dd'),
      time: format(t.date, 'HH:mm'),
      type: t.isInstapay ? `${t.type} (InstaPay)` : t.type,
      amount: (signed / 100).toFixed(2),
      currency: t.currency,
      account: lookups.accounts.get(t.accountId)?.name ?? '',
      to_account: t.toAccountId ? (lookups.accounts.get(t.toAccountId)?.name ?? '') : '',
      category: parent?.name ?? cat?.name ?? '',
      subcategory: parent ? (cat?.name ?? '') : '',
      payee: t.payeeId ? (lookups.payees.get(t.payeeId)?.name ?? '') : '',
      payment_type: paymentTypeLabel(t.paymentType),
      note: t.note ?? '',
      fee: t.feeTotal ? (t.feeTotal / 100).toFixed(2) : '',
      original_amount: t.originalAmount != null ? (t.originalAmount / 100).toFixed(2) : '',
      original_currency: t.originalCurrency ?? '',
      amount_egp: ((t.type === 'expense' ? -t.baseAmount : t.baseAmount) / 100).toFixed(2),
      need_or_want: t.natureOverride ?? cat?.nature ?? '',
      source: t.source,
    };
  });
  return Papa.unparse({ fields: [...EXPORT_COLUMNS], data: rows.map((r) => EXPORT_COLUMNS.map((c) => r[c])) });
}

/* ---------- Generic import ---------- */

export type ParsedCsv = { headers: string[]; rows: Record<string, string>[] };

export function readCsv(text: string): ParsedCsv {
  const res = Papa.parse<Record<string, string>>(text.replace(/^﻿/, ''), {
    header: true,
    skipEmptyLines: 'greedy',
    delimitersToGuess: [',', ';', '\t', '|'],
  });
  return { headers: res.meta.fields ?? [], rows: res.data };
}

export type ColumnMapping = {
  date: string | null;
  time: string | null;
  amount: string | null;
  /** Optional separate debit/credit columns (bank statements). */
  debit: string | null;
  credit: string | null;
  type: string | null;
  currency: string | null;
  account: string | null;
  category: string | null;
  payee: string | null;
  note: string | null;
};

export type DateOrder = 'dmy' | 'mdy' | 'ymd';

const guesses: Record<keyof ColumnMapping, RegExp> = {
  date: /^(date|day|transaction date|posting date|value date|التاريخ)$/i,
  time: /^(time|الوقت)$/i,
  amount: /^(amount|value|sum|المبلغ|amount \(egp\))$/i,
  debit: /^(debit|withdrawal|withdrawals|مدين)$/i,
  credit: /^(credit|deposit|deposits|دائن)$/i,
  type: /^(type|record type|kind)$/i,
  currency: /^(currency|ccy|العملة)$/i,
  account: /^(account|wallet|الحساب)$/i,
  category: /^(category|subcategory|التصنيف)$/i,
  payee: /^(payee|payer|merchant|counterparty|description|narrative|details|البيان)$/i,
  note: /^(note|notes|memo|comment)$/i,
};

export function guessMapping(headers: string[]): ColumnMapping {
  const m: ColumnMapping = { date: null, time: null, amount: null, debit: null, credit: null, type: null, currency: null, account: null, category: null, payee: null, note: null };
  for (const key of Object.keys(m) as (keyof ColumnMapping)[]) {
    m[key] = headers.find((h) => guesses[key].test(h.trim())) ?? null;
  }
  return m;
}

const DATE_FORMATS: Record<DateOrder, string[]> = {
  dmy: ['dd/MM/yyyy', 'd/M/yyyy', 'dd-MM-yyyy', 'dd.MM.yyyy', 'dd/MM/yy', 'd MMM yyyy'],
  mdy: ['MM/dd/yyyy', 'M/d/yyyy', 'MM-dd-yyyy', 'MM/dd/yy', 'MMM d, yyyy'],
  ymd: ['yyyy-MM-dd', 'yyyy/MM/dd', 'yyyy.MM.dd'],
};

export function parseDate(value: string, time: string | undefined, order: DateOrder): number | null {
  const v = value.trim();
  if (!v) return null;
  if (/^\d{4}-\d{2}-\d{2}T/.test(v)) {
    const d = new Date(v);
    return isValid(d) ? d.getTime() : null;
  }
  const datePart = v.split(/[ T]/)[0];
  const timePart = time?.trim() || v.split(/[ T]/)[1] || '12:00';
  const formats = [...DATE_FORMATS[order], ...DATE_FORMATS.ymd];
  for (const f of formats) {
    const d = parse(datePart, f, new Date(2000, 0, 1));
    if (isValid(d) && d.getFullYear() > 1990) {
      const [h, m] = timePart.split(':').map((x) => parseInt(x, 10));
      d.setHours(Number.isFinite(h) ? h : 12, Number.isFinite(m) ? m : 0, 0, 0);
      return d.getTime();
    }
  }
  return null;
}

/** "1,234.50", "(1,234.50)", "-1 234,50" → signed minor units. */
export function parseCsvAmount(value: string | undefined): number | null {
  if (value == null) return null;
  let v = value.trim();
  if (!v) return null;
  const negative = /^\(.*\)$/.test(v) || v.startsWith('-') || v.endsWith('-');
  v = v.replace(/[()\s ]/g, '').replace(/^-|-$/g, '').replace(/[A-Za-z$£€]/g, '');
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(v)) v = v.replace(/\./g, '').replace(',', '.');
  else if (/,\d{1,2}$/.test(v) && !v.includes('.')) v = v.replace(',', '.');
  v = v.replace(/,/g, '');
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100) * (negative ? -1 : 1);
}

export type ImportRow = {
  index: number;
  date: number | null;
  amount: number | null;
  type: 'expense' | 'income';
  currency: string | null;
  account: string | null;
  category: string | null;
  payee: string | null;
  note: string | null;
  error: string | null;
};

export function mapRows(csv: ParsedCsv, m: ColumnMapping, order: DateOrder): ImportRow[] {
  return csv.rows.map((r, index) => {
    const date = m.date ? parseDate(r[m.date] ?? '', m.time ? r[m.time] : undefined, order) : null;
    let amount: number | null = null;
    if (m.amount) amount = parseCsvAmount(r[m.amount]);
    else {
      const debit = m.debit ? parseCsvAmount(r[m.debit]) : null;
      const credit = m.credit ? parseCsvAmount(r[m.credit]) : null;
      if (debit) amount = -Math.abs(debit);
      else if (credit) amount = Math.abs(credit);
    }
    const typeText = m.type ? (r[m.type] ?? '').toLowerCase() : '';
    let type: 'expense' | 'income' = amount != null && amount < 0 ? 'expense' : 'income';
    if (/expense|debit|out|withdraw|spend|مصروف/.test(typeText)) type = 'expense';
    else if (/income|credit|in\b|deposit|دخل/.test(typeText)) type = 'income';
    else if (!m.type && amount != null && amount > 0 && !m.debit && !m.credit) type = 'expense';
    const error = !date ? 'Date not recognized' : amount == null || amount === 0 ? 'Amount missing' : null;
    return {
      index,
      date,
      amount: amount == null ? null : Math.abs(amount),
      type,
      currency: m.currency ? r[m.currency]?.trim().toUpperCase() || null : null,
      account: m.account ? r[m.account]?.trim() || null : null,
      category: m.category ? r[m.category]?.trim() || null : null,
      payee: m.payee ? r[m.payee]?.trim() || null : null,
      note: m.note ? r[m.note]?.trim() || null : null,
      error,
    };
  });
}
