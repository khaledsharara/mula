import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { IconButton } from '../../shared/components/Button';
import { ToggleRow } from '../../shared/components/Fields';
import { Icon } from '../../shared/components/Icon';
import { Section } from '../../shared/components/List';
import { EmptyState } from '../../shared/components/Misc';
import { Press } from '../../shared/components/Press';
import { SegmentedControl } from '../../shared/components/SegmentedControl';
import { Text } from '../../shared/components/Text';
import type { Category, CategoryKind } from '../../shared/db/types';
import { Screen } from '../../shared/layouts/Screen';
import { plural } from '../../shared/utils/text';
import { CategoryRow } from '../components/CategoryRow';
import { NatureSheet } from '../components/NatureSheet';
import { useCategories } from '../data/categoriesRepo';
import { CATEGORY_KINDS, natureLabel, toTestId } from '../utils/categoryMeta';

type Group = { parent: Category; children: Category[] };

export default function CategoriesPage() {
  const [kind, setKind] = useState<CategoryKind>('expense');
  const [showArchived, setShowArchived] = useState(false);
  const [natureFor, setNatureFor] = useState<Category | null>(null);
  const [natureOpen, setNatureOpen] = useState(false);
  // Load archived ones too so an active subcategory under an archived group still shows up.
  const { data: categories } = useCategories(true);

  const byId = useMemo(() => new Map((categories ?? []).map((c) => [c.id, c])), [categories]);

  const archivedCount = useMemo(() => (categories ?? []).filter((c) => c.kind === kind && c.archived).length, [categories, kind]);

  const groups = useMemo<Group[]>(() => {
    const ofKind = (categories ?? []).filter((c) => c.kind === kind);
    const visible = (c: Category) => showArchived || !c.archived;
    return ofKind
      .filter((c) => !c.parentId)
      .map((parent) => ({ parent, children: ofKind.filter((c) => c.parentId === parent.id && visible(c)) }))
      .filter((g) => visible(g.parent) || g.children.length > 0);
  }, [categories, kind, showArchived]);

  const addCategory = () => router.push({ pathname: '/categories/edit', params: { kind } });
  const edit = (c: Category) => router.push({ pathname: '/categories/edit', params: { id: c.id } });
  const openNature = (c: Category) => {
    setNatureFor(c);
    setNatureOpen(true);
  };

  const natureButton = (c: Category) => {
    const parent = c.parentId ? byId.get(c.parentId) : undefined;
    // "Not set" on a subcategory follows its group, so show what it actually counts as.
    const label = natureLabel(c.nature === 'none' && parent && parent.nature !== 'none' ? parent.nature : c.nature);
    return (
      <Press
        onPress={() => openNature(c)}
        haptic="select"
        hitSlop={10}
        testID={`category-nature-${toTestId(c.id)}`}
        accessibilityLabel={`${c.name} counts as ${label}. Change`}
        className="flex-row items-center py-1 pl-2"
      >
        <Text variant="label" weight="regular" tone={c.nature === 'none' ? 'mist' : 'graphite'}>
          {label}
        </Text>
        <View className="ml-0.5">
          <Icon name="chevron-down" size={14} tone="mist" />
        </View>
      </Press>
    );
  };

  const target = natureFor ? (byId.get(natureFor.id) ?? natureFor) : null;
  const targetParent = target?.parentId ? byId.get(target.parentId) : null;

  return (
    <Screen
      title="Categories"
      back
      testID="categories"
      right={<IconButton icon="plus" label="New category" onPress={addCategory} testID="category-add" />}
    >
      <View className="px-5 pt-1">
        <SegmentedControl testID="categories-kind" options={CATEGORY_KINDS} value={kind} onChange={setKind} />
      </View>
      {kind === 'expense' && groups.length ? (
        <Text variant="caption" tone="graphite" className="px-5 pt-3">
          Tap Need, Want or Saving on a row to change how its spending counts.
        </Text>
      ) : null}

      {categories && !groups.length ? (
        <View testID="categories-empty">
          <EmptyState
            icon="shapes"
            title={kind === 'income' ? 'No income categories' : 'No expense categories'}
            body="Add one to start sorting your records."
            action={{ label: 'Add category', icon: 'plus', onPress: addCategory }}
          />
        </View>
      ) : (
        <View className="mt-2">
          {groups.map((g, gi) => {
            const closing = gi === groups.length - 1 ? 'none' : 'full';
            // A group without subcategories is used directly, so its own setting matters here.
            const parentNature = kind === 'expense' && !g.children.length;
            return (
              <View key={g.parent.id}>
                <CategoryRow
                  category={g.parent}
                  subtitle={g.parent.archived ? 'Archived' : null}
                  dimmed={g.parent.archived}
                  right={parentNature ? natureButton(g.parent) : undefined}
                  onPress={() => edit(g.parent)}
                  divider={g.children.length ? 'inset' : closing}
                  testID={`category-row-${toTestId(g.parent.id)}`}
                />
                {g.children.map((c, ci) => (
                  <CategoryRow
                    key={c.id}
                    sub
                    category={c}
                    subtitle={c.archived ? 'Archived' : null}
                    dimmed={c.archived}
                    right={kind === 'expense' ? natureButton(c) : undefined}
                    onPress={() => edit(c)}
                    divider={ci < g.children.length - 1 ? 'inset' : closing}
                    testID={`category-row-${toTestId(c.id)}`}
                  />
                ))}
              </View>
            );
          })}
        </View>
      )}

      <Section>
        <ToggleRow
          title="Show archived"
          subtitle={
            archivedCount
              ? `${plural(archivedCount, 'archived category', 'archived categories')}. Past records keep them; new ones can’t use them.`
              : 'Archived categories stay on past records but aren’t offered for new ones.'
          }
          value={showArchived}
          onChange={setShowArchived}
          divider={false}
          testID="categories-show-archived"
        />
      </Section>

      <NatureSheet visible={natureOpen} onClose={() => setNatureOpen(false)} category={target} parent={targetParent} />
    </Screen>
  );
}
