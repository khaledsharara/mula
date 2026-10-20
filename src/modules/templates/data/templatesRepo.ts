import { all, bool, first, int, write } from '../../shared/db/client';
import { useLiveQuery } from '../../shared/db/live';
import type { ID, PaymentType, Template, TxType } from '../../shared/db/types';
import { newId } from '../../shared/utils/id';

type TemplateRow = {
  id: string;
  name: string;
  type: TxType;
  amount: number | null;
  currency: string | null;
  account_id: string | null;
  to_account_id: string | null;
  category_id: string | null;
  payee_id: string | null;
  payment_type: PaymentType | null;
  note: string | null;
  is_instapay: number;
  sort_order: number;
  created_at: number;
};

const toTemplate = (r: TemplateRow): Template => ({
  id: r.id,
  name: r.name,
  type: r.type,
  amount: r.amount,
  currency: r.currency,
  accountId: r.account_id,
  toAccountId: r.to_account_id,
  categoryId: r.category_id,
  payeeId: r.payee_id,
  paymentType: r.payment_type,
  note: r.note,
  isInstapay: bool(r.is_instapay),
  sortOrder: r.sort_order,
  createdAt: r.created_at,
});

export async function listTemplates(): Promise<Template[]> {
  const rows = await all<TemplateRow>('SELECT * FROM templates ORDER BY sort_order, name');
  return rows.map(toTemplate);
}

export async function getTemplate(id: ID): Promise<Template | null> {
  const r = await first<TemplateRow>('SELECT * FROM templates WHERE id = ?', [id]);
  return r ? toTemplate(r) : null;
}

export type TemplateInput = Omit<Template, 'id' | 'sortOrder' | 'createdAt'> & { id?: ID };

export async function saveTemplate(t: TemplateInput): Promise<ID> {
  const id = t.id ?? newId();
  const existing = t.id ? await getTemplate(t.id) : null;
  const order = await first<{ n: number }>('SELECT COALESCE(MAX(sort_order), -1) + 1 AS n FROM templates');
  await write(
    ['templates'],
    `INSERT OR REPLACE INTO templates
      (id, name, type, amount, currency, account_id, to_account_id, category_id, payee_id, payment_type, note, is_instapay, sort_order, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id, t.name.trim(), t.type, t.amount, t.currency, t.accountId, t.toAccountId, t.categoryId, t.payeeId, t.paymentType,
      t.note, int(t.isInstapay), existing?.sortOrder ?? order?.n ?? 0, existing?.createdAt ?? Date.now(),
    ],
  );
  return id;
}

export async function deleteTemplate(id: ID): Promise<void> {
  await write(['templates'], 'DELETE FROM templates WHERE id = ?', [id]);
}

export function useTemplates() {
  return useLiveQuery(['templates'], listTemplates);
}

export function useTemplate(id: ID | null | undefined) {
  return useLiveQuery(['templates'], async () => (id ? getTemplate(id) : null), [id]);
}
