import { View } from 'react-native';

import { Divider } from '../../shared/components/List';
import { IconTile } from '../../shared/components/Misc';
import { Money } from '../../shared/components/Money';
import { Press } from '../../shared/components/Press';
import { Text } from '../../shared/components/Text';
import type { Account, Category, ID, Payee } from '../../shared/db/types';
import { formatMoney } from '../../shared/utils/money';
import type { TxListItem } from '../types';

export type RowLookups = {
  accounts: Map<ID, Account>;
  categories: Map<ID, Category>;
  payees: Map<ID, Payee>;
};

type Props = {
  tx: TxListItem;
  lookups: RowLookups;
  onPress?: () => void;
  /** Show which account it belongs to (when looking at all accounts). */
  showAccount?: boolean;
  divider?: boolean;
};

export function TransactionRow({ tx, lookups, onPress, showAccount = true, divider = true }: Props) {
  const cat = tx.categoryId ? lookups.categories.get(tx.categoryId) : undefined;
  const payee = tx.payeeId ? lookups.payees.get(tx.payeeId) : undefined;
  const account = lookups.accounts.get(tx.accountId);
  const to = tx.toAccountId ? lookups.accounts.get(tx.toAccountId) : undefined;

  const isTransfer = tx.type === 'transfer';
  const fallback = tx.isInstapay ? (tx.type === 'income' ? 'InstaPay received' : 'InstaPay transfer') : (cat?.name ?? 'Uncategorized');
  const title = isTransfer ? `${account?.name ?? 'Account'} to ${to?.name ?? 'account'}` : (payee?.name ?? fallback);
  const parts: string[] = [];
  if (!isTransfer && cat && (payee || tx.isInstapay)) parts.push(cat.name);
  if (tx.isInstapay && (payee || isTransfer)) parts.push('InstaPay');
  if (tx.debtId) parts.push(tx.type === 'expense' ? 'Debt' : 'Debt repayment');
  if (showAccount && !isTransfer && account) parts.push(account.name);
  if (tx.note && !payee) parts.push(tx.note);
  const subtitle = parts.join(', ');

  const signed = tx.type === 'expense' ? -tx.amount : tx.amount;
  const icon = isTransfer ? 'arrow-left-right' : tx.debtId ? 'handshake' : (cat?.icon ?? 'circle-question-mark');

  return (
    <Press onPress={onPress} dim={0.6} testID={`tx-row-${tx.id}`} accessibilityLabel={`${title}, ${formatMoney(signed, { currency: tx.currency })}`}>
      <View className="min-h-[60px] flex-row items-center px-5 py-2.5">
        <View className="mr-3.5">
          <IconTile icon={icon} color={isTransfer ? undefined : cat?.color} muted={isTransfer || !cat} size={38} />
        </View>
        <View className="flex-1 pr-3">
          <Text variant="body" numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text variant="caption" tone="graphite" numberOfLines={1} className="mt-0.5">
              {subtitle}
            </Text>
          ) : null}
        </View>
        <View className="items-end">
          <Money minor={isTransfer ? tx.amount : signed} colorIncome={tx.type === 'income'} sign={isTransfer ? 'never' : 'always'} size="md" tone={isTransfer ? 'graphite' : undefined} />
          {tx.feeTotal > 0 ? (
            <Text variant="caption" tone="mist" tabular className="mt-0.5">
              +{formatMoney(tx.feeTotal)} fee
            </Text>
          ) : tx.originalCurrency ? (
            <Text variant="caption" tone="mist" tabular className="mt-0.5">
              {formatMoney(tx.originalAmount ?? 0, { currency: tx.originalCurrency })}
            </Text>
          ) : null}
        </View>
      </View>
      {divider ? <Divider inset={72} /> : null}
    </Press>
  );
}
