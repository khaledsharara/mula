import { useState } from 'react';
import { View } from 'react-native';
import { create } from 'zustand';

import { BottomSheet } from '../../shared/components/BottomSheet';
import { Button } from '../../shared/components/Button';
import { ToggleRow } from '../../shared/components/Fields';
import { Text } from '../../shared/components/Text';

export type AliasDecision = { always: boolean; relabelPast: boolean } | null;

type State = {
  request: { raw: string; name: string; canRelabel: boolean } | null;
  resolve: ((d: AliasDecision) => void) | null;
};

const useAliasStore = create<State>(() => ({ request: null, resolve: null }));

/**
 * Asks whether a renamed bank name should stick: "Always show JOHN XYZ as John Doe?".
 * Resolves null if dismissed.
 */
export function askAlias(raw: string, name: string, canRelabel = false): Promise<AliasDecision> {
  return new Promise((resolve) => useAliasStore.setState({ request: { raw, name, canRelabel }, resolve }));
}

export function AliasPromptHost() {
  const { request, resolve } = useAliasStore();
  const [relabel, setRelabel] = useState(true);
  const done = (d: AliasDecision) => {
    resolve?.(d);
    useAliasStore.setState({ request: null, resolve: null });
    setRelabel(true);
  };
  return (
    <BottomSheet visible={Boolean(request)} onClose={() => done(null)} scroll={false} testID="alias-prompt">
      {request ? (
        <View className="px-5 pb-1 pt-4">
          <Text variant="label" tone="graphite">
            Your bank calls them
          </Text>
          <Text variant="heading" className="mt-1" selectable>
            {request.raw}
          </Text>
          <Text variant="body" className="mt-4">
            Show them as <Text variant="body" weight="semibold">{request.name}</Text> from now on?
          </Text>
          <Text variant="label" weight="regular" tone="graphite" className="mt-1">
            Future messages with this name will fill in {request.name} automatically.
          </Text>
        </View>
      ) : null}
      {request?.canRelabel ? (
        <View className="mt-2">
          <ToggleRow title="Also update past records" value={relabel} onChange={setRelabel} divider={false} />
        </View>
      ) : null}
      <View className="gap-2.5 px-5 pb-2 pt-4">
        <Button label="Always use this name" size="lg" full onPress={() => done({ always: true, relabelPast: Boolean(request?.canRelabel && relabel) })} testID="alias-always" />
        <Button label="Just this once" variant="secondary" size="lg" full onPress={() => done({ always: false, relabelPast: false })} testID="alias-once" />
      </View>
    </BottomSheet>
  );
}
