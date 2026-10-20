import { useCallback, useEffect, useState } from 'react';
import { AppState, Linking, View } from 'react-native';

import { SUPPORTED_BANK_NAMES } from '../../banks';
import {
  catchUpSms,
  requestSmsPermission,
  senderList,
  smsCaptureAvailable,
  smsPermission,
  type SmsPermission,
} from '../../integrations/utils/androidSms';
import { drainShortcutQueue } from '../../integrations/utils/intents';
import { ensurePermission } from '../../integrations/utils/notifications';
import { Button } from '../../shared/components/Button';
import { Chip } from '../../shared/components/Chip';
import { toast } from '../../shared/components/Feedback';
import { TextField, ToggleRow } from '../../shared/components/Fields';
import { ListRow, Section } from '../../shared/components/List';
import { Text } from '../../shared/components/Text';
import { setSetting, useSettings } from '../../shared/settings/settingsStore';

const PERMISSION_LABEL: Record<SmsPermission, string> = {
  granted: 'Allowed',
  denied: 'Not allowed yet',
  blocked: 'Blocked. Allow it in App info',
};

/** Android: reads bank SMS as they arrive, in place of the iPhone's Shortcuts automation. */
export function AndroidSmsSection() {
  const capture = useSettings((s) => s.smsCapture);
  const notify = useSettings((s) => s.smsNotify);
  const extra = useSettings((s) => s.smsExtraSenders);
  const [permission, setPermission] = useState<SmsPermission | null>(null);
  const [asked, setAsked] = useState(false);
  const [sender, setSender] = useState('');

  const readPermission = useCallback(async () => setPermission(await smsPermission()), []);

  useEffect(() => {
    void readPermission();
    // Coming back from App info may have changed it.
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') void readPermission();
    });
    return () => sub.remove();
  }, [readPermission]);

  if (!smsCaptureAvailable) {
    return (
      <Section title="Bank messages">
        <Text variant="body" tone="graphite" className="px-5">
          Automatic capture comes with the installed Android app (the APK from the Mula releases page). Until then, paste messages into your inbox.
        </Text>
      </Section>
    );
  }

  const turnOn = async () => {
    const result = await requestSmsPermission();
    setAsked(true);
    setPermission(result);
    if (result !== 'granted') {
      toast('Mula needs SMS access to read bank messages');
      return;
    }
    await setSetting('smsCapture', true);
    if (notify) await ensurePermission().catch(() => false);
    void catchUpSms().then(() => drainShortcutQueue());
    toast(`Mula now reads new messages from ${SUPPORTED_BANK_NAMES}`);
  };

  const toggle = (on: boolean) => {
    if (on) void turnOn();
    else void setSetting('smsCapture', false).then(() => toast('Bank messages are no longer read'));
  };

  const addSender = () => {
    const name = sender.trim();
    if (!name) return;
    if (senderList(extra).some((s) => s.toLowerCase() === name.toLowerCase())) {
      toast('Already on the list');
      return;
    }
    void setSetting('smsExtraSenders', [...extra, name]);
    setSender('');
  };

  const removeSender = (name: string) => void setSetting('smsExtraSenders', extra.filter((s) => s !== name));

  const needsHelp = asked && permission !== 'granted';

  return (
    <>
      <Section
        title="Bank messages"
        footer={`Only messages from the senders below are read. Everything else on your phone is left alone and never stored.`}
      >
        <ToggleRow
          title="Read bank messages"
          subtitle={
            capture
              ? `New messages from ${SUPPORTED_BANK_NAMES} land in your inbox, even while Mula is closed.`
              : `Turn on to fill in payments from ${SUPPORTED_BANK_NAMES} SMS automatically.`
          }
          value={capture && permission === 'granted'}
          onChange={toggle}
          testID="sms-capture"
        />
        <ListRow title="SMS access" value={permission ? PERMISSION_LABEL[permission] : 'Checking'} testID="sms-permission" />
        <ToggleRow
          title="Notify me"
          subtitle="A notification when a payment is waiting for you."
          value={notify}
          onChange={(v) => {
            void setSetting('smsNotify', v);
            if (v) void ensurePermission().catch(() => false);
          }}
          divider={false}
          testID="sms-notify"
        />
      </Section>

      {needsHelp || (capture && permission !== 'granted') ? (
        <Section title="Allow SMS access">
          <View className="mx-5 rounded-field bg-alert-soft px-4 py-3" testID="sms-restricted-help">
            <Text variant="body">Android keeps SMS access locked for apps installed from an APK. To unlock it:</Text>
            <Text variant="body" className="mt-2">
              1. Tap Open app info below.
            </Text>
            <Text variant="body">2. Tap ⋮ (top right) › Allow restricted settings, and confirm.</Text>
            <Text variant="body">3. Tap Permissions › SMS › Allow.</Text>
            <Text variant="body">4. Come back here and turn on Read bank messages.</Text>
            <Text variant="caption" tone="graphite" className="mt-2">
              If the menu item isn’t there, try turning the switch on first: Android only offers it after it has blocked a request once.
            </Text>
          </View>
          <View className="mt-3 px-5">
            <Button label="Open app info" icon="settings-2" variant="secondary" full onPress={() => void Linking.openSettings()} testID="sms-open-settings" />
          </View>
        </Section>
      ) : null}

      <Section title="Senders" footer="Messages from another bank are added with the generic reader, which may need a little help in the inbox.">
        <View className="flex-row flex-wrap gap-2 px-5">
          {senderList([]).map((s) => (
            <Chip key={s} label={s} testID={`sms-sender-${s}`} />
          ))}
          {extra.map((s) => (
            <Chip key={s} label={s} trailingIcon="x" onPress={() => removeSender(s)} testID={`sms-sender-extra-${s}`} />
          ))}
        </View>
        <TextField
          label="Add a sender"
          value={sender}
          onChangeText={setSender}
          placeholder="The name your bank texts from"
          autoCapitalize="characters"
          returnKeyType="done"
          onSubmitEditing={addSender}
          right={
            sender.trim() ? (
              <Button label="Add" size="sm" variant="secondary" onPress={addSender} testID="sms-sender-add" />
            ) : null
          }
          testID="sms-sender-input"
        />
      </Section>
    </>
  );
}
