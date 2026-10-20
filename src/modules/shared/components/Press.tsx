import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Platform, Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

export type HapticKind = 'light' | 'medium' | 'select' | 'success' | 'warning' | 'none';

export function haptic(kind: HapticKind = 'light'): void {
  if (Platform.OS === 'web' || kind === 'none') return;
  if (kind === 'select') void Haptics.selectionAsync();
  else if (kind === 'success') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  else if (kind === 'warning') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  else void Haptics.impactAsync(kind === 'medium' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light);
}

export type PressProps = Omit<PressableProps, 'style'> & {
  haptic?: HapticKind;
  /** How much the element dims while pressed. */
  dim?: number;
  scale?: boolean;
  className?: string;
  style?: StyleProp<ViewStyle>;
};

/** Pressable with consistent feedback: a quick dim (and optional scale) plus a haptic tick. */
export function Press({
  haptic: kind = 'none',
  dim = 0.55,
  scale = false,
  onPress,
  onPressIn,
  onPressOut,
  style,
  disabled,
  ...rest
}: PressProps) {
  // Tracked in state (not a style function) so NativeWind's className styles merge cleanly.
  const [pressed, setPressed] = useState(false);
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPressIn={(e) => {
        setPressed(true);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        setPressed(false);
        onPressOut?.(e);
      }}
      onPress={(e) => {
        // Reset here too: when a press opens a modal, the web build can miss the press-out.
        setPressed(false);
        haptic(kind);
        onPress?.(e);
      }}
      style={[
        style,
        disabled ? { opacity: 0.35 } : pressed ? { opacity: dim, transform: scale ? [{ scale: 0.97 }] : undefined } : null,
      ]}
      {...rest}
    />
  );
}
