import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Platform, View } from 'react-native';

import { SUPPORTED_BANK_NAMES, SUPPORTED_BANKS } from '../../banks';
import { Button } from '../../shared/components/Button';
import { Chip } from '../../shared/components/Chip';
import { toast } from '../../shared/components/Feedback';
import { Section } from '../../shared/components/List';
import { Text } from '../../shared/components/Text';
import { Screen } from '../../shared/layouts/Screen';
import { CloudSection } from '../../sync/components/CloudSection';
import { AndroidSmsSection } from '../components/AndroidSmsSection';

/** A menu path or option name as it appears on the iPhone. */
function Ui({ children }: { children: ReactNode }) {
  return (
    <Text variant="body" weight="semibold">
      {children}
    </Text>
  );
}

function StepItem({ n, children, extra }: { n: number; children: ReactNode; extra?: ReactNode }) {
  return (
    <View className="flex-row px-5 py-2.5">
      <View className="mr-3.5 mt-px h-6 w-6 items-center justify-center rounded-full bg-sunk">
        <Text variant="caption" weight="semibold" tone="graphite" tabular>
          {n}
        </Text>
      </View>
      <View className="flex-1">
        <Text variant="body">{children}</Text>
        {extra}
      </View>
    </View>
  );
}

const KEYWORDS = SUPPORTED_BANKS.flatMap((b) => b.shortcutKeywords.map((k) => ({ ...k, bank: b.name })));

export default function IntegrationsPage() {
  const copy = async (word: string) => {
    await Clipboard.setStringAsync(word);
    toast(`Copied “${word}”`);
  };
  const android = Platform.OS === 'android';

  return (
    <Screen title="Automation" back testID="integrations-page">
      {android ? (
        <AndroidSmsSection />
      ) : (
        <Section title="Bank messages">
          <Text variant="body" tone="graphite" className="px-5">
            In the iPhone app, a Shortcuts automation hands each {SUPPORTED_BANK_NAMES} message to Mula in the background, so payments arrive already filled in.
          </Text>
        </Section>
      )}

      <Section title="Paste instead">
        <Text variant="body" tone="graphite" className="px-5">
          Copy a message from Messages and paste it into your inbox. Works anywhere, including the web.
        </Text>
        <View className="mt-4 px-5">
          <Button
            label="Paste a bank message"
            icon="clipboard-paste"
            variant="secondary"
            onPress={() => router.push({ pathname: '/inbox', params: { paste: '1' } })}
            testID="integrations-paste"
          />
        </View>
      </Section>

      {!android ? (
        <Section title="Set up on iPhone" footer="The Mula actions show up in Shortcuts once the Mula app is installed (SideStore). Full guide: docs/shortcuts.md on GitHub.">
          <StepItem n={1}>
            Open <Ui>Shortcuts › Automation › New automation › Message</Ui>.
          </StepItem>
          <StepItem
            n={2}
            extra={
              <View className="mt-2.5 gap-2">
                {KEYWORDS.map((k) => (
                  <View key={`${k.bank}-${k.word}`} className="flex-row items-center">
                    <Text variant="label" weight="regular" tone="graphite" numberOfLines={1} className="mr-2 min-w-20">
                      {KEYWORDS.length > 2 ? `${k.bank} ${k.label.toLowerCase()}` : k.label}
                    </Text>
                    <Chip label={k.word} trailingIcon="copy" onPress={() => void copy(k.word)} testID={k.testID} />
                  </View>
                ))}
                <Text variant="caption" tone="mist">
                  Tap a word to copy it.
                </Text>
              </View>
            }
          >
            Set <Ui>Message contains</Ui> to the first word below. Make one more automation for each other word, so every payment message is covered.
          </StepItem>
          <StepItem n={3}>
            Choose <Ui>Run Immediately</Ui> and turn off <Ui>Notify When Run</Ui>, so it stays silent.
          </StepItem>
          <StepItem n={4}>
            Add the action <Ui>Mula › Log bank message</Ui> and pass it <Ui>Shortcut Input › Content</Ui>.
          </StepItem>
          <StepItem n={5}>
            Optional, for Apple Pay: create a <Ui>Wallet › Transaction</Ui> automation that runs <Ui>Mula › Log card payment</Ui>.
          </StepItem>
        </Section>
      ) : null}

      <CloudSection />
    </Screen>
  );
}
