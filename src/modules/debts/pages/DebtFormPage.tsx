import { startOfDay } from 'date-fns';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { TextInput, View } from 'react-native';

import { useAccounts } from '../../accounts/data/accountsRepo';
import { findOrCreatePayee, getPayee } from '../../payees/data/payeesRepo';
import { BottomSheet } from '../../shared/components/BottomSheet';
import { Button } from '../../shared/components/Button';
import { DateTimeSheet } from '../../shared/components/DateTimeSheet';
import { confirm, toast } from '../../shared/components/Feedback';
import { TextField, ToggleRow } from '../../shared/components/Fields';
import { Icon } from '../../shared/components/Icon';
import { Section } from '../../shared/components/List';
import { Avatar } from '../../shared/components/Misc';
import { haptic, Press } from '../../shared/components/Press';
import { SegmentedControl } from '../../shared/components/SegmentedControl';
import { Text } from '../../shared/components/Text';
import type { DebtDirection, ID } from '../../shared/db/types';
import { Screen } from '../../shared/layouts/Screen';
import { useSettings } from '../../shared/settings/settingsStore';
import { useTheme } from '../../shared/theme/ThemeProvider';
import { dayLabel, shortDate, timeLabel } from '../../shared/utils/dates';
import { formatMoney, parseAmount } from '../../shared/utils/money';
import { instapayFee } from '../../transactions/utils/instapay';
import { FieldRow } from '../../transactions/components/FieldRow';
import { AccountPicker, CurrencyPicker, PayeePicker, type PayeeChoice } from '../../transactions/components/Pickers';
import { countDebtRecords, deleteDebt, getDebt, saveDebt, type DebtWithProgress } from '../data/debtsRepo';
import { amountInput } from '../utils/labels';
import { goBack } from '../../shared/utils/nav';
import { noOutline } from '../../shared/utils/styles';

const DIRECTIONS: { value: DebtDirection; label: string }[] = [
  { value: 'lent', label: 'I lent' },
  { value: 'borrowed', label: 'I borrowed' },
];

/** Small round × used to clear an optional row without opening its picker. */
function ClearButton({ onPress, label, testID }: { onPress: () => void; label: string; testID: string }) {
  return (
    <Press onPress={onPress} hitSlop={10} haptic="select" accessibilityLabel={label} testID={testID} className="ml-2 h-6 w-6 items-center justify-center rounded-full bg-sunk">
      <Icon name="x" size={13} tone="graphite" />
    </Press>
  );
}

export default function DebtFormPage() {
  const params = useLocalSearchParams<{ id?: string; payeeId?: string; direction?: DebtDirection }>();
  const { c } = useTheme();
  const baseCurrency = useSettings((s) => s.baseCurrency);
  const feeRule = useSettings((s) => s.instapayFee);
  const { data: accounts } = useAccounts();

  const [existing, setExisting] = useState<DebtWithProgress | null>(null);
  const [direction, setDirection] = useState<DebtDirection>(params.direction === 'borrowed' ? 'borrowed' : 'lent');
  const [person, setPerson] = useState<PayeeChoice | null>(null);
  const [amountText, setAmountText] = useState('');
  const [currency, setCurrency] = useState(baseCurrency);
  const [currencyTouched, setCurrencyTouched] = useState(false);
  const [date, setDate] = useState(Date.now());
  const [dueDate, setDueDate] = useState<number | null>(null);
  const [accountId, setAccountId] = useState<ID | null>(null);
  /** null = follow the default (on whenever an account is chosen). */
  const [movement, setMovement] = useState<boolean | null>(null);
  const [instapay, setInstapay] = useState<boolean | null>(null);
  const [note, setNote] = useState('');
  const [sheet, setSheet] = useState<null | 'person' | 'currency' | 'date' | 'due' | 'account' | 'delete'>(null);
  const [linkedCount, setLinkedCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const editing = Boolean(params.id);

  const accountById = useMemo(() => new Map((accounts ?? []).map((a) => [a.id, a])), [accounts]);

  /* ----- load ----- */
  useEffect(() => {
    let alive = true;
    void (async () => {
      if (params.id) {
        const d = await getDebt(params.id);
        if (!d || !alive) return;
        setExisting(d);
        setDirection(d.direction);
        setPerson({ payeeId: d.payeeId, name: d.payeeName });
        setAmountText(amountInput(d.amount));
        setCurrency(d.currency);
        setCurrencyTouched(true);
        setDate(d.date);
        setDueDate(d.dueDate);
        setAccountId(d.accountId);
        setNote(d.note ?? '');
      } else if (params.payeeId) {
        const p = await getPayee(params.payeeId);
        if (p && alive) setPerson({ payeeId: p.id, name: p.name });
      }
    })();
    return () => {
      alive = false;
    };
  }, [params.id, params.payeeId]);

  const account = accountId ? accountById.get(accountId) : undefined;
  const amount = parseAmount(amountText) ?? 0;
  const recordMovement = !editing && Boolean(account) && (movement ?? true);
  const lent = direction === 'lent';
  // Defaults to the account's usual way of paying; only matters when the money is recorded.
  const viaInstapay = recordMovement && (instapay ?? account?.defaultPaymentType === 'instapay');
  const fee = viaInstapay && lent && amount > 0 ? instapayFee(amount, feeRule) : 0;

  const pickAccount = (id: ID) => {
    setAccountId(id);
    const a = accountById.get(id);
    if (a && !currencyTouched) setCurrency(a.currency);
  };

  /* ----- validation ----- */
  const problem = !person
    ? 'Choose who it’s with'
    : amount <= 0
      ? 'Enter an amount'
      : dueDate != null && dueDate < startOfDay(date).getTime()
        ? 'The due date is before the date of the loan'
        : recordMovement && account && account.currency !== currency
          ? `${account.name} is in ${account.currency}. Use the same currency to record the money on it.`
          : null;

  const save = async () => {
    if (problem || !person) {
      haptic('warning');
      toast(problem ?? 'Missing details');
      return;
    }
    setSaving(true);
    try {
      const payeeId = person.payeeId ?? (await findOrCreatePayee(person.name, 'person')).id;
      await saveDebt(
        { id: existing?.id, direction, payeeId, accountId, amount, currency, date, dueDate, note: note.trim() || null },
        { recordMovement, paymentType: account?.defaultPaymentType, instapay: viaInstapay },
      );
      haptic('success');
      toast(editing ? 'Debt updated' : 'Debt added');
      goBack();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Couldn’t save');
    } finally {
      setSaving(false);
    }
  };

  /* ----- delete ----- */
  const askDelete = async () => {
    if (!existing) return;
    const n = await countDebtRecords(existing.id);
    if (n > 0) {
      setLinkedCount(n);
      setSheet('delete');
      return;
    }
    const ok = await confirm({ title: 'Delete this debt?', message: 'No records are linked to it.', confirmLabel: 'Delete debt', destructive: true });
    if (ok) await remove(false);
  };

  const remove = async (withRecords: boolean) => {
    if (!existing) return;
    setSheet(null);
    await deleteDebt(existing.id, { deleteTransactions: withRecords });
    toast(withRecords ? 'Debt and its records deleted' : 'Debt deleted');
    router.dismissTo('/debts');
  };

  const instapaySubtitle = !lent
    ? 'No fee when you receive money.'
    : fee > 0
      ? `Adds a ${formatMoney(fee, { currency })} InstaPay fee to your spending. The debt stays ${formatMoney(amount, { currency })}.`
      : 'Adds the InstaPay fee (0.1%, at least EGP 0.50) to your spending.';

  const movementSubtitle = lent
    ? `Takes the amount out of ${account?.name ?? 'the account'}. It moves your balance but never counts as spending.`
    : `Adds the amount to ${account?.name ?? 'the account'}. It moves your balance but never counts as income.`;

  return (
    <Screen
      title={editing ? 'Edit debt' : 'New debt'}
      back
      testID="debt-form"
      footer={<Button label={editing ? 'Save changes' : 'Add debt'} size="lg" full loading={saving} onPress={save} haptic="none" testID="debt-save" />}
    >
      <View className="px-5 pt-1">
        <SegmentedControl testID="debt-direction" options={DIRECTIONS} value={direction} onChange={setDirection} />
      </View>

      <View className="mt-3">
        <FieldRow
          testID="debt-person"
          label="Who"
          value={person?.name}
          needed
          left={person ? <Avatar name={person.name} size={24} /> : null}
          onPress={() => setSheet('person')}
        />
      </View>

      <TextField
        label={lent ? 'How much you lent' : 'How much you borrowed'}
        value={amountText}
        onChangeText={setAmountText}
        keyboardType="decimal-pad"
        placeholder="0.00"
        right={
          <Press onPress={() => setSheet('currency')} hitSlop={10} testID="debt-currency" accessibilityLabel={`Currency: ${currency}`} className="flex-row items-center rounded-full bg-sheet px-2.5 py-1">
            <Text variant="label" weight="semibold">
              {currency}
            </Text>
            <Icon name="chevron-down" size={14} tone="graphite" />
          </Press>
        }
        hint={editing && existing && existing.repaid > 0 ? 'The full amount, before any repayments.' : undefined}
        testID="debt-amount"
      />

      <Section title="Dates">
        <FieldRow testID="debt-date" label={lent ? 'Lent on' : 'Borrowed on'} value={`${dayLabel(date)}, ${timeLabel(date)}`} onPress={() => setSheet('date')} />
        <FieldRow
          testID="debt-due"
          label="Due"
          value={dueDate != null ? shortDate(dueDate) : null}
          placeholder="Optional"
          right={dueDate != null ? <ClearButton label="Remove due date" onPress={() => setDueDate(null)} testID="debt-due-clear" /> : null}
          onPress={() => setSheet('due')}
          divider={false}
        />
      </Section>

      <Section
        footer={
          account || editing
            ? undefined
            : lent
              ? 'Pick the account the money came from to keep its balance right.'
              : 'Pick the account the money went into to keep its balance right.'
        }
      >
        <FieldRow
          testID="debt-account"
          label="Account"
          value={account?.name ?? null}
          placeholder="Optional"
          left={account ? <View className="h-2 w-2 rounded-full" style={{ backgroundColor: account.color }} /> : null}
          right={account ? <ClearButton label="Remove account" onPress={() => setAccountId(null)} testID="debt-account-clear" /> : null}
          onPress={() => setSheet('account')}
          divider={!editing && Boolean(account)}
        />
        {!editing && account ? (
          <ToggleRow
            title="Record the money on this account"
            subtitle={movementSubtitle}
            value={recordMovement}
            onChange={setMovement}
            divider={recordMovement}
            testID="debt-record-movement"
          />
        ) : null}
        {recordMovement ? (
          <ToggleRow
            title={lent ? 'Sent with InstaPay' : 'Received by InstaPay'}
            subtitle={instapaySubtitle}
            value={viaInstapay}
            onChange={setInstapay}
            divider={false}
            testID="debt-instapay"
          />
        ) : null}
      </Section>

      <Section>
        <View className="min-h-12 flex-row items-center px-5">
          <Text variant="label" weight="regular" tone="graphite" numberOfLines={1} className="mr-4 flex-shrink-0">
            Note
          </Text>
          <TextInput
            testID="debt-note"
            value={note}
            onChangeText={setNote}
            placeholder="Optional"
            placeholderTextColor={c.mist}
            selectionColor={c.accent}
            className="flex-1 text-right font-regular text-body text-ink"
            style={noOutline}
            returnKeyType="done"
          />
        </View>
      </Section>

      {editing ? (
        <View className="mt-8 px-5">
          <Button label="Delete debt" variant="danger" full onPress={askDelete} testID="debt-delete" />
        </View>
      ) : null}

      {/* Sheets */}
      <PayeePicker visible={sheet === 'person'} onClose={() => setSheet(null)} selectedName={person?.name ?? null} onSelect={setPerson} title="Who" />
      <CurrencyPicker
        visible={sheet === 'currency'}
        onClose={() => setSheet(null)}
        selected={currency}
        onSelect={(cur) => {
          setCurrency(cur);
          setCurrencyTouched(true);
        }}
      />
      <DateTimeSheet visible={sheet === 'date'} value={date} onClose={() => setSheet(null)} onChange={setDate} title={lent ? 'Lent on' : 'Borrowed on'} />
      <DateTimeSheet
        visible={sheet === 'due'}
        value={dueDate ?? startOfDay(date).getTime()}
        withTime={false}
        title="Due date"
        onClose={() => setSheet(null)}
        onChange={(d) => setDueDate(startOfDay(d).getTime())}
      />
      <AccountPicker visible={sheet === 'account'} onClose={() => setSheet(null)} selected={accountId} onSelect={pickAccount} />
      <BottomSheet
        visible={sheet === 'delete'}
        onClose={() => setSheet(null)}
        title="Delete this debt?"
        subtitle={`${linkedCount} ${linkedCount === 1 ? 'record is' : 'records are'} linked to it, like the loan itself and repayments. Kept records stay on your accounts but start counting as spending and income.`}
        scroll={false}
        testID="debt-delete-sheet"
      >
        <View className="gap-2.5 px-5 pb-2 pt-3">
          <Button label="Delete debt and its records" variant="danger" size="lg" full onPress={() => void remove(true)} testID="debt-delete-with-records" />
          <Button label="Delete debt, keep records" variant="secondary" size="lg" full onPress={() => void remove(false)} testID="debt-delete-keep-records" />
          <Button label="Cancel" variant="ghost" size="lg" full onPress={() => setSheet(null)} testID="debt-delete-cancel" />
        </View>
      </BottomSheet>
    </Screen>
  );
}
