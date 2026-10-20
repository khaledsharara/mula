import * as Clipboard from 'expo-clipboard';
import { useEffect, useState } from 'react';
import { TextInput, View } from 'react-native';

import { SUPPORTED_BANK_NAMES, SUPPORTED_BANKS } from '../../banks';
import { BottomSheet } from '../../shared/components/BottomSheet';
import { Button } from '../../shared/components/Button';
import { toast } from '../../shared/components/Feedback';
import { Text } from '../../shared/components/Text';
import { useTheme } from '../../shared/theme/ThemeProvider';
import { ingestSms } from '../data/inboxRepo';
import { noOutline } from '../../shared/utils/styles';

type Props = { visible: boolean; onClose: () => void; onAdded?: (id: string) => void };

/** Paste one or more bank messages; each is parsed and added to the inbox. */
export function PasteSmsSheet({ visible, onClose, onAdded }: Props) {
  const { c } = useTheme();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!visible) setText('');
  }, [visible]);

  const pasteFromClipboard = async () => {
    const v = await Clipboard.getStringAsync().catch(() => '');
    if (v) setText(v);
    else toast('The clipboard is empty');
  };

  const add = async () => {
    const messages = text
      .split(/\n\s*\n/)
      .map((m) => m.trim())
      .filter(Boolean);
    if (!messages.length) return;
    setBusy(true);
    let added = 0;
    let ignored = 0;
    let duplicate = 0;
    let lastId: string | null = null;
    for (const m of messages) {
      const r = await ingestSms(m, 'paste');
      if (r.result === 'added') {
        added++;
        lastId = r.id;
      } else if (r.result === 'duplicate') duplicate++;
      else ignored++;
    }
    setBusy(false);
    if (added) {
      toast(added === 1 ? 'Added to your inbox' : `${added} messages added to your inbox`);
      onClose();
      if (lastId) onAdded?.(lastId);
    } else if (duplicate) toast('Already in your inbox');
    else if (ignored) toast('That message doesn’t describe a payment');
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Paste a bank message"
      subtitle={`Copy an SMS from ${SUPPORTED_BANK_NAMES} and paste it here. Separate several with an empty line.`}
      testID="paste-sheet"
      footer={
        <View className="gap-2.5">
          <Button label="Add to inbox" size="lg" full onPress={add} loading={busy} disabled={!text.trim()} testID="paste-add" />
          <Button label="Paste from clipboard" variant="secondary" size="lg" full icon="clipboard-paste" onPress={pasteFromClipboard} testID="paste-clipboard" />
        </View>
      }
    >
      <View className="px-5 pb-2">
        <TextInput
          testID="paste-input"
          value={text}
          onChangeText={setText}
          multiline
          placeholder={SUPPORTED_BANKS[0]?.example}
          placeholderTextColor={c.mist}
          selectionColor={c.accent}
          className="min-h-[140px] rounded-field bg-sunk px-4 py-3 font-regular text-body text-ink"
          style={[{ textAlignVertical: 'top' }, noOutline]}
        />
        <Text variant="caption" tone="mist" className="mt-2">
          Codes, offers and declined payments are skipped automatically.
        </Text>
      </View>
    </BottomSheet>
  );
}
