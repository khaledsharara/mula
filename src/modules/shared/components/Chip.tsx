import { View } from 'react-native';

import { Icon } from './Icon';
import { Press } from './Press';
import { Text } from './Text';

type Props = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: string;
  /** A small colored dot before the label, e.g. an account color. */
  dot?: string;
  trailingIcon?: string;
  testID?: string;
};

export function Chip({ label, selected, onPress, icon, dot, trailingIcon, testID }: Props) {
  return (
    <Press
      testID={testID}
      onPress={onPress}
      haptic="select"
      accessibilityState={{ selected }}
      className={`min-h-9 flex-row items-center rounded-full px-3.5 py-1 ${selected ? 'bg-ink' : 'bg-sunk'}`}
    >
      {dot ? <View className="mr-2 h-2 w-2 rounded-full" style={{ backgroundColor: dot }} /> : null}
      {icon ? (
        <View className="mr-1.5">
          <Icon name={icon} size={15} tone={selected ? 'paper' : 'graphite'} />
        </View>
      ) : null}
      <Text variant="label" tone={selected ? 'paper' : 'ink'} numberOfLines={1}>
        {label}
      </Text>
      {trailingIcon ? (
        <View className="ml-1">
          <Icon name={trailingIcon} size={14} tone={selected ? 'paper' : 'graphite'} />
        </View>
      ) : null}
    </Press>
  );
}
