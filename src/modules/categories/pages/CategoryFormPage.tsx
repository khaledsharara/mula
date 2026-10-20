import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';

import { FieldRow } from '../../transactions/components/FieldRow';
import { BottomSheet } from '../../shared/components/BottomSheet';
import { Button } from '../../shared/components/Button';
import { confirm, toast } from '../../shared/components/Feedback';
import { TextField } from '../../shared/components/Fields';
import { Icon, PICKABLE_ICONS } from '../../shared/components/Icon';
import { ListRow, Section } from '../../shared/components/List';
import { EmptyState, IconTile } from '../../shared/components/Misc';
import { Press } from '../../shared/components/Press';
import { SegmentedControl } from '../../shared/components/SegmentedControl';
import { Text } from '../../shared/components/Text';
import type { Category, CategoryKind, ID, Nature } from '../../shared/db/types';
import { Screen } from '../../shared/layouts/Screen';
import { plural } from '../../shared/utils/text';
import {
  getCategory,
  restoreCategory,
  saveCategory,
  setCategoryArchived,
  setSubcategoryColor,
  useCategories,
} from '../data/categoriesRepo';
import { CATEGORY_COLORS, CATEGORY_KINDS, NATURE_OPTIONS, isSystemCategory, natureLabel, toTestId } from '../utils/categoryMeta';
import { goBack } from '../../shared/utils/nav';

type Params = { id?: string; parentId?: string; kind?: string };

export default function CategoryFormPage() {
  const params = useLocalSearchParams<Params>();
  const editing = Boolean(params.id);
  const { data: categories } = useCategories(true);
  const byId = useMemo(() => new Map((categories ?? []).map((c) => [c.id, c])), [categories]);

  const [existing, setExisting] = useState<Category | null>(null);
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState<ID | null>(params.parentId ?? null);
  const [kind, setKind] = useState<CategoryKind>(params.kind === 'income' ? 'income' : 'expense');
  const [icon, setIcon] = useState('tag');
  const [color, setColor] = useState(CATEGORY_COLORS[0]);
  const [nature, setNature] = useState<Nature>('none');
  const [parentSheet, setParentSheet] = useState(false);
  const [saving, setSaving] = useState(false);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (!params.id) return;
    let alive = true;
    void getCategory(params.id).then((c) => {
      if (!alive) return;
      if (!c) {
        setMissing(true);
        return;
      }
      setExisting(c);
      setName(c.name);
      setParentId(c.parentId);
      setKind(c.kind);
      setIcon(c.icon);
      setColor(c.color);
      setNature(c.nature);
    });
    return () => {
      alive = false;
    };
  }, [params.id]);

  const parent = parentId ? byId.get(parentId) : undefined;
  const effectiveKind: CategoryKind = parent?.kind ?? kind;
  const tileColor = parent?.color ?? color;
  const live = existing ? (byId.get(existing.id) ?? existing) : null;
  const archived = live?.archived ?? false;
  const children = useMemo(
    () => (existing ? (categories ?? []).filter((c) => c.parentId === existing.id) : []),
    [categories, existing],
  );
  const hasChildren = children.length > 0;

  // Keep a seeded icon or color that isn't in the standard set selectable.
  const icons = existing && !PICKABLE_ICONS.includes(existing.icon) ? [existing.icon, ...PICKABLE_ICONS] : PICKABLE_ICONS;
  const colors = existing && !CATEGORY_COLORS.includes(existing.color) ? [existing.color, ...CATEGORY_COLORS] : CATEGORY_COLORS;

  const parentOptions = (categories ?? []).filter(
    (c) => !c.parentId && c.kind === effectiveKind && !c.archived && c.id !== existing?.id,
  );

  const save = async () => {
    const trimmed = name.trim();
    if (!trimmed) return toast('Give the category a name');
    const finalColor = parent ? parent.color : color;
    setSaving(true);
    try {
      const id = await saveCategory({
        id: existing?.id,
        parentId: parent?.id ?? null,
        name: trimmed,
        kind: effectiveKind,
        icon,
        color: finalColor,
        nature: effectiveKind === 'income' ? 'none' : nature,
      });
      if (existing && !parent && hasChildren && existing.color !== finalColor) await setSubcategoryColor(id, finalColor);
      toast(existing ? 'Category updated' : `${trimmed} added`);
      goBack();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Couldn’t save the category');
    } finally {
      setSaving(false);
    }
  };

  const toggleArchived = async () => {
    if (!live) return;
    if (archived) {
      await restoreCategory(live.id);
      toast('Category unarchived');
      goBack();
      return;
    }
    if (hasChildren) {
      const ok = await confirm({
        title: `Archive ${live.name}?`,
        message: `Its ${plural(children.length, 'subcategory', 'subcategories')} are archived too. Past records keep their categories.`,
        confirmLabel: 'Archive category',
      });
      if (!ok) return;
    }
    await setCategoryArchived(live.id, true);
    toast('Category archived');
    goBack();
  };

  const natureFooter = (() => {
    const base = 'Where its spending lands in your needs, wants and savings split.';
    if (!parent) return hasChildren ? `${base} Subcategories set to Not set follow this.` : base;
    if (nature === 'none' && parent.nature !== 'none') return `${base} Not set follows ${parent.name}, which counts as ${natureLabel(parent.nature).toLowerCase()}.`;
    return base;
  })();

  const parentHint = hasChildren
    ? 'It has subcategories, so it stays at the top level.'
    : parent
      ? `Subcategories use their group’s color, so this one takes ${parent.name}’s.`
      : null;

  const archiveNote = archived
    ? 'Hidden from pickers. Past records keep it.'
    : hasChildren
      ? `Hides it and its ${plural(children.length, 'subcategory', 'subcategories')} from pickers. Past records keep them. Categories can’t be deleted because records use them.`
      : 'Hides it from pickers. Past records keep it. Categories can’t be deleted because records use them.';

  const title = editing ? 'Edit category' : parent ? 'New subcategory' : 'New category';
  // Wait for the record (or the group it goes into) so the form doesn't jump once it arrives.
  if ((editing && !existing) || (params.parentId && !categories)) {
    return (
      <Screen title={title} back testID="category-form">
        {missing ? <EmptyState icon="shapes" title="Category not found" body="It may have been removed. Go back to see your categories." /> : <View />}
      </Screen>
    );
  }

  return (
    <Screen
      title={title}
      back
      testID="category-form"
      footer={<Button label={editing ? 'Save changes' : 'Add category'} size="lg" full loading={saving} onPress={save} testID="category-save" />}
    >
      <View className="items-center pb-2 pt-3">
        <IconTile icon={icon} color={tileColor} size={64} />
      </View>

      <TextField label="Name" value={name} onChangeText={setName} placeholder="e.g. Groceries, Gym, Freelance" autoFocus={!editing} testID="category-name" />

      <View className="mt-2">
        <FieldRow
          label="Inside"
          value={parent ? parent.name : 'Top level'}
          left={parent ? <IconTile icon={parent.icon} color={parent.color} size={24} /> : null}
          onPress={hasChildren ? undefined : () => setParentSheet(true)}
          divider={false}
          testID="category-parent"
        />
        {parentHint ? (
          <Text variant="caption" tone="graphite" className="px-5">
            {parentHint}
          </Text>
        ) : null}
      </View>

      {!editing && !parent ? (
        <View className="px-5 pt-5">
          <SegmentedControl testID="category-kind" options={CATEGORY_KINDS} value={kind} onChange={setKind} />
        </View>
      ) : null}

      <Section title="Icon">
        <View className="flex-row flex-wrap px-3">
          {icons.map((glyph) => {
            const selected = glyph === icon;
            return (
              <Press
                key={glyph}
                onPress={() => setIcon(glyph)}
                haptic="select"
                testID={`category-icon-${glyph}`}
                accessibilityLabel={`Icon ${glyph.replace(/-/g, ' ')}`}
                accessibilityState={{ selected }}
                className="items-center py-1.5"
                style={{ width: '16.6666%' }}
              >
                <View className={`rounded-full border-2 p-0.5 ${selected ? 'border-ink' : 'border-transparent'}`}>
                  <IconTile icon={glyph} color={selected ? tileColor : undefined} muted={!selected} size={40} />
                </View>
              </Press>
            );
          })}
        </View>
      </Section>

      {!parent ? (
        <Section title="Color" footer={hasChildren ? 'Its subcategories take this color too.' : undefined}>
          <View className="flex-row flex-wrap gap-3 px-5">
            {colors.map((col) => (
              <Press
                key={col}
                onPress={() => setColor(col)}
                haptic="select"
                testID={`category-color-${toTestId(col)}`}
                accessibilityLabel={`Color ${col}`}
                accessibilityState={{ selected: color === col }}
              >
                <View className={`h-9 w-9 items-center justify-center rounded-full ${color === col ? 'border-2 border-ink' : ''}`}>
                  <View className="h-7 w-7 rounded-full" style={{ backgroundColor: col }} />
                </View>
              </Press>
            ))}
          </View>
        </Section>
      ) : null}

      {effectiveKind === 'expense' ? (
        <Section title="Counts as" footer={natureFooter}>
          <View className="px-5">
            <SegmentedControl testID="category-nature" options={NATURE_OPTIONS} value={nature} onChange={setNature} />
          </View>
        </Section>
      ) : null}

      {live ? (
        <View className="mt-8 gap-2.5 px-5">
          {!live.parentId && !archived ? (
            <Button
              label="Add subcategory"
              icon="plus"
              variant="secondary"
              full
              onPress={() => router.push({ pathname: '/categories/edit', params: { parentId: live.id } })}
              testID="category-add-sub"
            />
          ) : null}
          {isSystemCategory(live.id) ? (
            <Text variant="caption" tone="mist" className="text-center">
              Mula files some records here on its own, so this category can’t be archived.
            </Text>
          ) : (
            <>
              <Button
                label={archived ? 'Unarchive category' : 'Archive category'}
                icon="archive"
                variant="secondary"
                full
                onPress={toggleArchived}
                testID="category-archive"
              />
              <Text variant="caption" tone="mist" className="text-center">
                {archiveNote}
              </Text>
            </>
          )}
        </View>
      ) : null}

      <BottomSheet
        visible={parentSheet}
        onClose={() => setParentSheet(false)}
        title="Inside"
        subtitle="Put it in a group, or keep it as a group of its own."
        testID="category-parent-picker"
      >
        <ListRow
          testID="parent-option-top-level"
          title="Top level"
          subtitle="A group of its own"
          left={<IconTile icon="layers" size={34} muted />}
          right={!parent ? <Icon name="check" size={18} tone="accent" /> : null}
          divider={parentOptions.length > 0}
          onPress={() => {
            setParentId(null);
            setParentSheet(false);
          }}
        />
        {parentOptions.map((p, i) => (
          <ListRow
            key={p.id}
            testID={`parent-option-${toTestId(p.id)}`}
            title={p.name}
            left={<IconTile icon={p.icon} color={p.color} size={34} />}
            right={p.id === parent?.id ? <Icon name="check" size={18} tone="accent" /> : null}
            divider={i < parentOptions.length - 1}
            onPress={() => {
              setParentId(p.id);
              setParentSheet(false);
            }}
          />
        ))}
      </BottomSheet>
    </Screen>
  );
}
