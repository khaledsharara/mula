import { View } from 'react-native';

import { Divider } from '../../shared/components/List';
import { Avatar, ProgressBar } from '../../shared/components/Misc';
import { Money } from '../../shared/components/Money';
import { Press } from '../../shared/components/Press';
import { Text } from '../../shared/components/Text';
import { useTheme } from '../../shared/theme/ThemeProvider';
import { formatMoney } from '../../shared/utils/money';
import type { DebtWithProgress } from '../data/debtsRepo';
import { dueInfo, repaidShare, startedLabel } from '../utils/labels';

type Props = {
  debt: DebtWithProgress;
  baseCurrency: string;
  onPress: () => void;
  divider?: boolean;
};

/** Person, when it started and when it's due, what's left; a thin bar shows how much is repaid. */
export function DebtRow({ debt: d, baseCurrency, onPress, divider = true }: Props) {
  const { c } = useTheme();
  const due = dueInfo(d);
  const open = d.status === 'open';
  const showCurrency = d.currency !== baseCurrency;

  return (
    <Press
      onPress={onPress}
      dim={0.6}
      testID={`debt-row-${d.id}`}
      accessibilityLabel={`${d.payeeName}, ${formatMoney(open ? d.remaining : d.amount, { currency: d.currency })}`}
    >
      <View className="flex-row px-5 py-3">
        <View className="mr-3.5">
          <Avatar name={d.payeeName} size={40} />
        </View>
        <View className="flex-1">
          <View className="min-h-[40px] flex-row items-center">
            <View className="flex-1 pr-3">
              <Text variant="body" numberOfLines={1}>
                {d.payeeName || 'Someone'}
              </Text>
              <Text variant="caption" tone="graphite" numberOfLines={1} className="mt-0.5">
                {startedLabel(d)}
                {due ? ', ' : ''}
                {due ? (
                  <Text variant="caption" tone={due.overdue ? 'alert' : 'graphite'} weight={due.overdue ? 'medium' : 'regular'}>
                    {due.text}
                  </Text>
                ) : null}
              </Text>
            </View>
            <View className="items-end">
              <Money minor={open ? d.remaining : d.amount} currency={d.currency} showCurrency={showCurrency} size="md" tone={open ? undefined : 'graphite'} />
              {open && d.repaid > 0 ? (
                <Text variant="caption" tone="mist" tabular className="mt-0.5">
                  of {formatMoney(d.amount)}
                </Text>
              ) : null}
            </View>
          </View>
          <View className="mt-2.5">
            <ProgressBar value={repaidShare(d)} height={3} color={open ? c.ink : c.mist} />
          </View>
        </View>
      </View>
      {divider ? <Divider inset={74} /> : null}
    </Press>
  );
}
