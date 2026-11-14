/** The icon picker only offers icons the app can draw, and every seeded category's icon exists. */
import { ICON_GROUPS, PICKABLE_ICONS } from '../../src/modules/shared/components/iconCatalog';
import { ICON_SET } from '../../src/modules/shared/components/iconSet';
import { CATEGORY_TREE } from '../../src/modules/shared/db/seeds/categories';

const drawable = new Set(Object.keys(ICON_SET));

it('offers only icons that are in the bundled set', () => {
  expect(PICKABLE_ICONS.filter((i) => !drawable.has(i))).toEqual([]);
});

it('has an icon for every seeded category', () => {
  const seeded = CATEGORY_TREE.flatMap((g) => [g.icon, ...g.subs.map((s) => s[2])]);
  expect(seeded.filter((i) => !drawable.has(i))).toEqual([]);
});

it('groups icons into themes with no repeats inside a theme', () => {
  expect(ICON_GROUPS.length).toBeGreaterThan(5);
  for (const g of ICON_GROUPS) expect(new Set(g.icons).size).toBe(g.icons.length);
  expect(PICKABLE_ICONS.length).toBeGreaterThan(250);
});
