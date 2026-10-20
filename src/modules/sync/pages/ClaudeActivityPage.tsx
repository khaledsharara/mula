import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';

import { Button } from '../../shared/components/Button';
import { confirm, toast } from '../../shared/components/Feedback';
import { Section } from '../../shared/components/List';
import { EmptyState } from '../../shared/components/Misc';
import { Text } from '../../shared/components/Text';
import { Screen } from '../../shared/layouts/Screen';
import { ageLabel } from '../../shared/utils/dates';
import { listClaudeActivity, undoClaudeChange } from '../data/syncEngine';
import type { ClaudeActivity } from '../types';

/** Everything Claude changed through its connector, newest first, each with Undo. */
export default function ClaudeActivityPage() {
  const [items, setItems] = useState<ClaudeActivity[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setItems(await listClaudeActivity());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Couldn’t reach the relay');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const undo = async (a: ClaudeActivity) => {
    const ok = await confirm({ title: 'Undo this change?', message: a.summary, confirmLabel: 'Undo' });
    if (!ok) return;
    setBusy(a.id);
    try {
      const r = await undoClaudeChange(a.id);
      toast(r.skipped ? `Undone. ${r.skipped} edited again since, so left as they are` : 'Undone');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Couldn’t undo that');
    } finally {
      setBusy(null);
      void load();
    }
  };

  return (
    <Screen title="Claude’s changes" back testID="claude-activity-page">
      {error ? (
        <Text variant="body" tone="danger" className="px-5 pt-2" testID="claude-activity-error">
          {error}
        </Text>
      ) : null}
      {items && !items.length ? (
        <EmptyState icon="bot" title="Nothing yet" body="Changes Claude makes in Mula show up here, and you can undo any of them." testID="claude-activity-empty" />
      ) : null}
      {items?.length ? (
        <Section footer="Undo restores what each record looked like before. Records edited again since are left alone.">
          {items.map((a, i) => (
            <View key={a.id} className="flex-row items-center px-5 py-3" testID={`activity-row-${i}`}>
              <View className="flex-1 pr-3">
                <Text variant="body" tone={a.undoneAt ? 'graphite' : 'ink'} numberOfLines={3}>
                  {a.summary}
                </Text>
                <Text variant="caption" tone="graphite" className="mt-0.5">
                  {a.undoneAt ? `Undone ${ageLabel(a.undoneAt)} ago` : `${ageLabel(a.at)} ago · ${a.rows} ${a.rows === 1 ? 'record' : 'records'}`}
                </Text>
              </View>
              {a.undoneAt ? null : (
                <Button label="Undo" size="sm" variant="secondary" onPress={() => void undo(a)} loading={busy === a.id} testID={`activity-undo-${i}`} />
              )}
            </View>
          ))}
        </Section>
      ) : null}
    </Screen>
  );
}
