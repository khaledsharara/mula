import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';

import { useAccounts } from '../../accounts/data/accountsRepo';
import { BottomSheet } from '../../shared/components/BottomSheet';
import { Button } from '../../shared/components/Button';
import { DateTimeSheet } from '../../shared/components/DateTimeSheet';
import { toast } from '../../shared/components/Feedback';
import { TextField, ToggleRow } from '../../shared/components/Fields';
import { haptic } from '../../shared/components/Press';
import { Text } from '../../shared/components/Text';
import type { ID } from '../../shared/db/types';
import { getSettings, useSettings } from '../../shared/settings/settingsStore';
import { dayLabel, timeLabel } from '../../shared/utils/dates';
import { formatMoney, parseAmount } from '../../shared/utils/money';
import { FieldRow } from '../../transactions/components/FieldRow';
import { AccountPicker } from '../../transactions/components/Pickers';
import { instapayFee } from '../../transactions/utils/instapay';
import { addRepayment, type DebtWithProgress } from '../data/debtsRepo';
import { amountInput } from '../utils/labels';

type Props = {
  visible: boolean;
  onClose: () => void;
  debt: DebtWithProgress;
};

/**
 * Records money coming back (you lent) or going out (you borrowed). Pickers open one at a
 * time: this sheet steps aside while the account or date sheet is up, keeping its values.
 */
export function RepaymentSheet({ visible, onClose, debt }: Props) {
  const lastAccountId = useSettings((s) => s.lastAccountId);
  const { data: accounts } = useAccounts();
  const [amountText, setAmountText] = useState('');
  const [accountId, setAccountId] = useState<ID | null>(null);
  const [date, setDate] = useState(Date.now());
  const [instapay, setInstapay] = useState(false);
  const [sub, setSub] = useState<null | 'account' | 'date'>(null);
  const [saving, setSaving] = useState(false);

  const accountById = useMemo(() => new Map((accounts ?? []).map((a) => [a.id, a])), [accounts]);

  // Fresh values each time the sheet opens (not when the debt refreshes underneath it).
  useEffect(() => {
    if (!visible) return;
    setAmountText(amountInput(debt.remaining));
    setDate(Date.now());
    setInstapay(false);
    setSub(null);
    setAccountId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Default account: the debt's own, else one in the debt's currency (last used first).
  useEffect(() => {
    if (!visible || accountId || !accounts?.length) return;
    const preferred =
      (debt.accountId && accountById.get(debt.accountId)) ||
      accounts.find((a) => a.currency === debt.currency && a.id === lastAccountId) ||
      accounts.find((a) => a.currency === debt.currency) ||
      accounts[0];
    setAccountId(preferred.id);
  }, [visible, accountId, accounts, accountById, debt.accountId, debt.currency, lastAccountId]);

  const account = accountId ? accountById.get(accountId) : undefined;
  const amount = parseAmount(amountText) ?? 0;
  const paysOut = debt.direction === 'borrowed';
  const fee = instapay && paysOut ? instapayFee(amount, getSettings().instapayFee) : 0;
  const settles = amount >= debt.remaining;

  const problem = amount <= 0
    ? 'Enter an amount'
    : !account
      ? 'Choose an account'
      : account.currency !== debt.currency
        ? `${account.name} is in ${account.currency}. Pick an account in ${debt.currency}.`
        : null;

  const amountHint =
    amount > debt.remaining
      ? `That’s more than the ${formatMoney(debt.remaining, { currency: debt.currency })} still owed.`
      : amount > 0 && amount < debt.remaining
        ? `${formatMoney(debt.remaining - amount, { currency: debt.currency })} will still be owed.`
        : undefined;

  const save = async () => {
    if (problem || !account) {
      haptic('warning');
      toast(problem ?? 'Missing details');
      return;
    }
    setSaving(true);
    try {
      await addRepayment(debt.id, {
        amount,
        accountId: account.id,
        date,
        paymentType: instapay ? 'instapay' : 'cash',
        fee: fee > 0 ? fee : null,
        isInstapay: instapay,
      });
      haptic('success');
      toast(settles ? 'Repayment recorded, debt settled' : 'Repayment recorded');
      onClose();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Couldn’t record the repayment');
    } finally {
      setSaving(false);
    }
  };

  const instapaySubtitle = !paysOut
    ? 'No fee when you receive money.'
    : instapay && amount > 0
      ? `Adds a ${formatMoney(fee, { currency: account?.currency ?? debt.currency })} InstaPay fee.`
      : 'Adds the InstaPay fee to your spending.';

  return (
    <>
      <BottomSheet
        visible={visible && sub === null}
        onClose={onClose}
        title="Record a repayment"
        subtitle={paysOut ? `Money you pay back to ${debt.payeeName}.` : `Money ${debt.payeeName} pays back to you.`}
        testID="repay-sheet"
        footer={<Button label="Record repayment" size="lg" full loading={saving} onPress={save} haptic="none" testID="repay-save" />}
      >
        <TextField
          label="Amount"
          value={amountText}
          onChangeText={setAmountText}
          keyboardType="decimal-pad"
          placeholder="0.00"
          right={
            <Text variant="label" tone="graphite">
              {debt.currency}
            </Text>
          }
          hint={amountHint}
          testID="repay-amount"
        />
        <View className="mt-2">
          <FieldRow
            testID="repay-account"
            label={paysOut ? 'Paid from' : 'Received in'}
            value={account?.name}
            needed
            left={account ? <View className="h-2 w-2 rounded-full" style={{ backgroundColor: account.color }} /> : null}
            onPress={() => setSub('account')}
          />
          <FieldRow testID="repay-date" label="Date" value={`${dayLabel(date)}, ${timeLabel(date)}`} onPress={() => setSub('date')} />
          <ToggleRow title="Paid with InstaPay" subtitle={instapaySubtitle} value={instapay} onChange={setInstapay} divider={false} testID="repay-instapay" />
        </View>
      </BottomSheet>
      <AccountPicker
        visible={visible && sub === 'account'}
        onClose={() => setSub(null)}
        selected={accountId}
        onSelect={setAccountId}
        title={paysOut ? 'Paid from' : 'Received in'}
      />
      <DateTimeSheet visible={visible && sub === 'date'} value={date} onClose={() => setSub(null)} onChange={setDate} />
    </>
  );
}
