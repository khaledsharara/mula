import { View } from 'react-native';

import { ProgressBar } from '../../shared/components/Misc';
import { Text } from '../../shared/components/Text';
import { formatCount } from '../utils/format';

type Props = {
  step?: number;
  of?: number;
  title: string;
  body?: string;
};

/** Title block for a step of a multi-step flow: "Step 2 of 3", a heading and one or two lines. */
export function StepHeader({ step, of, title, body }: Props) {
  return (
    <View className="px-5 pt-3">
      {step && of ? (
        <Text variant="caption" tone="mist" tabular className="mb-1">
          Step {step} of {of}
        </Text>
      ) : null}
      <Text variant="title" accessibilityRole="header">
        {title}
      </Text>
      {body ? (
        <Text variant="body" tone="graphite" className="mt-2">
          {body}
        </Text>
      ) : null}
    </View>
  );
}

/** Live progress while records are written: "Importing 120 of 480". */
export function ImportProgress({ done, total }: { done: number; total: number }) {
  return (
    <View className="px-5 pt-12" testID="import-progress" accessibilityLiveRegion="polite">
      <Text variant="title" tabular>
        Importing {formatCount(done)} of {formatCount(total)}
      </Text>
      <View className="mt-4">
        <ProgressBar value={total ? done / total : 0} height={6} />
      </View>
      <Text variant="label" weight="regular" tone="graphite" className="mt-3">
        Keep Mula open until it finishes.
      </Text>
    </View>
  );
}
