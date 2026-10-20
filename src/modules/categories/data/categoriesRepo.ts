import { all, bool, first, int, run, transaction, write } from '../../shared/db/client';
import { useLiveQuery } from '../../shared/db/live';
import type { Category, CategoryKind, ID, Nature } from '../../shared/db/types';
import { newId } from '../../shared/utils/id';

type CategoryRow = {
  id: string;
  parent_id: string | null;
  name: string;
  kind: CategoryKind;
  icon: string;
  color: string;
  nature: Nature;
  system_key: string | null;
  archived: number;
  sort_order: number;
};

const toCategory = (r: CategoryRow): Category => ({
  id: r.id,
  parentId: r.parent_id,
  name: r.name,
  kind: r.kind,
  icon: r.icon,
  color: r.color,
  nature: r.nature,
  systemKey: r.system_key,
  archived: bool(r.archived),
  sortOrder: r.sort_order,
});

export async function listCategories(includeArchived = false): Promise<Category[]> {
  const rows = await all<CategoryRow>(
    `SELECT * FROM categories ${includeArchived ? '' : 'WHERE archived = 0'} ORDER BY sort_order, name`,
  );
  return rows.map(toCategory);
}

export async function getCategory(id: ID): Promise<Category | null> {
  const r = await first<CategoryRow>('SELECT * FROM categories WHERE id = ?', [id]);
  return r ? toCategory(r) : null;
}

export type CategoryInput = {
  id?: ID;
  parentId: ID | null;
  name: string;
  kind: CategoryKind;
  icon: string;
  color: string;
  nature: Nature;
};

export async function saveCategory(input: CategoryInput): Promise<ID> {
  const id = input.id ?? newId();
  const existing = input.id ? await getCategory(input.id) : null;
  const order = await first<{ n: number }>(
    'SELECT COALESCE(MAX(sort_order), -1) + 1 AS n FROM categories WHERE parent_id IS ?',
    [input.parentId],
  );
  await write(
    ['categories'],
    `INSERT OR REPLACE INTO categories (id, parent_id, name, kind, icon, color, nature, system_key, archived, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.parentId,
      input.name.trim(),
      input.kind,
      input.icon,
      input.color,
      input.nature,
      existing?.systemKey ?? null,
      int(existing?.archived ?? false),
      existing?.sortOrder ?? order?.n ?? 0,
    ],
  );
  return id;
}

export async function setCategoryArchived(id: ID, archived: boolean): Promise<void> {
  await write(['categories'], 'UPDATE categories SET archived = ? WHERE id = ? OR parent_id = ?', [int(archived), id, id]);
}

export async function setCategoryNature(id: ID, nature: Nature): Promise<void> {
  await write(['categories'], 'UPDATE categories SET nature = ? WHERE id = ?', [nature, id]);
}

/**
 * Brings an archived category back (with its subcategories, mirroring `setCategoryArchived`).
 * A subcategory also brings back its parent, but not its siblings, so pickers can reach it again.
 */
export async function restoreCategory(id: ID): Promise<void> {
  const cat = await getCategory(id);
  if (!cat) return;
  await transaction(['categories'], async () => {
    await run('UPDATE categories SET archived = 0 WHERE id = ? OR parent_id = ?', [id, id]);
    if (cat.parentId) await run('UPDATE categories SET archived = 0 WHERE id = ?', [cat.parentId]);
  });
}

/** Subcategories share their group's color; call after a top-level category's color changes. */
export async function setSubcategoryColor(parentId: ID, color: string): Promise<void> {
  await write(['categories'], 'UPDATE categories SET color = ? WHERE parent_id = ?', [color, parentId]);
}

/**
 * The category a name points to, e.g. "Groceries", "food & drinks" or "Food & Drinks › Groceries":
 * an exact subcategory or category name first, then a name that contains the hint.
 */
export async function findCategoryByHint(hint: string | null | undefined, kind: CategoryKind): Promise<Category | null> {
  const parts = (hint ?? '')
    .split(/›|>|\//)
    .map((p) => p.trim().toLowerCase())
    .filter(Boolean);
  if (!parts.length) return null;
  const name = parts[parts.length - 1];
  const parentName = parts.length > 1 ? parts[0] : null;
  const all = (await listCategories()).filter((c) => c.kind === kind);
  const byId = new Map(all.map((c) => [c.id, c]));
  const named = all.filter((c) => c.name.toLowerCase() === name);
  const inParent = parentName ? named.find((c) => c.parentId && byId.get(c.parentId)?.name.toLowerCase() === parentName) : undefined;
  return (
    inParent ??
    named.find((c) => c.parentId) ??
    named[0] ??
    (name.length >= 3 ? all.find((c) => c.name.toLowerCase().includes(name) || name.includes(c.name.toLowerCase())) : undefined) ??
    null
  );
}

export type CategoryTree = { parent: Category; children: Category[] }[];

export function buildTree(categories: Category[], kind?: CategoryKind): CategoryTree {
  const parents = categories.filter((c) => !c.parentId && (!kind || c.kind === kind));
  return parents.map((parent) => ({
    parent,
    children: categories.filter((c) => c.parentId === parent.id),
  }));
}

/** Nature for stats: the category's own value, or its parent's when the parent is used directly. */
export function effectiveNature(cat: Category | undefined, byId: Map<ID, Category>): Nature {
  if (!cat) return 'none';
  if (cat.nature !== 'none' || !cat.parentId) return cat.nature;
  return byId.get(cat.parentId)?.nature ?? 'none';
}

export function useCategories(includeArchived = false) {
  return useLiveQuery(['categories'], () => listCategories(includeArchived), [includeArchived]);
}

/** Convenience lookup keyed by id. */
export function useCategoryMap() {
  const { data } = useCategories(true);
  return new Map((data ?? []).map((c) => [c.id, c]));
}
