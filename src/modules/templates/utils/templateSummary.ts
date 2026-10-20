import type { RowLookups } from '../../transactions/components/TransactionRow';
import type { Template } from '../../shared/db/types';

/** "Groceries, InstaPay, CIB" or "Transfer, CIB to Cash": what the template fills in, briefly. */
export function templateSummary(t: Template, lookups: RowLookups): string | null {
  const account = t.accountId ? lookups.accounts.get(t.accountId) : undefined;
  if (t.type === 'transfer') {
    const to = t.toAccountId ? lookups.accounts.get(t.toAccountId) : undefined;
    const route = account && to ? `${account.name} to ${to.name}` : to ? `To ${to.name}` : account?.name;
    return [t.isInstapay ? 'InstaPay transfer' : 'Transfer', route].filter(Boolean).join(', ');
  }
  const category = t.categoryId ? lookups.categories.get(t.categoryId) : undefined;
  const parts = [category?.name, t.isInstapay ? 'InstaPay' : null, account?.name].filter(Boolean);
  return parts.length ? parts.join(', ') : null;
}

/** Template icon: the category's, or a neutral glyph for transfers and bare templates. */
export function templateIcon(t: Template, lookups: RowLookups): { icon: string; color?: string; muted: boolean } {
  if (t.type === 'transfer') return { icon: 'arrow-left-right', muted: true };
  const category = t.categoryId ? lookups.categories.get(t.categoryId) : undefined;
  if (category) return { icon: category.icon, color: category.color, muted: false };
  return { icon: t.isInstapay ? 'zap' : 'sparkle', muted: true };
}
