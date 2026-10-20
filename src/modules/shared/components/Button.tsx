import { ActivityIndicator, View } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';
import type { ColorToken } from '../theme/tokens';
import { Icon } from './Icon';
import { Press, type HapticKind } from './Press';
import { Text } from './Text';

type Variant = 'primary' | 'accent' | 'secondary' | 'ghost' | 'danger';
type Size = 'lg' | 'md' | 'sm';

const surface: Record<Variant, string> = {
  primary: 'bg-ink',
  accent: 'bg-accent',
  secondary: 'bg-sunk',
  ghost: 'bg-transparent',
  danger: 'bg-transparent border border-hairline',
};

const textTone: Record<Variant, ColorToken> = {
  primary: 'paper',
  accent: 'on-accent',
  secondary: 'ink',
  ghost: 'accent',
  danger: 'danger',
};

// Minimum heights (not fixed ones) so larger iOS text sizes grow the button instead of clipping it.
const sizeClass: Record<Size, string> = {
  lg: 'min-h-14 px-6 py-3 rounded-field',
  md: 'min-h-11 px-5 py-2 rounded-field',
  sm: 'min-h-9 px-3.5 py-1.5 rounded-full',
};

type Props = {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  icon?: string;
  disabled?: boolean;
  loading?: boolean;
  full?: boolean;
  haptic?: HapticKind;
  testID?: string;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  disabled,
  loading,
  full,
  haptic = 'light',
  testID,
}: Props) {
  const { c } = useTheme();
  const tone = textTone[variant];
  return (
    <Press
      testID={testID}
      onPress={onPress}
      disabled={disabled || loading}
      haptic={haptic}
      scale
      accessibilityLabel={label}
      className={`${sizeClass[size]} ${surface[variant]} ${full ? 'self-stretch' : 'self-start'} flex-row items-center justify-center`}
    >
      {loading ? (
        <ActivityIndicator color={c[tone]} />
      ) : (
        <View className="flex-shrink flex-row items-center">
          {icon ? (
            <View className="mr-2">
              <Icon name={icon} size={size === 'sm' ? 16 : 18} tone={tone} />
            </View>
          ) : null}
          <Text variant={size === 'lg' ? 'body' : 'label'} weight="semibold" tone={tone} numberOfLines={1} className="flex-shrink">
            {label}
          </Text>
        </View>
      )}
    </Press>
  );
}

type IconButtonProps = {
  icon: string;
  onPress?: () => void;
  label: string;
  tone?: ColorToken;
  filled?: boolean;
  size?: number;
  testID?: string;
};

export function IconButton({ icon, onPress, label, tone = 'ink', filled, size = 40, testID }: IconButtonProps) {
  return (
    <Press
      testID={testID}
      onPress={onPress}
      haptic="light"
      accessibilityLabel={label}
      hitSlop={8}
      className={`items-center justify-center rounded-full ${filled ? 'bg-sunk' : ''}`}
      style={{ width: size, height: size }}
    >
      <Icon name={icon} size={Math.round(size * 0.5)} tone={tone} />
    </Press>
  );
}
