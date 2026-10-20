import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { IconButton } from '../../shared/components/Button';
import { EmptyState } from '../../shared/components/Misc';
import { Money } from '../../shared/components/Money';
import { SegmentedControl } from '../../shared/components/SegmentedControl';
import { Text } from '../../shared/components/Text';
import type { DebtStatus, Minor } from '../../shared/db/types';
import { Screen } from '../../shared/layouts/Screen';
import { useSettings } from '../../shared/settings/settingsStore';
import { DebtRow } from '../components/DebtRow';
import { totals, useDebts } from '../data/debtsRepo';
import { sortedCurrencies } from '../utils/labels';

const TABS: { value: DebtStatus; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'closed', label: 'Settled' },
];

const openNew = () => router.push('/debts/edit');

function TotalBlock({ label, bucket, base, income, testID }: { label: string; bucket: Record<string, Minor>; base: string; income?: boolean; testID: string }) {
  const currencies = sortedCurrencies(bucket, base);
  return (
    <View className="flex-1" testID={testID}>
      <Text variant="label" tone="graphite" className="mb-1">
        {label}
      </Text>
      {currencies.length ? (
        currencies.map((cur) => (
          <Money key={cur} minor={bucket[cur]} currency={cur} showCurrency={cur !== base} size="lg" colorIncome={income} />
        ))
      ) : (
        <Money minor={0} currency={base} size="lg" tone="mist" />
      )}
    </View>
  );
}

export default function DebtsPage() {
  const baseCurrency = useSettings((s) => s.baseCurrency);
  const { data: debts } = useDebts();
  const [tab, setTab] = useState<DebtStatus>('open');

  const sums = useMemo(() => totals(debts ?? []), [debts]);
  const shown = useMemo(() => {
    const list = (debts ?? []).filter((d) => d.status === tab);
    // Settled: most recently settled first. Open keeps the repo order (soonest due first).
    return tab === 'closed' ? [...list].sort((a, b) => (b.closedAt ?? b.date) - (a.closedAt ?? a.date)) : list;
  }, [debts, tab]);
  const hasAny = Boolean(debts?.length);

  return (
    <Screen
      title="Debts"
      back
      testID="debts-list"
      right={<IconButton icon="plus" label="Add a debt" onPress={openNew} testID="debts-add" />}
    >
      {hasAny ? (
        <>
          <View className="mx-5 mt-2 flex-row">
            <TotalBlock label="Owed to you" bucket={sums.owedToMe} base={baseCurrency} income testID="debts-owed-to-you" />
            <View className="mx-4 w-px bg-hairline" />
            <TotalBlock label="You owe" bucket={sums.iOwe} base={baseCurrency} testID="debts-you-owe" />
          </View>

          <View className="mt-6 px-5 pb-2">
            <SegmentedControl testID="debts-tab" options={TABS} value={tab} onChange={setTab} />
          </View>
        </>
      ) : null}

      {shown.length ? (
        <View className="mt-1">
          {shown.map((d, i) => (
            <DebtRow key={d.id} debt={d} baseCurrency={baseCurrency} onPress={() => router.push(`/debts/${d.id}`)} divider={i < shown.length - 1} />
          ))}
        </View>
      ) : debts && tab === 'open' ? (
        <View>
          <EmptyState
            icon="handshake"
            title={hasAny ? 'Nothing open right now' : 'No debts yet'}
            body="Write down money you lend or borrow. Mula keeps track of what’s still owed and who’s late."
            action={{ label: 'Add a debt', icon: 'plus', onPress: openNew }}
            testID="debts-empty"
          />
        </View>
      ) : debts ? (
        <EmptyState icon="circle-check" title="Nothing settled yet" body="Debts move here once they’re fully repaid or you mark them as settled." />
      ) : null}
    </Screen>
  );
}
