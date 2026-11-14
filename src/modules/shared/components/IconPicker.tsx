import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { Chip } from './Chip';
import { ICON_GROUPS, PICKABLE_ICONS } from './iconCatalog';
import { IconTile } from './Misc';
import { Press } from './Press';

type Props = {
  value: string;
  onChange: (icon: string) => void;
  /** Color of the selected tile (the category's color). */
  color?: string;
  /** An icon outside the catalog that should stay choosable (e.g. one a seeded category came with). */
  keep?: string | null;
};

const ALL = 'all';

/** Icon grid with "All" and one tab per theme (food, transport, money…). */
export function IconPicker({ value, onChange, color, keep }: Props) {
  const [group, setGroup] = useState(ALL);
  const icons = useMemo(() => {
    const list = group === ALL ? PICKABLE_ICONS : (ICON_GROUPS.find((g) => g.key === group)?.icons ?? PICKABLE_ICONS);
    return keep && group === ALL && !list.includes(keep) ? [keep, ...list] : list;
  }, [group, keep]);

  return (
    <View testID="icon-picker">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 8, paddingBottom: 10 }}>
        <Chip label="All" selected={group === ALL} onPress={() => setGroup(ALL)} testID="icon-group-all" />
        {ICON_GROUPS.map((g) => (
          <Chip key={g.key} label={g.label} selected={group === g.key} onPress={() => setGroup(g.key)} testID={`icon-group-${g.key}`} />
        ))}
      </ScrollView>
      <View className="flex-row flex-wrap px-3">
        {icons.map((glyph) => {
          const selected = glyph === value;
          return (
            <Press
              key={glyph}
              onPress={() => onChange(glyph)}
              haptic="select"
              testID={`category-icon-${glyph}`}
              accessibilityLabel={`Icon ${glyph.replace(/-/g, ' ')}`}
              aria-selected={selected}
              className="items-center py-1.5"
              style={{ width: '16.6666%' }}
            >
              <View className={`rounded-full border-2 p-0.5 ${selected ? 'border-ink' : 'border-transparent'}`}>
                <IconTile icon={glyph} color={selected ? color : undefined} muted={!selected} size={40} />
              </View>
            </Press>
          );
        })}
      </View>
    </View>
  );
}
