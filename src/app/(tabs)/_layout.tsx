import { router } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { Platform } from 'react-native';

import { usePendingSummary } from '@/modules/inbox/data/inboxRepo';
import { TabBar } from '@/modules/shared/layouts/TabBar';
import { useTheme } from '@/modules/shared/theme/ThemeProvider';

/**
 * iPhone: the system tab bar (Liquid Glass on iOS 26+), with a center Add tab that opens the
 * add screen instead of switching tabs. Web and Android: Mula's own tab bar.
 */
export default function TabsLayout() {
  return Platform.OS === 'ios' ? <IosTabs /> : <JsTabs />;
}

function IosTabs() {
  const { c } = useTheme();
  const { data: pending } = usePendingSummary();
  const count = pending?.count ?? 0;
  return (
    <NativeTabs tintColor={c.accent} minimizeBehavior="never">
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} md="home" />
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Badge hidden={count === 0}>{String(count)}</NativeTabs.Trigger.Badge>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="records">
        <NativeTabs.Trigger.Icon sf={{ default: 'list.bullet.rectangle', selected: 'list.bullet.rectangle.fill' }} md="list" />
        <NativeTabs.Trigger.Label>Records</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger
        name="new"
        disabled
        listeners={{
          // Disabled tabs still report taps; use it as the add button.
          tabPress: () => router.push('/add'),
        }}
      >
        <NativeTabs.Trigger.Icon sf="plus.circle.fill" md="add_circle" />
        <NativeTabs.Trigger.Label>Add</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="insights">
        <NativeTabs.Trigger.Icon sf={{ default: 'chart.bar', selected: 'chart.bar.fill' }} md="bar_chart" />
        <NativeTabs.Trigger.Label>Insights</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="more">
        <NativeTabs.Trigger.Icon sf={{ default: 'ellipsis.circle', selected: 'ellipsis.circle.fill' }} md="more_horiz" />
        <NativeTabs.Trigger.Label>More</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function JsTabs() {
  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="records" />
      <Tabs.Screen name="new" options={{ href: null }} />
      <Tabs.Screen name="insights" />
      <Tabs.Screen name="more" />
    </Tabs>
  );
}
