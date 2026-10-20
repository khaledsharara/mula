import NativeSegmentedControl from '@expo/ui/community/segmented-control';
import { useEffect, useState } from 'react';
import { Platform, View, type LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { useTheme } from '../theme/ThemeProvider';
import { haptic, Press } from './Press';
import { Text } from './Text';

type Option<T extends string> = { value: T; label: string };

type Props<T extends string> = {
  options: Option<T>[];
  value: T;
  onChange: (v: T) => void;
  testID?: string;
};

/** The system segmented control on iPhone (Liquid Glass on iOS 26+); a matching one elsewhere. */
export function SegmentedControl<T extends string>(props: Props<T>) {
  return Platform.OS === 'ios' ? <IosSegments {...props} /> : <Segments {...props} />;
}

function IosSegments<T extends string>({ options, value, onChange, testID }: Props<T>) {
  const { scheme } = useTheme();
  return (
    <NativeSegmentedControl
      values={options.map((o) => o.label)}
      selectedIndex={Math.max(0, options.findIndex((o) => o.value === value))}
      onChange={(e) => {
        const next = options[e.nativeEvent.selectedSegmentIndex];
        if (!next || next.value === value) return;
        haptic('select');
        onChange(next.value);
      }}
      appearance={scheme}
      style={{ alignSelf: 'stretch' }}
      testID={testID}
    />
  );
}

function Segments<T extends string>({ options, value, onChange, testID }: Props<T>) {
  const { c, scheme } = useTheme();
  const [width, setWidth] = useState(0);
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  const x = useSharedValue(0);
  const segment = width > 0 ? (width - 6) / options.length : 0;

  useEffect(() => {
    x.value = withTiming(index * segment, { duration: 220 });
  }, [index, segment, x]);

  const indicator = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  return (
    <View
      testID={testID}
      className="h-10 flex-row rounded-full bg-sunk p-[3px]"
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
    >
      {segment > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              top: 3,
              bottom: 3,
              left: 3,
              width: segment,
              borderRadius: 999,
              backgroundColor: c.sheet,
              shadowColor: '#000',
              shadowOpacity: scheme === 'dark' ? 0 : 0.08,
              shadowRadius: 4,
              shadowOffset: { width: 0, height: 1 },
            },
            indicator,
          ]}
        />
      ) : null}
      {options.map((o) => (
        <Press
          key={o.value}
          testID={testID ? `${testID}-${o.value}` : undefined}
          onPress={() => onChange(o.value)}
          haptic="select"
          dim={0.8}
          aria-selected={o.value === value}
          className="flex-1 items-center justify-center"
        >
          <Text variant="label" weight={o.value === value ? 'semibold' : 'medium'} tone={o.value === value ? 'ink' : 'graphite'} numberOfLines={1}>
            {o.label}
          </Text>
        </Press>
      ))}
    </View>
  );
}
