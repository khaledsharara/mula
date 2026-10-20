import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Icon } from '../../shared/components/Icon';
import { Divider } from '../../shared/components/List';
import { Press } from '../../shared/components/Press';
import { Text } from '../../shared/components/Text';

type Props = {
  label: string;
  value?: string | null;
  placeholder?: string;
  onPress?: () => void;
  left?: ReactNode;
  /** Extra content after the value (e.g. a converted amount or a clear button). Sits outside the tap area. */
  right?: ReactNode;
  /** Draws attention when something still needs choosing. */
  needed?: boolean;
  divider?: boolean;
  testID?: string;
};

/** Compact label/value row used in forms. */
export function FieldRow({ label, value, placeholder = 'Choose', onPress, left, right, needed, divider = true, testID }: Props) {
  const body = (
    <View className="min-h-12 flex-row items-center py-2">
      <Text variant="label" weight="regular" tone="graphite" numberOfLines={1} className="mr-4 flex-shrink-0">
        {label}
      </Text>
      <View className="flex-1 flex-row items-center justify-end">
        {left ? <View className="mr-2">{left}</View> : null}
        <Text variant="body" tone={value ? 'ink' : needed ? 'accent' : 'mist'} numberOfLines={1} className="flex-shrink text-right">
          {value ?? placeholder}
        </Text>
        {onPress && !right ? (
          <View className="ml-1">
            <Icon name="chevron-right" size={16} tone="mist" />
          </View>
        ) : null}
      </View>
    </View>
  );

  return (
    <View>
      <View className="flex-row items-center px-5">
        {onPress ? (
          <Press onPress={onPress} dim={0.6} testID={testID} accessibilityLabel={`${label}: ${value ?? placeholder}`} className="flex-1">
            {body}
          </Press>
        ) : (
          <View className="flex-1" testID={testID}>
            {body}
          </View>
        )}
        {right ? <View className="flex-row items-center">{right}</View> : null}
      </View>
      {divider ? <Divider /> : null}
    </View>
  );
}
