import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '../../shared/components/Button';
import { toast } from '../../shared/components/Feedback';
import { ListRow, Section } from '../../shared/components/List';
import { Avatar, EmptyState, ProgressBar } from '../../shared/components/Misc';
import { Money } from '../../shared/components/Money';
import { Text } from '../../shared/components/Text';
import { Screen } from '../../shared/layouts/Screen';
import { useTheme } from '../../shared/theme/ThemeProvider';
import { shortDate } from '../../shared/utils/dates';
import { formatMoney } from '../../shared/utils/money';
import { TransactionRow } from '../../transactions/components/TransactionRow';
import { useLookups } from '../../transactions/data/useLookups';
import { useTransactions } from '../../transactions/data/transactionsRepo';
import { RepaymentSheet } from '../components/RepaymentSheet';
import { setDebtStatus, useDebt } from '../data/debtsRepo';
import { directionLine, isOverdue, repaidShare } from '../utils/labels';

export default function DebtDetailPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { c } = useTheme();
  const { data: debt } = useDebt(id);
  // The id always comes from the route; the fallback only guards against an unfiltered query.
  const { data: history } = useTransactions({ debtId: id ?? '-' }, [id]);
  const lookups = useLookups();
  const [repaying, setRepaying] = useState(false);
  const [busy, setBusy] = useState(false);

  if (debt === null) {
    return (
      <Screen title="Debt" back testID="debt-detail">
        <EmptyState icon="handshake" title="This debt is gone" body="It may have been deleted." />
      </Screen>
    );
  }
  if (!debt) return <Screen title="Debt" back testID="debt-detail">{null}</Screen>;

  const open = debt.status === 'open';
  const lent = debt.direction === 'lent';
  const overdue = isOverdue(debt);
  const account = debt.accountId ? lookups.accounts.get(debt.accountId) : undefined;

  const toggleStatus = async () => {
    setBusy(true);
    try {
      if (open) {
        await setDebtStatus(debt.id, 'closed');
        toast('Debt marked as settled', { label: 'Undo', onPress: () => void setDebtStatus(debt.id, 'open') });
      } else {
        await setDebtStatus(debt.id, 'open');
        toast('Debt reopened');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen
      title="Debt"
      back
      testID="debt-detail"
      footer={
        open ? <Button label="Record a repayment" icon="hand-coins" size="lg" full onPress={() => setRepaying(true)} testID="debt-repay" /> : undefined
      }
    >
      <View className="px-5 pt-3">
        <View className="flex-row items-center">
          <Avatar name={debt.payeeName} size={48} />
          <View className="ml-3.5 flex-1">
            <Text variant="heading" numberOfLines={1}>
              {debt.payeeName || 'Someone'}
            </Text>
            <Text variant="label" weight="regular" tone="graphite" className="mt-0.5">
              {open ? directionLine(debt.direction) : debt.closedAt ? `Settled ${shortDate(debt.closedAt)}` : 'Settled'}
            </Text>
          </View>
        </View>

        <View className="mt-6" testID="debt-remaining">
          <Money minor={debt.remaining} currency={debt.currency} showCurrency size="hero" tone={open ? undefined : 'graphite'} />
        </View>
        <View className="mt-4">
          <ProgressBar value={repaidShare(debt)} color={open ? c.ink : c.mist} />
        </View>
        <Text variant="label" weight="regular" tone="graphite" tabular className="mt-2">
          Repaid {formatMoney(debt.repaid, { currency: debt.currency })} of {formatMoney(debt.amount, { currency: debt.currency })}
        </Text>
      </View>

      <View className="mt-6 flex-row gap-2.5 px-5">
        <View className="flex-1">
          <Button
            label="Edit"
            icon="pencil"
            variant="secondary"
            full
            onPress={() => router.push({ pathname: '/debts/edit', params: { id: debt.id } })}
            testID="debt-edit"
          />
        </View>
        <View className="flex-1">
          <Button
            label={open ? 'Mark as settled' : 'Reopen'}
            icon={open ? 'circle-check' : 'undo-2'}
            variant="secondary"
            full
            loading={busy}
            onPress={toggleStatus}
            testID="debt-toggle-status"
          />
        </View>
      </View>

      <Section title="Details">
        <ListRow title={lent ? 'Lent on' : 'Borrowed on'} value={shortDate(debt.date)} />
        <ListRow
          title="Due"
          right={
            <Text variant="label" weight={overdue ? 'medium' : 'regular'} tone={overdue ? 'alert' : 'graphite'} numberOfLines={1}>
              {debt.dueDate == null ? 'No due date' : overdue ? `Overdue since ${shortDate(debt.dueDate)}` : shortDate(debt.dueDate)}
            </Text>
          }
        />
        <ListRow title="Account" value={account?.name ?? 'Not linked'} divider={false} />
      </Section>

      {debt.note ? (
        <Section title="Note">
          <Text variant="body" className="px-5">
            {debt.note}
          </Text>
        </Section>
      ) : null}

      <Section title="History">
        {history?.length ? (
          history.map((tx, i) => (
            <TransactionRow
              key={tx.id}
              tx={tx}
              lookups={lookups}
              divider={i < history.length - 1}
              onPress={() => router.push({ pathname: '/add', params: { id: tx.id } })}
            />
          ))
        ) : history ? (
          <Text variant="label" weight="regular" tone="mist" className="px-5 py-2">
            No records yet. Repayments you record show up here.
          </Text>
        ) : null}
      </Section>

      <RepaymentSheet visible={repaying} onClose={() => setRepaying(false)} debt={debt} />
    </Screen>
  );
}
