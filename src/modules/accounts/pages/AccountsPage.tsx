import { router } from 'expo-router';
import { View } from 'react-native';

import { IconButton } from '../../shared/components/Button';
import { ListRow, Section } from '../../shared/components/List';
import { EmptyState, IconTile } from '../../shared/components/Misc';
import { Money } from '../../shared/components/Money';
import { Text } from '../../shared/components/Text';
import { Screen } from '../../shared/layouts/Screen';
import { useSettings } from '../../shared/settings/settingsStore';
import { formatMoney } from '../../shared/utils/money';
import { useAccounts } from '../data/accountsRepo';
import { useNetWorth } from '../data/useNetWorth';
import { accountTypeMeta } from '../utils/accountMeta';

export default function AccountsPage() {
  const base = useSettings((s) => s.baseCurrency);
  const worth = useNetWorth();
  const { data: all } = useAccounts(true);
  const archived = (all ?? []).filter((a) => a.archived);

  return (
    <Screen title="Accounts" back testID="accounts" right={<IconButton icon="plus" label="Add account" onPress={() => router.push('/accounts/edit')} testID="accounts-add" />}>
      <View className="px-5 pt-3">
        <Text variant="label" tone="graphite">
          Everything together
        </Text>
        {worth.total != null ? <Money minor={worth.total} size="display" currency={base} showCurrency /> : <Text variant="display">…</Text>}
      </View>

      <Section>
        {worth.accounts.length ? (
          worth.accounts.map((a, i) => (
            <ListRow
              key={a.id}
              testID={`accounts-row-${a.name}`}
              title={a.name}
              subtitle={[accountTypeMeta(a.type).label, a.identifiers.length ? `ending ${a.identifiers.join(', ')}` : null, a.currency !== base && worth.inBase[a.id] != null ? `≈ ${formatMoney(worth.inBase[a.id]!, { currency: base })}` : null].filter(Boolean).join(', ')}
              left={<IconTile icon={a.icon} color={a.color} size={40} />}
              right={<Money minor={worth.balances[a.id] ?? 0} currency={a.currency} showCurrency={a.currency !== base} />}
              chevron
              divider={i < worth.accounts.length - 1}
              onPress={() => router.push({ pathname: '/accounts/[id]', params: { id: a.id } })}
            />
          ))
        ) : (
          <EmptyState icon="wallet" title="No accounts yet" body="Add the bank accounts, cards and cash you pay from." action={{ label: 'Add account', icon: 'plus', onPress: () => router.push('/accounts/edit') }} />
        )}
      </Section>

      {archived.length ? (
        <Section title="Archived">
          {archived.map((a, i) => (
            <ListRow
              key={a.id}
              title={a.name}
              subtitle="Hidden from totals and pickers"
              left={<IconTile icon={a.icon} muted size={40} />}
              chevron
              divider={i < archived.length - 1}
              onPress={() => router.push({ pathname: '/accounts/edit', params: { id: a.id } })}
            />
          ))}
        </Section>
      ) : null}
    </Screen>
  );
}
