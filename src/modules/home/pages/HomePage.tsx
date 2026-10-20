import { router } from 'expo-router';
import { useMemo } from 'react';
import { View } from 'react-native';
import { endOfMonth, getDate, getDaysInMonth, startOfMonth, subMonths } from 'date-fns';

import { useReconciliations } from '../../accounts/data/accountsRepo';
import { useNetWorth } from '../../accounts/data/useNetWorth';
import { usePendingSummary } from '../../inbox/data/inboxRepo';
import { useStats } from '../../insights/data/insightsData';
import { dailySpend, natureSplit, totals } from '../../insights/utils/aggregations';
import { RecurringAmount } from '../../recurring/components/RecurringRows';
import { useUpcoming } from '../../recurring/data/recurringRepo';
import { TransactionRow } from '../../transactions/components/TransactionRow';
import { useTransactions } from '../../transactions/data/transactionsRepo';
import { useLookups } from '../../transactions/data/useLookups';
import { Icon } from '../../shared/components/Icon';
import { ListRow, Section } from '../../shared/components/List';
import { EmptyState, IconTile } from '../../shared/components/Misc';
import { Money } from '../../shared/components/Money';
import { Press } from '../../shared/components/Press';
import { Text } from '../../shared/components/Text';
import { Screen } from '../../shared/layouts/Screen';
import { useSettings } from '../../shared/settings/settingsStore';
import { ageLabel, dayLabel, monthLabel, timeLabel } from '../../shared/utils/dates';
import { formatMoney } from '../../shared/utils/money';
import { plural } from '../../shared/utils/text';
import { HomeDebts } from '../components/HomeDebts';
import { MonthLedger } from '../components/MonthLedger';
import { NatureBar } from '../components/NatureBar';

export default function HomePage() {
  const base = useSettings((s) => s.baseCurrency);
  // Rounded to the minute so query inputs stay stable between renders.
  const now = Math.floor(Date.now() / 60_000) * 60_000;
  const monthStart = startOfMonth(now).getTime();
  const monthEnd = endOfMonth(now).getTime();
  // Same span of last month, for a fair "by this day" comparison.
  const prevStart = startOfMonth(subMonths(now, 1)).getTime();
  const prevSameDay = Math.min(endOfMonth(prevStart).getTime(), prevStart + (now - monthStart));

  const { data: month } = useStats(monthStart, monthEnd);
  const { data: prev } = useStats(prevStart, prevSameDay);
  const { data: pending } = usePendingSummary();
  const { data: upcoming } = useUpcoming(10);
  const { data: recent } = useTransactions({ limit: 8 }, []);
  const lookups = useLookups();
  const worth = useNetWorth();

  const stats = useMemo(() => {
    if (!month) return null;
    const t = totals(month.txs, month.ctx);
    const days = dailySpend(month.txs, month.ctx, monthStart, monthEnd).map((p) => p.amount);
    while (days.length < getDaysInMonth(now)) days.push(0);
    return { t, split: natureSplit(month.txs, month.ctx), days };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  const prevSpent = prev ? totals(prev.txs, prev.ctx).spent : null;
  const change = stats && prevSpent ? Math.round(((stats.t.spent - prevSpent) / prevSpent) * 100) : null;

  const { data: recon } = useReconciliations();
  const gaps = (recon ?? [])
    .filter((r) => Math.abs(r.gap) >= 100)
    .map((r) => ({ ...r, account: worth.accounts.find((a) => a.id === r.accountId) }))
    .filter((g): g is typeof g & { account: NonNullable<typeof g.account> } => Boolean(g.account));

  const hasAnything = (recent?.length ?? 0) > 0 || (pending?.count ?? 0) > 0;

  return (
    <Screen tabBar testID="home">
      {/* Month hero */}
      <View className="px-5 pt-6">
        <View className="flex-row items-center justify-between">
          <Text variant="label" tone="graphite">
            {monthLabel(now)}
          </Text>
          <Text variant="label" tone="mist">
            {base}
          </Text>
        </View>
        <View className="mt-1" testID="home-spent">
          <Money minor={stats?.t.spent ?? 0} size="hero" sign="never" />
        </View>
        <Text variant="label" weight="regular" tone="graphite" className="mt-1">
          {spentLine(stats?.t.spent ?? 0, change, prevSpent)}
        </Text>
        <View className="mt-5">
          <MonthLedger days={stats?.days ?? []} today={getDate(now) - 1} />
        </View>
        {stats && stats.split.need + stats.split.want + stats.split.saving > 0 ? (
          <View className="mt-5">
            <NatureBar split={stats.split} />
          </View>
        ) : null}
      </View>

      {/* Accountability */}
      {pending?.count ? (
        <Press onPress={() => router.push('/review')} testID="home-review" dim={0.7} className="mx-5 mt-7 flex-row items-center rounded-field bg-accent-soft px-4 py-3.5">
          <View className="mr-3 h-2.5 w-2.5 rounded-full bg-accent" />
          <View className="flex-1">
            <Text variant="body" weight="semibold">
              {plural(pending.count, 'payment')} to review
            </Text>
            {pending.oldest ? (
              <Text variant="caption" tone="graphite" className="mt-0.5">
                Oldest waiting {ageLabel(pending.oldest)}
              </Text>
            ) : null}
          </View>
          <Icon name="chevron-right" size={18} tone="accent" />
        </Press>
      ) : null}

      {gaps.map(({ account, gap, bank, mula, at }) => (
        <Press
          key={account.id}
          onPress={() => router.push({ pathname: '/accounts/[id]', params: { id: account.id } })}
          className="mx-5 mt-3 rounded-field bg-alert-soft px-4 py-3"
          dim={0.7}
          testID={`home-gap-${account.name}`}
        >
          <Text variant="label" tone="alert">
            {account.name} doesn’t match your bank
          </Text>
          <Text variant="caption" tone="graphite" className="mt-0.5" tabular>
            {dayLabel(at)} at {timeLabel(at)} your bank said {formatMoney(bank, { currency: account.currency })}; Mula had {formatMoney(mula, { currency: account.currency })}.{' '}
            {gap > 0 ? `${formatMoney(gap)} left the account without a record.` : `${formatMoney(-gap)} arrived without a record.`}
          </Text>
        </Press>
      ))}

      {/* Accounts */}
      <Section title="Accounts" action={{ label: 'All accounts', onPress: () => router.push('/accounts') }}>
        {worth.accounts.map((a, i) => (
          <ListRow
            key={a.id}
            testID={`home-account-${a.name}`}
            title={a.name}
            subtitle={a.currency !== base && worth.inBase[a.id] != null ? `≈ ${formatMoney(worth.inBase[a.id]!, { currency: base })}` : null}
            left={<IconTile icon={a.icon} color={a.color} size={36} />}
            right={<Money minor={worth.balances[a.id] ?? 0} currency={a.currency} showCurrency={a.currency !== base} />}
            divider={i < worth.accounts.length - 1}
            onPress={() => router.push({ pathname: '/accounts/[id]', params: { id: a.id } })}
          />
        ))}
        {worth.accounts.length > 1 && worth.total != null ? (
          <View className="flex-row items-baseline justify-between px-5 pt-3">
            <Text variant="label" tone="graphite">
              Everything together
            </Text>
            <Money minor={worth.total} currency={base} showCurrency size="md" />
          </View>
        ) : null}
      </Section>

      <HomeDebts baseCurrency={base} />

      {/* Coming up */}
      {upcoming?.length ? (
        <Section title="Coming up" action={{ label: 'Planned payments', onPress: () => router.push('/recurring') }}>
          {upcoming.slice(0, 3).map((u, i, arr) => (
            <ListRow
              key={`${u.recurring.id}-${u.date}`}
              title={u.recurring.name}
              subtitle={dayLabel(u.date)}
              left={<IconTile icon="repeat" muted size={36} />}
              right={
                u.recurring.amount ? (
                  <RecurringAmount
                    r={u.recurring}
                    baseCurrency={base}
                    accountCurrency={u.recurring.accountId ? lookups.accounts.get(u.recurring.accountId)?.currency : undefined}
                  />
                ) : null
              }
              divider={i < arr.length - 1}
              onPress={() => router.push({ pathname: '/recurring/[id]', params: { id: u.recurring.id } })}
            />
          ))}
        </Section>
      ) : null}

      {/* Recent */}
      <Section title="Recent" action={recent?.length ? { label: 'All records', onPress: () => router.push('/records') } : undefined}>
        {recent?.length ? (
          recent.map((t, i) => (
            <TransactionRow
              key={t.id}
              tx={t}
              lookups={lookups}
              divider={i < recent.length - 1}
              onPress={() => router.push({ pathname: '/add', params: { id: t.id } })}
            />
          ))
        ) : !hasAnything ? (
          <EmptyState
            icon="plus"
            title="Nothing logged yet"
            body="Add what you spent today, or paste a bank message and Mula fills it in."
            action={{ label: 'Paste a bank message', icon: 'clipboard-paste', onPress: () => router.push({ pathname: '/inbox', params: { paste: '1' } }) }}
          />
        ) : null}
      </Section>
    </Screen>
  );
}

function spentLine(spent: number, change: number | null, prev: number | null): string {
  if (!spent) return 'Nothing spent this month yet';
  if (change == null || !prev) return 'spent this month';
  if (change === 0) return 'spent, about the same as last month by now';
  return change < 0 ? `spent, ${Math.abs(change)}% less than last month by now` : `spent, ${change}% more than last month by now`;
}
