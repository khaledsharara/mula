import { addMonths, endOfMonth, isSameMonth, startOfDay, startOfMonth } from 'date-fns';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, SectionList, TextInput, View } from 'react-native';

import { useAccounts } from '../../accounts/data/accountsRepo';
import { IconButton } from '../../shared/components/Button';
import { Chip } from '../../shared/components/Chip';
import { Icon } from '../../shared/components/Icon';
import { EmptyState } from '../../shared/components/Misc';
import { Money } from '../../shared/components/Money';
import { Text } from '../../shared/components/Text';
import type { ID } from '../../shared/db/types';
import { Screen, TAB_BAR_SPACE } from '../../shared/layouts/Screen';
import { useTheme } from '../../shared/theme/ThemeProvider';
import { dayLabel, monthYearLabel } from '../../shared/utils/dates';
import { TransactionRow } from '../components/TransactionRow';
import { useTransactions } from '../data/transactionsRepo';
import { useLookups } from '../data/useLookups';
import type { TxListItem } from '../types';
import { noOutline } from '../../shared/utils/styles';

type DaySection = { key: string; title: string; total: number; data: TxListItem[] };

export default function RecordsPage() {
  const { c } = useTheme();
  const [month, setMonth] = useState(() => startOfMonth(Date.now()).getTime());
  const [accountId, setAccountId] = useState<ID | null>(null);
  const [query, setQuery] = useState('');
  const { data: accounts } = useAccounts();
  const lookups = useLookups();

  const searching = query.trim().length > 1;
  const from = searching ? null : month;
  const to = searching ? null : endOfMonth(month).getTime();
  const { data: txs, loading } = useTransactions({ accountId, from, to, search: searching ? query : null, limit: 2000 }, [accountId, from, to, searching ? query : '']);

  const { sections, spent, earned } = useMemo(() => {
    const byDay = new Map<number, DaySection>();
    let spentSum = 0;
    let earnedSum = 0;
    for (const t of txs ?? []) {
      const key = startOfDay(t.date).getTime();
      const s = byDay.get(key) ?? { key: String(key), title: dayLabel(t.date), total: 0, data: [] };
      s.data.push(t);
      if (!t.debtId) {
        if (t.type === 'expense') {
          s.total -= t.baseAmount + t.feeTotal;
          spentSum += t.baseAmount + t.feeTotal;
        } else if (t.type === 'income') {
          s.total += t.baseAmount;
          earnedSum += t.baseAmount;
        }
      }
      byDay.set(key, s);
    }
    return { sections: [...byDay.values()], spent: spentSum, earned: earnedSum };
  }, [txs]);

  const isCurrentMonth = isSameMonth(month, Date.now());

  return (
    <Screen title="Records" large tabBar scroll={false} testID="records" right={<IconButton icon="plus" label="Add a record" onPress={() => router.push('/add')} testID="records-add" />}>
      <View className="mx-5 mb-2 mt-1 h-11 flex-row items-center rounded-field bg-sunk px-3.5">
        <Icon name="search" size={17} tone="mist" />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search records"
          placeholderTextColor={c.mist}
          selectionColor={c.accent}
          className="ml-2 flex-1 font-regular text-body text-ink"
          style={noOutline}
          testID="records-search"
          autoCorrect={false}
        />
        {query ? <IconButton icon="x" label="Clear search" size={28} onPress={() => setQuery('')} /> : null}
      </View>

      {(accounts?.length ?? 0) > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, flexShrink: 0, height: 44 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 8, alignItems: 'center' }}>
          <Chip label="All accounts" selected={!accountId} onPress={() => setAccountId(null)} testID="records-account-all" />
          {accounts?.map((a) => (
            <Chip key={a.id} label={a.name} dot={a.color} selected={accountId === a.id} onPress={() => setAccountId(a.id)} testID={`records-account-${a.name}`} />
          ))}
        </ScrollView>
      ) : null}

      {!searching ? (
        <View className="flex-row items-center justify-between px-3 pt-2">
          <IconButton icon="chevron-left" label="Previous month" onPress={() => setMonth(addMonths(month, -1).getTime())} testID="records-prev" />
          <View className="items-center">
            <Text variant="body" weight="semibold">
              {monthYearLabel(month)}
            </Text>
            <View className="mt-0.5 flex-row items-baseline gap-3">
              <View className="flex-row items-baseline">
                <Text variant="caption" tone="graphite" className="mr-1">
                  Out
                </Text>
                <Money minor={-spent} size="sm" />
              </View>
              <View className="flex-row items-baseline">
                <Text variant="caption" tone="graphite" className="mr-1">
                  In
                </Text>
                <Money minor={earned} size="sm" colorIncome />
              </View>
            </View>
          </View>
          <IconButton icon="chevron-right" label="Next month" onPress={() => setMonth(addMonths(month, 1).getTime())} testID="records-next" />
        </View>
      ) : (
        <Text variant="label" tone="graphite" className="px-5 pt-2">
          {txs?.length ?? 0} results across all months
        </Text>
      )}

      <SectionList
        sections={sections}
        keyExtractor={(t) => t.id}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={{ paddingBottom: TAB_BAR_SPACE }}
        showsVerticalScrollIndicator={false}
        renderSectionHeader={({ section }) => (
          <View className="flex-row items-end justify-between px-5 pb-1 pt-6">
            <Text variant="label" tone="graphite">
              {section.title}
            </Text>
            {section.total ? <Money minor={section.total} size="sm" tone="graphite" sign="always" /> : null}
          </View>
        )}
        renderItem={({ item, index, section }) => (
          <TransactionRow
            tx={item}
            lookups={lookups}
            showAccount={!accountId}
            divider={index < section.data.length - 1}
            onPress={() => router.push({ pathname: '/add', params: { id: item.id } })}
          />
        )}
        ListEmptyComponent={
          loading ? undefined : (
            <EmptyState
              icon="layers"
              title={searching ? 'No matches' : isCurrentMonth ? 'No records this month' : `Nothing in ${monthYearLabel(month)}`}
              body={searching ? 'Try a payee, a category or an amount like 250.' : 'Records you add or confirm from bank messages show up here, grouped by day.'}
              action={searching ? undefined : { label: 'Add a record', icon: 'plus', onPress: () => router.push('/add') }}
            />
          )
        }
      />
    </Screen>
  );
}
