import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { router } from 'expo-router';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { usePendingSummary } from '../../inbox/data/inboxRepo';
import { Icon } from '../components/Icon';
import { Press } from '../components/Press';
import { Text } from '../components/Text';

const META: Record<string, { label: string; icon: string }> = {
  index: { label: 'Home', icon: 'house' },
  records: { label: 'Records', icon: 'layers' },
  insights: { label: 'Insights', icon: 'chart-column-big' },
  more: { label: 'More', icon: 'ellipsis' },
};

/**
 * Mula's own tab bar (web and Android; iPhone uses the system one). The selected tab sits on
 * a filled pill in the accent color so it's obvious where you are; the add button is in the middle.
 */
export function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { data: pending } = usePendingSummary();
  const routes = state.routes.filter((r) => META[r.name]);

  const tab = (routeIndex: number) => {
    const route = routes[routeIndex];
    const focused = state.routes[state.index]?.key === route.key;
    const meta = META[route.name];
    const badge = route.name === 'index' && (pending?.count ?? 0) > 0;
    return (
      <Press
        key={route.key}
        testID={`tab-${route.name}`}
        accessibilityRole="tab"
        aria-selected={focused}
        accessibilityLabel={meta.label}
        haptic="select"
        dim={0.6}
        onPress={() => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
        }}
        className="flex-1 items-center pt-2"
      >
        <View className={focused ? 'h-8 w-14 items-center justify-center rounded-full bg-accent-soft' : 'h-8 w-14 items-center justify-center rounded-full'}>
          <Icon name={meta.icon} size={21} tone={focused ? 'accent' : 'graphite'} strokeWidth={focused ? 2.1 : 1.75} />
          {badge ? <View className="absolute right-3 top-1 h-2 w-2 rounded-full bg-accent" /> : null}
        </View>
        <Text variant="caption" weight={focused ? 'bold' : 'medium'} tone={focused ? 'ink' : 'graphite'} className="mt-0.5">
          {meta.label}
        </Text>
      </Press>
    );
  };

  return (
    <View className="border-t border-hairline bg-paper" style={{ paddingBottom: Math.max(insets.bottom, 10) }}>
      <View className="flex-row items-start">
        {tab(0)}
        {tab(1)}
        <View className="flex-1 items-center pt-1.5">
          <Press
            testID="tab-add"
            accessibilityLabel="Add a record"
            haptic="medium"
            scale
            onPress={() => router.push('/add')}
            className="h-12 w-12 items-center justify-center rounded-full bg-ink"
          >
            <Icon name="plus" size={24} tone="paper" strokeWidth={2.25} />
          </Press>
        </View>
        {tab(2)}
        {tab(3)}
      </View>
    </View>
  );
}
