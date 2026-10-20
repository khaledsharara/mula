import { View } from 'react-native';

import { Divider } from '../../shared/components/List';
import { IconTile } from '../../shared/components/Misc';
import { Money } from '../../shared/components/Money';
import { Press } from '../../shared/components/Press';
import { Text } from '../../shared/components/Text';
import type { Category, Recurring } from '../../shared/db/types';
import { describeRule } from '../utils/recurrence';
import { dueDayLabel, seriesStatus, signedAmount } from '../utils/labels';

type AmountProps = {
  r: Recurring;
  baseCurrency: string;
  /** The account's currency: an amount charged in another one (EGP on a USD card) shows its code. */
  accountCurrency?: string;
  size?: 'display' | 'lg' | 'md' | 'sm';
};

/** Amount with the record-list sign rules: spending negative, income green, transfers neutral. */
export function RecurringAmount({ r, baseCurrency, accountCurrency, size = 'md' }: AmountProps) {
  if (r.amount == null) {
    return (
      <Text variant={size === 'display' ? 'title' : 'label'} tone="mist">
        No amount set
      </Text>
    );
  }
  const isTransfer = r.type === 'transfer';
  return (
    <Money
      minor={signedAmount(r)}
      currency={r.currency ?? undefined}
      showCurrency={Boolean(r.currency && (r.currency !== baseCurrency || (accountCurrency && r.currency !== accountCurrency)))}
      size={size}
      sign={isTransfer ? 'never' : 'always'}
      colorIncome={r.type === 'income'}
      tone={isTransfer ? 'graphite' : undefined}
    />
  );
}

export function RecurringIcon({ r, category, size = 38 }: { r: Recurring; category?: Category; size?: number }) {
  if (r.type === 'transfer') return <IconTile icon="arrow-left-right" muted size={size} />;
  if (category) return <IconTile icon={category.icon} color={category.color} size={size} />;
  return <IconTile icon={r.isInstapay ? 'zap' : 'repeat'} muted size={size} />;
}

type RowProps = {
  r: Recurring;
  category?: Category;
  baseCurrency: string;
  accountCurrency?: string;
  onPress: () => void;
  divider?: boolean;
};

/** One upcoming occurrence: name, the day it's due, amount. */
export function UpcomingRow({ r, date, category, baseCurrency, accountCurrency, onPress, divider = true }: RowProps & { date: number }) {
  return (
    <Press onPress={onPress} dim={0.6} testID={`upcoming-row-${r.id}-${date}`} accessibilityLabel={`${r.name}, ${dueDayLabel(date)}`}>
      <View className="min-h-[60px] flex-row items-center px-5 py-2.5">
        <View className="mr-3.5">
          <RecurringIcon r={r} category={category} />
        </View>
        <View className="flex-1 pr-3">
          <Text variant="body" numberOfLines={1}>
            {r.name}
          </Text>
          <Text variant="caption" tone="graphite" numberOfLines={1} className="mt-0.5">
            {dueDayLabel(date)}
          </Text>
        </View>
        <RecurringAmount r={r} baseCurrency={baseCurrency} accountCurrency={accountCurrency} />
      </View>
      {divider ? <Divider inset={72} /> : null}
    </Press>
  );
}

/** A whole series: its rule, next due date (or Ended/Paused) and how it's logged. */
export function SeriesRow({ r, category, baseCurrency, accountCurrency, onPress, divider = true }: RowProps) {
  return (
    <Press onPress={onPress} dim={0.6} testID={`recurring-row-${r.id}`} accessibilityLabel={`${r.name}, ${describeRule(r)}`}>
      <View className="min-h-[68px] flex-row items-center px-5 py-3" style={r.active ? null : { opacity: 0.5 }}>
        <View className="mr-3.5">
          <RecurringIcon r={r} category={category} />
        </View>
        <View className="flex-1 pr-3">
          <Text variant="body" numberOfLines={1}>
            {r.name}
          </Text>
          <Text variant="caption" tone="graphite" numberOfLines={1} className="mt-0.5">
            {describeRule(r)}
          </Text>
          <Text variant="caption" tone="mist" numberOfLines={1} className="mt-0.5">
            {seriesStatus(r)}
          </Text>
        </View>
        <RecurringAmount r={r} baseCurrency={baseCurrency} accountCurrency={accountCurrency} />
      </View>
      {divider ? <Divider inset={72} /> : null}
    </Press>
  );
}
