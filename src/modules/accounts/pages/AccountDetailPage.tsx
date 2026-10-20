import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { scaleLinear } from 'd3-scale';
import { curveMonotoneX, line } from 'd3-shape';
import { startOfDay, subDays } from 'date-fns';

import { TransactionRow } from '../../transactions/components/TransactionRow';
import { useTransactions } from '../../transactions/data/transactionsRepo';
import { useLookups } from '../../transactions/data/useLookups';
import { Button, IconButton } from '../../shared/components/Button';
import { confirm, toast } from '../../shared/components/Feedback';
import { Section } from '../../shared/components/List';
import { EmptyState } from '../../shared/components/Misc';
import { Money } from '../../shared/components/Money';
import { Text } from '../../shared/components/Text';
import { Screen } from '../../shared/layouts/Screen';
import { ageLabel } from '../../shared/utils/dates';
import { formatMoney } from '../../shared/utils/money';
import { saveAccount, useAccount, useBalances, useReconciliations } from '../data/accountsRepo';
import { accountTypeMeta } from '../utils/accountMeta';

const DAYS = 60;

export default function AccountDetailPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: account } = useAccount(id);
  const { data: balances } = useBalances();
  const from = startOfDay(subDays(Date.now(), DAYS - 1)).getTime();
  const { data: recent } = useTransactions({ accountId: id, limit: 400, from }, [id, from]);
  const lookups = useLookups();
  const { data: recon } = useReconciliations();
  const [width, setWidth] = useState(0);

  const balance = id ? (balances?.[id] ?? 0) : 0;

  // Walk back from today's balance to draw the last 60 days.
  const series = useMemo(() => {
    if (!recent || !id) return [];
    const deltaByDay = new Map<number, number>();
    for (const t of recent) {
      const d = startOfDay(t.date).getTime();
      let delta = 0;
      if (t.type === 'income') delta = t.amount;
      else if (t.type === 'expense') delta = -(t.amount + t.feeTotal);
      else if (t.type === 'transfer') delta = t.accountId === id ? -(t.amount + t.feeTotal) : (t.toAmount ?? t.amount);
      deltaByDay.set(d, (deltaByDay.get(d) ?? 0) + delta);
    }
    const out: number[] = [];
    let running = balance;
    for (let i = 0; i < DAYS; i++) {
      const day = startOfDay(subDays(Date.now(), i)).getTime();
      out.unshift(running);
      running -= deltaByDay.get(day) ?? 0;
    }
    return out;
  }, [recent, id, balance]);

  if (!account) return <Screen back title="Account" />;

  const r = recon?.find((x) => x.accountId === account.id) ?? null;
  const gap = r?.gap ?? 0;
  const hasGap = Boolean(r) && Math.abs(gap) >= 100;

  const markMatched = async () => {
    const ok = await confirm({
      title: 'Match the bank balance?',
      message: `Mula adjusts this account’s starting balance by ${formatMoney(-gap, { sign: 'always' })} so it agrees with your bank. No record is added.`,
      confirmLabel: 'Match the bank',
    });
    if (!ok) return;
    await saveAccount({ ...account, initialBalance: account.initialBalance - gap });
    toast('Balance matched');
  };

  const h = 90;
  const min = Math.min(...series);
  const max = Math.max(...series);
  const x = scaleLinear().domain([0, DAYS - 1]).range([0, width]);
  const y = scaleLinear().domain([min, max === min ? min + 1 : max]).range([h - 4, 4]);
  const path = series.length > 1 ? line<number>().x((_, i) => x(i)).y((v) => y(v)).curve(curveMonotoneX)(series) : null;

  return (
    <Screen
      back
      title={account.name}
      testID="account-detail"
      right={<IconButton icon="pencil" label="Edit account" onPress={() => router.push({ pathname: '/accounts/edit', params: { id: account.id } })} testID="account-edit" />}
    >
      <View className="px-5 pt-3">
        <Text variant="label" tone="graphite">
          {accountTypeMeta(account.type).label}
          {account.identifiers.length ? `, ending ${account.identifiers.join(', ')}` : ''}
        </Text>
        <Money minor={balance} size="hero" currency={account.currency} showCurrency />
        <View className="mt-4" onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)} style={{ height: h }}>
          {width > 0 && path ? (
            <Svg width={width} height={h}>
              <Path d={path} stroke={account.color} strokeWidth={2} fill="none" strokeLinecap="round" />
            </Svg>
          ) : null}
        </View>
        <Text variant="caption" tone="mist" className="mt-1">
          Balance over the last {DAYS} days
        </Text>
      </View>

      {r ? (
        <Section title="Compared with your bank">
          <View className={`mx-5 rounded-field px-4 py-3.5 ${hasGap ? 'bg-alert-soft' : 'bg-sunk'}`} testID="account-reconcile">
            <View className="flex-row justify-between">
              <Text variant="label" weight="regular" tone="graphite">
                Bank said, {ageLabel(r.at)} ago
              </Text>
              <Money minor={r.bank} size="sm" />
            </View>
            <View className="mt-1 flex-row justify-between">
              <Text variant="label" weight="regular" tone="graphite">
                Mula at that moment
              </Text>
              <Money minor={r.mula} size="sm" />
            </View>
            <Text variant="label" tone={hasGap ? 'alert' : 'income'} className="mt-2">
              {!hasGap
                ? 'They match.'
                : gap > 0
                  ? `${formatMoney(gap)} left the account without a record.`
                  : `${formatMoney(-gap)} arrived without a record.`}
            </Text>
            {hasGap ? (
              <View className="mt-3 flex-row flex-wrap gap-2">
                <Button
                  label="Log the difference"
                  size="sm"
                  onPress={() => router.push({ pathname: '/add', params: { accountId: account.id, amount: String(Math.abs(gap)), mode: gap > 0 ? 'expense' : 'income' } })}
                  testID="reconcile-log"
                />
                <Button label="Match the bank" size="sm" variant="secondary" onPress={markMatched} testID="reconcile-match" />
              </View>
            ) : null}
          </View>
        </Section>
      ) : null}

      <Section title="Recent records" action={{ label: 'All records', onPress: () => router.push('/records') }}>
        {recent?.length ? (
          recent.slice(0, 25).map((t, i, arr) => (
            <TransactionRow key={t.id} tx={t} lookups={lookups} showAccount={false} divider={i < arr.length - 1} onPress={() => router.push({ pathname: '/add', params: { id: t.id } })} />
          ))
        ) : (
          <EmptyState icon="layers" title="No records in the last 60 days" action={{ label: 'Add a record', icon: 'plus', onPress: () => router.push({ pathname: '/add', params: { accountId: account.id } }) }} />
        )}
      </Section>
    </Screen>
  );
}
