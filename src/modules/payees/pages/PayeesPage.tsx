import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { useCategoryMap } from '../../categories/data/categoriesRepo';
import { IconButton } from '../../shared/components/Button';
import { TextField } from '../../shared/components/Fields';
import { Icon } from '../../shared/components/Icon';
import { ListRow } from '../../shared/components/List';
import { EmptyState } from '../../shared/components/Misc';
import { SegmentedControl } from '../../shared/components/SegmentedControl';
import type { PayeeKind } from '../../shared/db/types';
import { Screen } from '../../shared/layouts/Screen';
import { matches } from '../../shared/utils/text';
import { PayeeAvatar } from '../components/PayeeAvatar';
import { usePayees } from '../data/payeesRepo';

type Filter = 'all' | PayeeKind;

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'person', label: 'People' },
  { value: 'merchant', label: 'Places' },
];

export default function PayeesPage() {
  const { data: payees } = usePayees();
  const categories = useCategoryMap();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const q = query.trim();

  const list = useMemo(
    () => (payees ?? []).filter((p) => (filter === 'all' || p.kind === filter) && (!q || matches(p.name, q))),
    [payees, filter, q],
  );

  const empty = (() => {
    if (!payees || list.length) return null;
    if (!payees.length) {
      return (
        <EmptyState
          icon="users"
          title="No payees yet"
          body="People and places show up here as you log records or confirm bank messages."
          action={{ label: 'Add a record', icon: 'plus', onPress: () => router.push('/add') }}
        />
      );
    }
    if (q) {
      const noun = filter === 'person' ? 'person' : filter === 'merchant' ? 'place' : 'one';
      return <EmptyState icon="search" title="No matches" body={`No ${noun} called “${q}”. Check the spelling or try part of the name.`} />;
    }
    return filter === 'person' ? (
      <EmptyState icon="user" title="No people yet" body="People you send money to or get paid by show up here." />
    ) : (
      <EmptyState icon="store" title="No places yet" body="Shops and services you pay show up here." />
    );
  })();

  return (
    <Screen title="Payees and names" back testID="payees">
      <TextField
        value={query}
        onChangeText={setQuery}
        placeholder="Search names"
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        accessibilityLabel="Search payees"
        testID="payees-search"
        right={
          q ? (
            <IconButton icon="x" label="Clear search" size={28} tone="graphite" onPress={() => setQuery('')} testID="payees-search-clear" />
          ) : (
            <Icon name="search" size={17} tone="mist" />
          )
        }
      />
      <View className="px-5 pb-1 pt-2">
        <SegmentedControl testID="payees-filter" options={FILTERS} value={filter} onChange={setFilter} />
      </View>

      {empty ? (
        <View testID="payees-empty">{empty}</View>
      ) : (
        <View className="mt-3">
          {list.map((p, i) => {
            const category = p.defaultCategoryId ? categories.get(p.defaultCategoryId) : undefined;
            return (
              <ListRow
                key={p.id}
                testID={`payee-row-${p.id}`}
                title={p.name}
                subtitle={category?.name ?? null}
                left={<PayeeAvatar payee={p} />}
                onPress={() => router.push({ pathname: '/payees/[id]', params: { id: p.id } })}
                divider={i < list.length - 1}
              />
            );
          })}
        </View>
      )}
    </Screen>
  );
}
