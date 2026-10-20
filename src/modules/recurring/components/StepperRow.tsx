import { useEffect, useRef } from 'react';
import { View } from 'react-native';

import { Divider } from '../../shared/components/List';
import { Press } from '../../shared/components/Press';
import { Text } from '../../shared/components/Text';

type StepperProps = {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  format?: (v: number) => string;
  testID: string;
};

/**
 * Same look as the kit's Stepper, plus test IDs on each button and hold-to-repeat so
 * larger counts (24 payments) don't take 24 taps.
 */
export function TestableStepper({ value, onChange, min, max, format = String, testID }: StepperProps) {
  const valueRef = useRef(value);
  valueRef.current = value;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  };
  useEffect(() => stop, []);

  const step = (delta: number) => {
    const next = Math.min(max, Math.max(min, valueRef.current + delta));
    if (next === valueRef.current) return stop();
    valueRef.current = next;
    onChangeRef.current(next);
  };
  const repeat = (delta: number) => {
    stop();
    timer.current = setInterval(() => step(delta), 90);
  };

  return (
    <View className="flex-row items-center rounded-full bg-sunk">
      <Press
        testID={`${testID}-decrease`}
        onPress={() => step(-1)}
        onLongPress={() => repeat(-1)}
        onPressOut={stop}
        haptic="select"
        disabled={value <= min}
        className="h-9 w-10 items-center justify-center"
        accessibilityLabel="Decrease"
      >
        <Text variant="heading" weight="regular">
          −
        </Text>
      </Press>
      <Text variant="label" tabular className="min-w-[36px] text-center" testID={`${testID}-value`}>
        {format(value)}
      </Text>
      <Press
        testID={`${testID}-increase`}
        onPress={() => step(1)}
        onLongPress={() => repeat(1)}
        onPressOut={stop}
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

type RowProps = StepperProps & {
  label: string;
  /** Unit text after the stepper, e.g. "months". */
  suffix?: string;
  divider?: boolean;
};

/** Label on the left, stepper and unit on the right; sized to sit between FieldRows. */
export function StepperRow({ label, suffix, divider = true, ...stepper }: RowProps) {
  return (
    <View>
      <View className="min-h-14 flex-row items-center px-5 py-1.5">
        <Text variant="label" weight="regular" tone="graphite" numberOfLines={1} className="mr-3 flex-shrink-0">
          {label}
        </Text>
        <View className="flex-1 flex-row items-center justify-end">
          <TestableStepper {...stepper} />
          {suffix ? (
            <Text variant="body" numberOfLines={1} className="ml-3 min-w-[72px] flex-shrink">
              {suffix}
            </Text>
          ) : null}
        </View>
      </View>
      {divider ? <Divider /> : null}
    </View>
  );
}
