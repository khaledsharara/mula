import { router } from 'expo-router';
import { View } from 'react-native';

import { IconButton } from '../../shared/components/Button';
import { Section } from '../../shared/components/List';
import { EmptyState } from '../../shared/components/Misc';
import { Text } from '../../shared/components/Text';
import { Screen } from '../../shared/layouts/Screen';
import { useSettings } from '../../shared/settings/settingsStore';
import { useLookups } from '../../transactions/data/useLookups';
import { SeriesRow, UpcomingRow } from '../components/RecurringRows';
import { useRecurringList, useUpcoming } from '../data/recurringRepo';

const openNew = () => router.push('/recurring/edit');
const openDetail = (id: string) => router.push(`/recurring/${id}`);

export default function RecurringListPage() {
  const baseCurrency = useSettings((s) => s.baseCurrency);
  const { data: series } = useRecurringList();
  const { data: upcoming } = useUpcoming(30);
  const lookups = useLookups();
  const count = series?.length ?? 0;

  return (
    <Screen
      title="Planned payments"
      back
      testID="recurring-list"
      right={<IconButton icon="plus" label="Add a planned payment" onPress={openNew} testID="recurring-add" />}
    >
      {series && !count ? (
        <View>
          <EmptyState
            icon="repeat"
            title="Nothing planned yet"
            body="Add the payments that repeat, like rent, subscriptions or your salary. Mula reminds you before each one and can log it for you."
            action={{ label: 'Add a planned payment', icon: 'plus', onPress: openNew }}
            testID="recurring-empty"
          />
        </View>
      ) : null}

      {count ? (
        <Section title="Coming up">
          {upcoming?.length ? (
            upcoming.map((u, i) => (
              <UpcomingRow
                key={`${u.recurring.id}-${u.date}`}
                r={u.recurring}
                date={u.date}
                category={u.recurring.categoryId ? lookups.categories.get(u.recurring.categoryId) : undefined}
                accountCurrency={u.recurring.accountId ? lookups.accounts.get(u.recurring.accountId)?.currency : undefined}
                baseCurrency={baseCurrency}
                onPress={() => openDetail(u.recurring.id)}
                divider={i < upcoming.length - 1}
              />
            ))
          ) : upcoming ? (
            <Text variant="label" weight="regular" tone="mist" className="px-5 py-2">
              Nothing is due in the next 30 days.
            </Text>
          ) : null}
        </Section>
      ) : null}

      {count ? (
        <Section title="All" footer={series?.some((r) => !r.active) ? 'Paused payments are dimmed. Open one to resume it.' : undefined}>
          {series?.map((r, i) => (
            <SeriesRow
              key={r.id}
              r={r}
              category={r.categoryId ? lookups.categories.get(r.categoryId) : undefined}
              accountCurrency={r.accountId ? lookups.accounts.get(r.accountId)?.currency : undefined}
              baseCurrency={baseCurrency}
              onPress={() => openDetail(r.id)}
              divider={i < count - 1}
            />
          ))}
        </Section>
      ) : null}
    </Screen>
  );
}
