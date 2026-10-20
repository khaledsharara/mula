import { router } from 'expo-router';
import { View } from 'react-native';

import { SUPPORTED_BANK_NAMES } from '../../banks';
import { useAccounts, useBalances } from '../../accounts/data/accountsRepo';
import { BrandMark } from '../../shared/components/BrandMark';
import { Button } from '../../shared/components/Button';
import { Chip } from '../../shared/components/Chip';
import { ListRow, Section } from '../../shared/components/List';
import { IconTile } from '../../shared/components/Misc';
import { Money } from '../../shared/components/Money';
import { Text } from '../../shared/components/Text';
import { Screen } from '../../shared/layouts/Screen';
import { setSetting } from '../../shared/settings/settingsStore';

export default function OnboardingPage() {
  const { data: accounts } = useAccounts();
  const { data: balances } = useBalances();
  const count = accounts?.length ?? 0;

  const finish = async () => {
    await setSetting('onboarded', true);
    router.replace('/');
  };

  return (
    <Screen
      testID="onboarding"
      footer={<Button label={count ? 'Start using Mula' : 'Add an account to continue'} size="lg" full disabled={!count} onPress={finish} testID="onboarding-finish" />}
    >
      <View className="px-5 pt-8">
        <BrandMark size={56} />
        <Text variant="hero" weight="light" accessibilityRole="header" className="mt-5">
          Mula
        </Text>
        <Text variant="title" weight="regular" className="mt-3">
          Your money, written down as it happens.
        </Text>
        <Text variant="body" tone="graphite" className="mt-3">
          Add the accounts you pay from. Bank messages from {SUPPORTED_BANK_NAMES} land in an inbox, already filled in. You just confirm.
        </Text>
      </View>

      <Section title="Your accounts">
        {accounts?.map((a, i) => (
          <ListRow
            key={a.id}
            title={a.name}
            subtitle={a.identifiers.length ? `${a.currency}, ending ${a.identifiers.join(', ')}` : a.currency}
            left={<IconTile icon={a.icon} color={a.color} size={38} />}
            right={<Money minor={balances?.[a.id] ?? 0} size="sm" />}
            onPress={() => router.push({ pathname: '/accounts/edit', params: { id: a.id } })}
            divider={i < count - 1}
          />
        ))}
        {!count ? (
          <Text variant="label" weight="regular" tone="mist" className="px-5 pb-2">
            None yet. Start with the ones below; you can add more any time.
          </Text>
        ) : null}
        <View className="mt-3 flex-row flex-wrap gap-2 px-5">
          <Chip label="Bank account" icon="landmark" onPress={() => router.push({ pathname: '/accounts/edit', params: { preset: 'bank' } })} testID="preset-bank" />
          <Chip label="Cash" icon="banknote" onPress={() => router.push({ pathname: '/accounts/edit', params: { preset: 'cash' } })} testID="preset-cash" />
          <Chip label="Dollar account" icon="coins" onPress={() => router.push({ pathname: '/accounts/edit', params: { preset: 'usd' } })} testID="preset-usd" />
          <Chip label="Other" icon="plus" onPress={() => router.push('/accounts/edit')} testID="preset-other" />
        </View>
      </Section>

      {!count ? (
        <Section title="Already use Mula?" footer="Brings back your data from the cloud copy Claude uses, on a new phone or after reinstalling.">
          <ListRow title="Connect your cloud copy" chevron onPress={() => router.push('/integrations')} testID="onboarding-cloud" />
        </Section>
      ) : null}
    </Screen>
  );
}
