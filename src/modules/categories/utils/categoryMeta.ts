import { CATEGORY_TREE, SYSTEM_CATEGORIES } from '../../shared/db/seeds/categories';
import type { CategoryKind, ID, Nature } from '../../shared/db/types';

export const CATEGORY_KINDS: { value: CategoryKind; label: string }[] = [
  { value: 'expense', label: 'Expense' },
  { value: 'income', label: 'Income' },
];

export const NATURE_OPTIONS: { value: Nature; label: string }[] = [
  { value: 'need', label: 'Need' },
  { value: 'want', label: 'Want' },
  { value: 'saving', label: 'Saving' },
  { value: 'none', label: 'Not set' },
];

export const NATURE_HINTS: Record<Nature, string | null> = {
  need: 'Essentials, like rent, groceries and bills',
  want: 'Nice to have, like eating out or hobbies',
  saving: 'Money put aside or invested',
  none: null,
};

export const natureLabel = (n: Nature): string => NATURE_OPTIONS.find((o) => o.value === n)?.label ?? 'Not set';

/** Swatches for top-level categories: the seeded group colors, in order. */
export const CATEGORY_COLORS: string[] = Array.from(new Set(CATEGORY_TREE.map((g) => g.color)));

const SYSTEM_IDS = new Set<string>(Object.values(SYSTEM_CATEGORIES));

/** Categories the app files records into on its own (fees, refunds, missing…); they can't be archived. */
export const isSystemCategory = (id: ID): boolean => SYSTEM_IDS.has(id);

/** "cat_food.cafe" -> "cat-food-cafe", for testIDs. */
export const toTestId = (s: string): string =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
