import { addMonths, addYears, differenceInCalendarDays, endOfMonth, endOfYear, startOfMonth, startOfYear, subMonths } from 'date-fns';
import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { useAccounts } from '../../accounts/data/accountsRepo';
import { usePayees } from '../../payees/data/payeesRepo';
import { IconButton } from '../../shared/components/Button';
import { Chip } from '../../shared/components/Chip';
import { Section } from '../../shared/components/List';
import { EmptyState } from '../../shared/components/Misc';
import { Money } from '../../shared/components/Money';
import { SegmentedControl } from '../../shared/components/SegmentedControl';
import { Text } from '../../shared/components/Text';
import type { ID } from '../../shared/db/types';
import { Screen } from '../../shared/layouts/Screen';
import { useSettings } from '../../shared/settings/settingsStore';
import { useTheme } from '../../shared/theme/ThemeProvider';
import { monthYearLabel } from '../../shared/utils/dates';
import { formatMoney } from '../../shared/utils/money';
import { BarList, CalendarHeat, CumulativeChart, IncomeSpendBars, NatureColumns, WeekGrid, type BarItem } from '../components/Charts';
import { useStats } from '../data/insightsData';
import { byCategory, cumulative, dailySpend, feesPaid, monthly, natureSplit, topPayees, totals, weekHourGrid } from '../utils/aggregations';

type Range = 'month' | 'quarter' | 'year';

function periodFor(range: Range, anchor: number) {
  if (range === 'month') {
    const from = startOfMonth(anchor).getTime();
    const prevFrom = startOfMonth(subMonths(anchor, 1)).getTime();
    return { from, to: endOfMonth(anchor).getTime(), prevFrom, prevTo: endOfMonth(prevFrom).getTime(), label: monthYearLabel(anchor), prevLabel: 'Last month' };
  }
  if (range === 'quarter') {
    const from = startOfMonth(subMonths(anchor, 2)).getTime();
    const prevFrom = startOfMonth(subMonths(anchor, 5)).getTime();
    return { from, to: endOfMonth(anchor).getTime(), prevFrom, prevTo: endOfMonth(subMonths(anchor, 3)).getTime(), label: 'Last 3 months', prevLabel: 'The 3 months before' };
  }
  const from = startOfYear(anchor).getTime();
  const prevFrom = startOfYear(addYears(anchor, -1)).getTime();
  return { from, to: endOfYear(anchor).getTime(), prevFrom, prevTo: endOfYear(prevFrom).getTime(), label: String(new Date(anchor).getFullYear()), prevLabel: 'Last year' };
}

export default function InsightsPage() {
  const { nature } = useTheme();
  const base = useSettings((s) => s.baseCurrency);
  const [range, setRange] = useState<Range>('month');
  const [anchor, setAnchor] = useState(() => startOfMonth(Date.now()).getTime());
  const [accountId, setAccountId] = useState<ID | null>(null);
  const [drill, setDrill] = useState<ID | null>(null);
  const { data: accounts } = useAccounts();
  const { data: payees } = usePayees();

  const p = periodFor(range, anchor);
  const historyFrom = startOfMonth(subMonths(anchor, 5)).getTime();
  const { data: cur } = useStats(p.from, p.to, accountId);
  const { data: prev } = useStats(p.prevFrom, p.prevTo, accountId);
  const { data: hist } = useStats(historyFrom, endOfMonth(anchor).getTime(), accountId);

  const view = useMemo(() => {
    if (!cur || !prev) return null;
    const now = Date.now();
    const end = Math.min(p.to, now);
    const days = differenceInCalendarDays(p.to, p.from) + 1;
    const curDaily = end >= p.from ? dailySpend(cur.txs, cur.ctx, p.from, end) : [];
    const prevDaily = dailySpend(prev.txs, prev.ctx, p.prevFrom, p.prevTo);
    const t = totals(cur.txs, cur.ctx);
    const pt = totals(prev.txs, prev.ctx);
    const cats = byCategory(cur.txs, cur.ctx, drill);
    return {
      t,
      pt,
      days,
      current: cumulative(curDaily).map((d) => d.amount),
      previous: cumulative(prevDaily).map((d) => d.amount).slice(0, days),
      split: natureSplit(cur.txs, cur.ctx),
      cats,
      calendar: range === 'month' ? dailySpend(cur.txs, cur.ctx, p.from, p.to).map((d) => ({ day: d.day, amount: d.amount })) : [],
      grid: weekHourGrid(cur.txs, cur.ctx),
      payees: topPayees(cur.txs, cur.ctx, 6),
      fees: feesPaid(cur.txs, cur.ctx),
    };
  }, [cur, prev, p.from, p.to, p.prevFrom, p.prevTo, drill, range]);

  const months = useMemo(() => (hist ? monthly(hist.txs, hist.ctx, 6, anchor) : []), [hist, anchor]);

  // Calendar needs every day of the month, even future ones (shown empty).
  const calendarDays = useMemo(() => {
    if (range !== 'month' || !view) return [];
    const byDay = new Map(view.calendar.map((d) => [new Date(d.day).getDate(), d.amount]));
    const n = new Date(p.to).getDate();
    return Array.from({ length: n }, (_, i) => ({ day: new Date(new Date(p.from).getFullYear(), new Date(p.from).getMonth(), i + 1).getTime(), amount: byDay.get(i + 1) ?? 0 }));
  }, [view, range, p.from, p.to]);

  const change = view && view.pt.spent ? Math.round(((view.t.spent - view.pt.spent) / view.pt.spent) * 100) : null;
  const splitTotal = view ? view.split.need + view.split.want + view.split.saving : 0;
  const share = (v: number) => (splitTotal ? Math.round((v / splitTotal) * 100) : 0);
  const payeeName = new Map((payees ?? []).map((x) => [x.id, x.name]));
  const drillCat = drill && cur ? cur.ctx.categories.get(drill) : null;
  const canGoForward = anchor < startOfMonth(Date.now()).getTime();
  const empty = view && !view.t.count;

  const step = (dir: 1 | -1) => setAnchor((a) => (range === 'year' ? addYears(a, dir) : addMonths(a, range === 'quarter' ? dir * 3 : dir)).getTime());

  return (
    <Screen title="Insights" large tabBar testID="insights">
      <View className="px-5">
        <SegmentedControl
          testID="insights-range"
          options={[
            { value: 'month', label: 'Month' },
            { value: 'quarter', label: '3 months' },
            { value: 'year', label: 'Year' },
          ]}
          value={range}
          onChange={(r) => {
            setRange(r);
            setDrill(null);
          }}
        />
      </View>
      <View className="flex-row items-center justify-between px-3 pt-2">
        <IconButton icon="chevron-left" label="Earlier" onPress={() => step(-1)} testID="insights-prev" />
        <Text variant="body" weight="semibold">
          {p.label}
        </Text>
        <IconButton icon="chevron-right" label="Later" onPress={() => canGoForward && step(1)} tone={canGoForward ? 'ink' : 'mist'} testID="insights-next" />
      </View>
      {(accounts?.length ?? 0) > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 8, paddingTop: 4 }}>
          <Chip label="All accounts" selected={!accountId} onPress={() => setAccountId(null)} />
          {accounts?.map((a) => (
            <Chip key={a.id} label={a.name} dot={a.color} selected={accountId === a.id} onPress={() => setAccountId(a.id)} />
          ))}
        </ScrollView>
      ) : null}

      {!view ? null : empty ? (
        <EmptyState icon="chart-column-big" title="No records in this period" body="Once you log spending, this page shows how it adds up, where it goes and when." />
      ) : (
        <>
          {/* Headline */}
          <View className="px-5 pt-6">
            <Text variant="label" tone="graphite">
              Spent
            </Text>
            <Money minor={view.t.spent} size="display" sign="never" />
            <Text variant="label" weight="regular" tone="graphite" className="mt-1">
              {change == null ? `${p.prevLabel} had nothing to compare` : change === 0 ? `Same as ${p.prevLabel.toLowerCase()}` : `${Math.abs(change)}% ${change < 0 ? 'less' : 'more'} than ${p.prevLabel.toLowerCase()}`}
            </Text>
            <View className="mt-4 flex-row">
              <View className="flex-1">
                <Text variant="caption" tone="graphite">
                  Earned
                </Text>
                <Money minor={view.t.earned} size="md" colorIncome sign="never" />
              </View>
              <View className="flex-1">
                <Text variant="caption" tone="graphite">
                  {view.t.net >= 0 ? 'Kept' : 'Overspent'}
                </Text>
                <Money minor={Math.abs(view.t.net)} size="md" sign="never" />
              </View>
              <View className="flex-1">
                <Text variant="caption" tone="graphite">
                  Records
                </Text>
                <Text variant="body" tabular>
                  {view.t.count}
                </Text>
              </View>
            </View>
          </View>

          <Section title="Day by day">
            <View className="px-5">
              <CumulativeChart current={view.current} previous={view.previous} days={view.days} start={p.from} currentLabel={range === 'month' ? 'This month' : p.label} previousLabel={p.prevLabel} />
            </View>
          </Section>

          <Section title="Needs and wants" footer="A common guideline is 50% needs, 30% wants, 20% savings. Change what counts as a need in Categories.">
            <View className="px-5">
              {splitTotal ? (
                <>
                  <View className="h-3 flex-row overflow-hidden rounded-full">
                    {(['need', 'want', 'saving'] as const)
                      .filter((k) => view.split[k] > 0)
                      .map((k, i) => (
                        <View key={k} style={{ flex: view.split[k], backgroundColor: nature[k], marginLeft: i ? 2 : 0 }} />
                      ))}
                  </View>
                  <View className="mt-3 flex-row">
                    {(['need', 'want', 'saving'] as const).map((k) => (
                      <View key={k} className="flex-1">
                        <View className="flex-row items-center">
                          <View className="mr-1.5 h-2 w-2 rounded-full" style={{ backgroundColor: nature[k] }} />
                          <Text variant="caption" tone="graphite">
                            {k === 'need' ? 'Needs' : k === 'want' ? 'Wants' : 'Savings'}
                          </Text>
                        </View>
                        <Text variant="heading" tabular className="mt-0.5">
                          {share(view.split[k])}%
                        </Text>
                        <Text variant="caption" tone="mist" tabular>
                          {formatMoney(view.split[k])}
                        </Text>
                      </View>
                    ))}
                  </View>
                  {view.split.none > 0 ? (
                    <Text variant="caption" tone="mist" className="mt-2" tabular>
                      {formatMoney(view.split.none)} is in categories not marked either way.
                    </Text>
                  ) : null}
                </>
              ) : (
                <Text variant="label" weight="regular" tone="graphite">
                  None of this period’s spending is in a category marked as a need, want or saving.
                </Text>
              )}
              <View className="mt-6">
                <NatureColumns months={months} />
              </View>
            </View>
          </Section>

          <Section
            title={drillCat ? drillCat.name : 'Where it went'}
            action={drill ? { label: 'All categories', onPress: () => setDrill(null) } : undefined}
          >
            <View className="px-5">
              <BarList
                items={view.cats.map<BarItem>((c) => ({ id: c.id, label: c.name, value: c.amount, icon: c.icon, color: c.color, sub: `${c.count} ${c.count === 1 ? 'record' : 'records'}` }))}
                total={view.cats.reduce((s, c) => s + c.amount, 0)}
                onPress={drill ? undefined : (item) => item.id !== 'uncategorized' && setDrill(item.id)}
              />
            </View>
          </Section>

          {range === 'month' ? (
            <Section title="Calendar">
              <View className="px-5">
                <CalendarHeat month={p.from} values={calendarDays} />
              </View>
            </Section>
          ) : null}

          <Section title="When you spend">
            <View className="px-5">
              <WeekGrid grid={view.grid} />
            </View>
          </Section>

          {view.payees.length ? (
            <Section title="Where you spend most">
              <View className="px-5">
                <BarList
                  items={view.payees.map<BarItem>((s) => ({
                    id: s.payeeId,
                    label: payeeName.get(s.payeeId) ?? 'Unknown',
                    value: s.amount,
                    sub: `${s.count} ${s.count === 1 ? 'visit' : 'visits'}, about ${formatMoney(s.average)} each`,
                  }))}
                  total={view.t.spent}
                />
              </View>
            </Section>
          ) : null}

          <Section title="Income and spending">
            <View className="px-5">
              <IncomeSpendBars months={months} />
            </View>
          </Section>

          {view.fees.count ? (
            <Section title="Fees">
              <View className="mx-5 rounded-field bg-sunk px-4 py-3">
                <Text variant="body">
                  {formatMoney(view.fees.amount, { currency: base })} in fees
                </Text>
                <Text variant="caption" tone="graphite" className="mt-0.5">
                  Across {view.fees.count} {view.fees.count === 1 ? 'transfer' : 'transfers'}, mostly InstaPay at 0.1% each.
                </Text>
              </View>
            </Section>
          ) : null}
        </>
      )}
    </Screen>
  );
}
