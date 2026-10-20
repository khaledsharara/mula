import { View } from 'react-native';

import type { NatureSplit } from '../../insights/utils/aggregations';
import { Text } from '../../shared/components/Text';
import { useTheme } from '../../shared/theme/ThemeProvider';

/** Two-tone bar: needs (ink) against wants (accent), savings in green when present. */
export function NatureBar({ split }: { split: NatureSplit }) {
  const { nature } = useTheme();
  const total = split.need + split.want + split.saving;
  if (total <= 0) return null;
  const pct = (n: number) => Math.round((n / total) * 100);
  const parts = [
    { key: 'need', value: split.need, color: nature.need, label: 'Needs' },
    { key: 'want', value: split.want, color: nature.want, label: 'Wants' },
    { key: 'saving', value: split.saving, color: nature.saving, label: 'Savings' },
  ].filter((p) => p.value > 0);

  return (
    <View accessibilityLabel={parts.map((p) => `${p.label} ${pct(p.value)} percent`).join(', ')}>
      <View className="h-1.5 flex-row overflow-hidden rounded-full">
        {parts.map((p, i) => (
          <View key={p.key} style={{ flex: p.value, backgroundColor: p.color, marginLeft: i ? 2 : 0 }} />
        ))}
      </View>
      <View className="mt-2 flex-row gap-4">
        {parts.map((p) => (
          <View key={p.key} className="flex-row items-center">
            <View className="mr-1.5 h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
            <Text variant="caption" tone="graphite" tabular>
              {p.label} {pct(p.value)}%
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
