import { router } from 'expo-router';
import { View } from 'react-native';

import { DebtRow } from '../../debts/components/DebtRow';
import { totals as debtTotals, useDebts } from '../../debts/data/debtsRepo';
import { Button } from '../../shared/components/Button';
import { Section } from '../../shared/components/List';
import { Money } from '../../shared/components/Money';
import { Text } from '../../shared/components/Text';

/** Who owes what, right under the accounts, with one-tap ways to record a new debt. */
export function HomeDebts({ baseCurrency }: { baseCurrency: string }) {
  const { data: debts } = useDebts();
  const open = (debts ?? []).filter((d) => d.status === 'open');
  const t = debtTotals(open);
  const owed = t.owedToMe[baseCurrency] ?? 0;
  const owe = t.iOwe[baseCurrency] ?? 0;
  const otherCurrencies = [...new Set([...Object.keys(t.owedToMe), ...Object.keys(t.iOwe)])].filter((c) => c !== baseCurrency);

  const add = (direction: 'lent' | 'borrowed') => router.push({ pathname: '/debts/edit', params: { direction } });

  return (
    <Section title="Debts" action={{ label: 'All debts', onPress: () => router.push('/debts'), testID: 'home-debts-all' }}>
      {open.length ? (
        <View className="flex-row px-5 pb-2" testID="home-debts-totals">
          <View className="flex-1">
            <Text variant="caption" tone="graphite">
              Owed to you
            </Text>
            <Money minor={owed} size="md" colorIncome sign="never" tone={owed ? undefined : 'mist'} />
          </View>
          <View className="flex-1">
            <Text variant="caption" tone="graphite">
              You owe
            </Text>
            <Money minor={owe} size="md" sign="never" tone={owe ? undefined : 'mist'} />
          </View>
        </View>
      ) : (
        <Text variant="label" weight="regular" tone="graphite" className="px-5 pb-2">
          Keep track of money you lend or borrow.
        </Text>
      )}
      {otherCurrencies.length ? (
        <Text variant="caption" tone="mist" className="px-5 pb-1">
          Plus debts in {otherCurrencies.join(', ')}.
        </Text>
      ) : null}
      {open.slice(0, 3).map((d, i, arr) => (
        <DebtRow key={d.id} debt={d} baseCurrency={baseCurrency} divider={i < arr.length - 1} onPress={() => router.push({ pathname: '/debts/[id]', params: { id: d.id } })} />
      ))}
      {open.length > 3 ? (
        <Text variant="caption" tone="graphite" className="px-5 pt-1">
          {open.length - 3} more open
        </Text>
      ) : null}
      <View className="flex-row gap-2.5 px-5 pt-3">
        <View className="flex-1">
          <Button label="I lent money" icon="hand-coins" variant="secondary" full onPress={() => add('lent')} testID="home-debt-lent" />
        </View>
        <View className="flex-1">
          <Button label="I borrowed" icon="handshake" variant="secondary" full onPress={() => add('borrowed')} testID="home-debt-borrowed" />
        </View>
      </View>
    </Section>
  );
}
