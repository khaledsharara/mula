import { forwardRef, type ComponentRef, type ReactNode } from 'react';
import { Switch, TextInput, View, type TextInputProps } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';
import { Divider } from './List';
import { Press } from './Press';
import { Text } from './Text';
import { noOutline } from '../utils/styles';

type FieldProps = TextInputProps & {
  label?: string;
  hint?: string;
  error?: string | null;
  right?: ReactNode;
};

/** A labelled input on a sunk surface; the label sits above, never inside as a placeholder. */
export const TextField = forwardRef<ComponentRef<typeof TextInput>, FieldProps>(function TextField(
  { label, hint, error, right, style, ...rest },
  ref,
) {
  const { c } = useTheme();
  return (
    <View className="px-5 py-2">
      {label ? (
        <Text variant="label" tone="graphite" className="mb-1.5">
          {label}
        </Text>
      ) : null}
      <View className={`min-h-12 flex-row items-center rounded-field bg-sunk px-4 ${error ? 'border border-danger' : ''}`}>
        <TextInput
          ref={ref}
          placeholderTextColor={c.mist}
          selectionColor={c.accent}
          className="flex-1 py-3 font-regular text-body text-ink"
          style={[noOutline, style]}
          {...rest}
        />
        {right}
      </View>
      {error ? (
        <Text variant="caption" tone="danger" className="mt-1.5">
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption" tone="graphite" className="mt-1.5">
          {hint}
        </Text>
      ) : null}
    </View>
  );
});

type ToggleRowProps = {
  title: string;
  subtitle?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  divider?: boolean;
  disabled?: boolean;
  testID?: string;
};

export function ToggleRow({ title, subtitle, value, onChange, divider = true, disabled, testID }: ToggleRowProps) {
  const { c } = useTheme();
  return (
    <View style={disabled ? { opacity: 0.45 } : null}>
      <View className="min-h-[56px] flex-row items-center px-5 py-3">
        <View className="flex-1 pr-4">
          <Text variant="body">{title}</Text>
          {subtitle ? (
            <Text variant="caption" tone="graphite" className="mt-0.5">
              {subtitle}
            </Text>
          ) : null}
        </View>
        <Switch
          testID={testID}
          value={value}
          onValueChange={onChange}
          disabled={disabled}
          trackColor={{ false: c.hairline, true: c.accent }}
          thumbColor={c.sheet}
          ios_backgroundColor={c.hairline}
          accessibilityLabel={title}
        />
      </View>
      {divider ? <Divider /> : null}
    </View>
  );
}

type StepperProps = {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  format?: (v: number) => string;
  testID?: string;
};

export function Stepper({ value, onChange, min = 0, max = 99, format = String, testID }: StepperProps) {
  return (
    <View className="flex-row items-center rounded-full bg-sunk" testID={testID}>
      <Press
        testID={testID ? `${testID}-minus` : undefined}
        onPress={() => onChange(Math.max(min, value - 1))}
        haptic="select"
        disabled={value <= min}
        className="h-9 w-10 items-center justify-center"
        accessibilityLabel="Decrease"
      >
        <Text variant="heading" weight="regular">
          −
        </Text>
      </Press>
      <Text variant="label" tabular className="min-w-[44px] text-center">
        {format(value)}
      </Text>
      <Press
        testID={testID ? `${testID}-plus` : undefined}
        onPress={() => onChange(Math.min(max, value + 1))}
        haptic="select"
        disabled={value >= max}
        className="h-9 w-10 items-center justify-center"
        accessibilityLabel="Increase"
      >
        <Text variant="heading" weight="regular">
          +
        </Text>
      </Press>
    </View>
  );
}
