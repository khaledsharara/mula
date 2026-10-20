import { all } from '../../shared/db/client';
import { useLiveQuery } from '../../shared/db/live';
import type { CategoryKind, ID } from '../../shared/db/types';
import { SYSTEM_CATEGORIES } from '../../shared/db/seeds/categories';

/** Most-used categories in the last 90 days, padded with sensible defaults for a new install. */
export async function frequentCategoryIds(kind: CategoryKind, limit = 8): Promise<ID[]> {
  const rows = await all<{ id: string }>(
    `SELECT t.category_id AS id FROM transactions t JOIN categories c ON c.id = t.category_id
     WHERE t.parent_id IS NULL AND t.date >= ? AND c.kind = ? AND c.archived = 0
     GROUP BY t.category_id ORDER BY COUNT(*) DESC LIMIT ?`,
    [Date.now() - 90 * 86_400_000, kind, limit],
  );
  const ids = rows.map((r) => r.id);
  const defaults =
    kind === 'expense'
      ? [SYSTEM_CATEGORIES.groceries, SYSTEM_CATEGORIES.restaurant, SYSTEM_CATEGORIES.taxi, SYSTEM_CATEGORIES.cafe, 'cat_shopping.clothes', 'cat_comms.phone', 'cat_life.subscriptions', 'cat_shopping.pharmacy']
      : [SYSTEM_CATEGORIES.wage, SYSTEM_CATEGORIES.gifts, SYSTEM_CATEGORIES.refunds, 'cat_income.lending', 'cat_income.sale'];
  for (const d of defaults) if (ids.length < limit && !ids.includes(d)) ids.push(d);
  return ids;
}

export function useFrequentCategories(kind: CategoryKind) {
  return useLiveQuery(['transactions', 'categories'], () => frequentCategoryIds(kind), [kind]);
}
