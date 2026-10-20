import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Divider } from '../../shared/components/List';
import { IconTile } from '../../shared/components/Misc';
import { Press } from '../../shared/components/Press';
import { Text } from '../../shared/components/Text';
import type { Category } from '../../shared/db/types';

const PARENT_TILE = 40;
const SUB_TILE = 30;
/** Matches `pl-11` on subcategory rows. */
const SUB_INDENT = 44;
const SUB_TEXT_INSET = SUB_INDENT + SUB_TILE + 14;

type Props = {
  category: Category;
  /** Subcategories sit indented under their group with a smaller tile. */
  sub?: boolean;
  subtitle?: string | null;
  /** Archived categories stay visible but quiet. */
  dimmed?: boolean;
  /** Sits outside the row's press area, so it can hold its own button. */
  right?: ReactNode;
  onPress?: () => void;
  /** "inset" lines up with the subcategory names below; "full" closes a group. */
  divider?: 'inset' | 'full' | 'none';
  testID?: string;
};

export function CategoryRow({ category, sub, subtitle, dimmed, right, onPress, divider = 'inset', testID }: Props) {
  return (
    <View>
      <View className="flex-row items-center pr-5" style={dimmed ? { opacity: 0.45 } : undefined}>
        <Press
          testID={testID}
          onPress={onPress}
          dim={0.6}
          accessibilityLabel={dimmed ? `${category.name}, archived` : category.name}
          className={`flex-1 flex-row items-center py-3 ${sub ? 'min-h-[52px] pl-11' : 'min-h-[60px] pl-5'}`}
        >
          <View className="mr-3.5">
            <IconTile icon={category.icon} color={category.color} size={sub ? SUB_TILE : PARENT_TILE} />
          </View>
          <View className="flex-1 pr-3">
            <Text variant="body" weight={sub ? 'regular' : 'medium'} numberOfLines={1}>
              {category.name}
            </Text>
            {subtitle ? (
              <Text variant="caption" tone="graphite" numberOfLines={1} className="mt-0.5">
                {subtitle}
              </Text>
            ) : null}
          </View>
        </Press>
        {right}
      </View>
      {divider !== 'none' ? <Divider inset={divider === 'full' ? 20 : SUB_TEXT_INSET} /> : null}
    </View>
  );
}
