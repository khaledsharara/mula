import { addYears, endOfDay, isSameDay, startOfDay } from 'date-fns';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { TextInput, View } from 'react-native';

import { useAccounts } from '../../accounts/data/accountsRepo';
import { useCategories } from '../../categories/data/categoriesRepo';
import { getRate } from '../../integrations/utils/fx';
import { ensurePermission, refreshReminders } from '../../integrations/utils/notifications';
import { findOrCreatePayee, getPayee } from '../../payees/data/payeesRepo';
import { Button } from '../../shared/components/Button';
import { DateTimeSheet } from '../../shared/components/DateTimeSheet';
import { confirm, toast } from '../../shared/components/Feedback';
import { TextField, ToggleRow } from '../../shared/components/Fields';
import { Icon } from '../../shared/components/Icon';
import { Section } from '../../shared/components/List';
import { IconTile } from '../../shared/components/Misc';
import { haptic, Press } from '../../shared/components/Press';
import { SegmentedControl } from '../../shared/components/SegmentedControl';
import { Text } from '../../shared/components/Text';
import type { Frequency, ID, Payee, PaymentType, Recurring, RecurringEnd, RecurringMode, TxType } from '../../shared/db/types';
import { Screen } from '../../shared/layouts/Screen';
import { useSettings } from '../../shared/settings/settingsStore';
import { useTheme } from '../../shared/theme/ThemeProvider';
import { shortDate } from '../../shared/utils/dates';
import { formatMoney, parseAmount } from '../../shared/utils/money';
import { FieldRow } from '../../transactions/components/FieldRow';
import { AccountPicker, CategoryPicker, CurrencyPicker, PayeePicker, PaymentTypePicker, type PayeeChoice } from '../../transactions/components/Pickers';
import { paymentTypeLabel } from '../../transactions/types';
import { instapayFee } from '../../transactions/utils/instapay';
import { StepperRow } from '../components/StepperRow';
import { deleteRecurring, getRecurring, processDueRecurring, saveRecurring, skipMissedRecurring } from '../data/recurringRepo';
import type { RecurringKind } from '../types';
import { amountInput, dueDayLabel, plural, unitLabel } from '../utils/labels';
import { describeRule, dueIndexes, isWithinEnd, upcomingDates, type RecurrenceRule } from '../utils/recurrence';
import { goBack } from '../../shared/utils/nav';
import { noOutline } from '../../shared/utils/styles';

type Form = {
  name: string;
  kind: RecurringKind;
  /** InstaPay between two of your own accounts. */
  instapayOwn: boolean;
  amount: string;
  /** Currency the amount is charged in; null follows the account (e.g. EGP on a USD card). */
  currency: string | null;
  accountId: ID | null;
  toAccountId: ID | null;
  categoryId: ID | null;
  payee: PayeeChoice | null;
  /** null follows the account's usual payment type. */
  paymentType: PaymentType | null;
  note: string;
  frequency: Frequency;
  interval: number;
  startDate: number;
  endType: RecurringEnd;
  endDate: number;
  endCount: number;
  mode: RecurringMode;
  remind: boolean;
  remindDays: number;
  active: boolean;
};

const KINDS: { value: RecurringKind; label: string }[] = [
  { value: 'expense', label: 'Expense' },
  { value: 'income', label: 'Income' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'instapay', label: 'InstaPay' },
];

const FREQUENCIES: { value: Frequency; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

const ENDS: { value: RecurringEnd; label: string }[] = [
  { value: 'never', label: 'Never' },
  { value: 'until', label: 'On a date' },
  { value: 'count', label: 'After' },
];

const MODES: { value: RecurringMode; label: string }[] = [
  { value: 'confirm', label: 'Ask me' },
  { value: 'auto', label: 'Log automatically' },
];

const MODE_HINTS: Record<RecurringMode, string> = {
  confirm: 'Each payment waits in your inbox until you confirm it, so you can adjust the amount first.',
  auto: 'Each payment is recorded on its date without asking. Best for fixed amounts like rent.',
};

function emptyForm(): Form {
  const today = startOfDay(Date.now()).getTime();
  return {
    name: '',
    kind: 'expense',
    instapayOwn: false,
    amount: '',
    currency: null,
    accountId: null,
    toAccountId: null,
    categoryId: null,
    payee: null,
    paymentType: null,
    note: '',
    frequency: 'monthly',
    interval: 1,
    startDate: today,
    endType: 'never',
    endDate: endOfDay(addYears(today, 1)).getTime(),
    endCount: 12,
    mode: 'confirm',
    remind: true,
    remindDays: 1,
    active: true,
  };
}

function formFromRecurring(r: Recurring, payee: Payee | null): Form {
  const base = emptyForm();
  return {
    name: r.name,
    kind: r.isInstapay ? 'instapay' : r.type,
    instapayOwn: r.isInstapay && r.type === 'transfer',
    amount: amountInput(r.amount),
    currency: r.currency,
    accountId: r.accountId,
    toAccountId: r.toAccountId,
    categoryId: r.categoryId,
    payee: payee ? { payeeId: payee.id, name: payee.name } : null,
    paymentType: r.paymentType,
    note: r.note ?? '',
    frequency: r.frequency,
    interval: r.interval,
    startDate: r.startDate,
    endType: r.endType,
    endDate: r.endDate ?? base.endDate,
    endCount: r.endCount ?? base.endCount,
    mode: r.mode,
    remind: r.remindDaysBefore >= 0,
    remindDays: r.remindDaysBefore >= 0 ? r.remindDaysBefore : 1,
    active: r.active,
  };
}

const noop = () => undefined;

export default function RecurringFormPage() {
  const params = useLocalSearchParams<{ id?: string }>();
  const { c } = useTheme();
  const settings = useSettings();
  const { data: accounts } = useAccounts();
  const { data: categories } = useCategories(true);
  const [form, setForm] = useState<Form>(emptyForm);
  const [existing, setExisting] = useState<Recurring | null>(null);
  const [loaded, setLoaded] = useState(!params.id);
  const [sheet, setSheet] = useState<null | 'account' | 'to' | 'category' | 'payee' | 'payment' | 'currency' | 'start' | 'end'>(null);
  const [saving, setSaving] = useState(false);
  const [fx, setFx] = useState<{ pair: string; rate: number | null } | null>(null);

  const set = (patch: Partial<Form>) => setForm((f) => ({ ...f, ...patch }));
  const accountById = useMemo(() => new Map((accounts ?? []).map((a) => [a.id, a])), [accounts]);
  const catById = useMemo(() => new Map((categories ?? []).map((x) => [x.id, x])), [categories]);

  /* ----- load ----- */
  useEffect(() => {
    if (!params.id) return;
    let alive = true;
    void (async () => {
      const r = await getRecurring(params.id!);
      if (!alive) return;
      if (r) {
        const payee = r.payeeId ? await getPayee(r.payeeId) : null;
        if (!alive) return;
        setExisting(r);
        setForm(formFromRecurring(r, payee));
      }
      setLoaded(true);
    })();
    return () => {
      alive = false;
    };
  }, [params.id]);

  /* ----- default account ----- */
  useEffect(() => {
    if (!loaded || !accounts?.length || form.accountId) return;
    const preferred = (settings.lastAccountId && accountById.get(settings.lastAccountId)) || accounts[0];
    set({ accountId: preferred.id });
  }, [loaded, accounts, form.accountId, settings.lastAccountId, accountById]);

  /* ----- derived ----- */
  const account = form.accountId ? accountById.get(form.accountId) : undefined;
  const toAccount = form.toAccountId ? accountById.get(form.toAccountId) : undefined;
  const accountCurrency = account?.currency ?? settings.baseCurrency;
  // InstaPay is EGP-only (its fee tariff is in pounds), so it always uses the account's currency.
  const currency = form.kind === 'instapay' ? accountCurrency : (form.currency ?? accountCurrency);
  const foreign = currency !== accountCurrency;
  const isTransfer = form.kind === 'transfer' || (form.kind === 'instapay' && form.instapayOwn);
  const txType: TxType = form.kind === 'instapay' ? (form.instapayOwn ? 'transfer' : 'expense') : form.kind;
  const amount = parseAmount(form.amount) ?? 0;
  const autoPayment: PaymentType = form.kind === 'instapay' ? 'instapay' : isTransfer ? 'bank_transfer' : (account?.defaultPaymentType ?? 'cash');
  const paymentType: PaymentType = form.kind === 'instapay' ? 'instapay' : (form.paymentType ?? autoPayment);
  const fee = form.kind === 'instapay' ? instapayFee(amount, settings.instapayFee) : 0;

  /* ----- FX preview (each payment is converted at the rate of its own date) ----- */
  const pair = `${currency}-${accountCurrency}`;
  useEffect(() => {
    let alive = true;
    if (!foreign) return;
    void getRate(currency, accountCurrency).then((rate) => alive && setFx({ pair, rate }));
    return () => {
      alive = false;
    };
  }, [foreign, currency, accountCurrency, pair]);
  const rate = fx?.pair === pair ? fx.rate : null;
  const fxHint = !foreign
    ? null
    : rate && amount > 0
      ? `≈ ${formatMoney(Math.round(amount * rate), { currency: accountCurrency })} at today’s rate. Each payment is converted to ${accountCurrency} at the rate on its date.`
      : `Each payment is converted to ${accountCurrency} at the rate on its date.`;
  const amountHint = [fxHint, fee > 0 ? `Each payment adds an InstaPay fee of ${formatMoney(fee, { currency })}.` : null].filter(Boolean).join(' ') || undefined;
  const category = form.categoryId ? catById.get(form.categoryId) : undefined;
  const categoryKind = form.kind === 'income' ? 'income' : 'expense';
  const payeeLabel = form.kind === 'income' ? 'From' : form.kind === 'instapay' ? 'Sent to' : 'Paid to';

  /* ----- schedule preview ----- */
  const rule: RecurrenceRule = {
    frequency: form.frequency,
    interval: form.interval,
    startDate: form.startDate,
    endType: form.endType,
    endDate: form.endType === 'until' ? form.endDate : null,
    endCount: form.endType === 'count' ? form.endCount : null,
  };
  // saveRecurring restarts counting when the schedule changes. For an existing series we then
  // skip dates before today (they were already logged under the old schedule); a new series
  // with a past start date catches up on purpose.
  const reschedule =
    existing != null &&
    (existing.startDate !== form.startDate || existing.frequency !== form.frequency || existing.interval !== form.interval);
  const today = startOfDay(Date.now()).getTime();
  const done = !existing ? 0 : reschedule ? dueIndexes(rule, 0, today - 1).length : existing.occurrences;
  const nextDates = upcomingDates(rule, done, today, Number.MAX_SAFE_INTEGER, 3);
  const earlier = dueIndexes(rule, done, today - 1).length;
  const ruleText =
    describeRule(rule) +
    (form.endType === 'count' ? `, ${form.endCount} ${plural(form.endCount, 'time', 'times')}` : '') +
    (form.endType === 'until' ? `, until ${shortDate(form.endDate)}` : '');
  const earlierText =
    earlier > 0 && form.active
      ? form.mode === 'auto'
        ? `${earlier} earlier ${plural(earlier, 'payment is', 'payments are')} logged as soon as you save.`
        : `${earlier} earlier ${plural(earlier, 'payment goes', 'payments go')} to your inbox to confirm.`
      : null;

  const pickAccount = (id: ID) => {
    const next = accountById.get(id);
    // A currency picked on purpose (unlike either account's) stays; otherwise it follows the account.
    const keep = form.currency && form.currency !== account?.currency && form.currency !== next?.currency;
    set({ accountId: id, currency: keep ? form.currency : null, paymentType: null });
  };

  /* ----- payee ----- */
  const onPayee = async (choice: PayeeChoice | null) => {
    set({ payee: choice });
    if (choice?.payeeId && !form.categoryId && !isTransfer) {
      const p = await getPayee(choice.payeeId);
      const cat = p?.defaultCategoryId ? catById.get(p.defaultCategoryId) : undefined;
      if (cat && cat.kind === categoryKind) set({ categoryId: cat.id });
    }
  };

  /* ----- validation ----- */
  const name = form.name.trim() || form.payee?.name || '';
  const problem = !name
    ? 'Give it a name'
    : !account
      ? 'Choose an account'
      : amount <= 0
        ? 'Enter an amount'
        : isTransfer && !toAccount
          ? 'Choose where the money goes'
          : isTransfer && toAccount?.id === account.id
            ? 'Pick two different accounts'
            : !isTransfer && !form.categoryId
              ? 'Choose a category'
              : !existing && !isWithinEnd(rule, 0)
                ? 'The schedule ends before the first payment'
                : null;

  /* ----- save ----- */
  const save = async () => {
    if (problem || !account) {
      haptic('warning');
      toast(problem ?? 'Missing details');
      return;
    }
    setSaving(true);
    try {
      let payeeId: ID | null = form.instapayOwn ? null : (form.payee?.payeeId ?? null);
      if (!payeeId && !form.instapayOwn && form.payee?.name) {
        const kind = form.kind === 'income' || form.kind === 'instapay' ? 'person' : 'merchant';
        payeeId = (await findOrCreatePayee(form.payee.name, kind)).id;
      }
      const id = await saveRecurring({
        id: existing?.id,
        name,
        type: txType,
        amount,
        currency,
        accountId: account.id,
        toAccountId: isTransfer ? (toAccount?.id ?? null) : null,
        categoryId: isTransfer ? null : form.categoryId,
        payeeId,
        paymentType,
        note: form.note.trim() || null,
        isInstapay: form.kind === 'instapay',
        frequency: form.frequency,
        interval: form.interval,
        startDate: form.startDate,
        endType: form.endType,
        endDate: form.endType === 'until' ? form.endDate : null,
        endCount: form.endType === 'count' ? form.endCount : null,
        mode: form.mode,
        remindDaysBefore: form.remind ? form.remindDays : -1,
        active: form.active,
      });
      if (reschedule) await skipMissedRecurring(id, today - 1);
      // Log or queue anything already due, then reschedule reminders against the new next date.
      const wantsReminder = form.remind && form.active;
      void processDueRecurring()
        .catch(noop)
        .then(() => (wantsReminder ? ensurePermission().then(refreshReminders) : refreshReminders()))
        .catch(noop);
      haptic('success');
      toast(existing ? 'Planned payment saved' : 'Planned payment added');
      goBack();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Couldn’t save');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!existing) return;
    const ok = await confirm({
      title: `Delete ${existing.name}?`,
      message: 'Records it already logged stay. Payments still waiting in your inbox are removed.',
      confirmLabel: 'Delete planned payment',
      destructive: true,
    });
    if (!ok) return;
    await deleteRecurring(existing.id);
    void refreshReminders().catch(noop);
    toast('Planned payment deleted');
    router.dismissTo('/recurring');
  };

  const remindSubtitle = !form.remind
    ? 'No notification before it’s due'
    : form.remindDays === 0
      ? 'A notification at 10:00 on the day it’s due'
      : `A notification at 10:00, ${form.remindDays} ${plural(form.remindDays, 'day', 'days')} before`;

  return (
    <Screen
      title={existing ? 'Edit planned payment' : 'New planned payment'}
      back
      testID="recurring-form"
      footer={<Button label={existing ? 'Save changes' : 'Add planned payment'} size="lg" full loading={saving} onPress={save} testID="recurring-save" haptic="none" />}
    >
      <TextField
        label="Name"
        value={form.name}
        onChangeText={(v) => set({ name: v })}
        placeholder={form.payee?.name ?? 'e.g. Rent, Netflix, Salary'}
        autoFocus={!params.id}
        returnKeyType="done"
        testID="recurring-name"
      />

      <View className="px-5 pb-1 pt-3">
        <SegmentedControl
          testID="recurring-type"
          options={KINDS}
          value={form.kind}
          onChange={(k) =>
            set({
              kind: k,
              categoryId: k === 'income' || form.kind === 'income' ? null : form.categoryId,
              paymentType: null,
              currency: k === 'instapay' ? null : form.currency,
            })
          }
        />
      </View>
      {form.kind === 'instapay' ? (
        <ToggleRow title="To one of my accounts" value={form.instapayOwn} onChange={(v) => set({ instapayOwn: v })} divider={false} testID="recurring-instapay-own" />
      ) : null}

      <TextField
        label="Amount"
        value={form.amount}
        onChangeText={(v) => set({ amount: v })}
        keyboardType="decimal-pad"
        placeholder="0.00"
        right={
          form.kind === 'instapay' ? (
            <Text variant="label" tone="graphite">
              {currency}
            </Text>
          ) : (
            <Press
              onPress={() => setSheet('currency')}
              hitSlop={10}
              haptic="select"
              testID="recurring-currency"
              accessibilityLabel={`Currency: ${currency}. Change`}
              className="ml-2 flex-row items-center rounded-full bg-sheet px-2.5 py-1"
            >
              <Text variant="label" weight="semibold">
                {currency}
              </Text>
              <Icon name="chevron-down" size={14} tone="graphite" />
            </Press>
          )
        }
        hint={amountHint}
        testID="recurring-amount"
      />

      <Section title="Details">
        <FieldRow
          testID="recurring-account"
          label={isTransfer ? 'From' : 'Account'}
          value={account?.name}
          needed
          left={account ? <View className="h-2 w-2 rounded-full" style={{ backgroundColor: account.color }} /> : null}
          onPress={() => setSheet('account')}
        />
        {isTransfer ? (
          <FieldRow testID="recurring-to-account" label="To" value={toAccount?.name} needed onPress={() => setSheet('to')} />
        ) : (
          <FieldRow
            testID="recurring-category"
            label="Category"
            value={category?.name}
            needed
            left={category ? <IconTile icon={category.icon} color={category.color} size={24} /> : null}
            onPress={() => setSheet('category')}
          />
        )}
        {!form.instapayOwn ? (
          <FieldRow testID="recurring-payee" label={payeeLabel} value={form.payee?.name} placeholder="Optional" onPress={() => setSheet('payee')} />
        ) : null}
        {form.kind !== 'instapay' ? (
          <FieldRow testID="recurring-payment" label="Paid with" value={paymentTypeLabel(paymentType)} onPress={() => setSheet('payment')} />
        ) : null}
        <View className="min-h-12 flex-row items-center px-5">
          <Text variant="label" weight="regular" tone="graphite" numberOfLines={1} className="mr-4 flex-shrink-0">
            Note
          </Text>
          <TextInput
            testID="recurring-note"
            value={form.note}
            onChangeText={(v) => set({ note: v })}
            placeholder="Optional"
            placeholderTextColor={c.mist}
            selectionColor={c.accent}
            className="flex-1 text-right font-regular text-body text-ink"
            style={noOutline}
            returnKeyType="done"
          />
        </View>
      </Section>

      <Section title="Schedule">
        <View className="px-5 pb-1">
          <SegmentedControl testID="recurring-frequency" options={FREQUENCIES} value={form.frequency} onChange={(v) => set({ frequency: v })} />
        </View>
        <StepperRow
          label="Every"
          value={form.interval}
          min={1}
          max={12}
          suffix={unitLabel(form.frequency, form.interval)}
          onChange={(v) => set({ interval: v })}
          testID="recurring-interval"
        />
        <FieldRow testID="recurring-start" label="First payment" value={dueDayLabel(form.startDate)} onPress={() => setSheet('start')} />
        <View className="px-5 pb-1 pt-3">
          <Text variant="label" weight="regular" tone="graphite" className="mb-2">
            Ends
          </Text>
          <SegmentedControl testID="recurring-ends" options={ENDS} value={form.endType} onChange={(v) => set({ endType: v })} />
        </View>
        {form.endType === 'until' ? (
          <FieldRow testID="recurring-end-date" label="Last date" value={shortDate(form.endDate)} onPress={() => setSheet('end')} divider={false} />
        ) : null}
        {form.endType === 'count' ? (
          <StepperRow
            label="Payments"
            value={form.endCount}
            min={1}
            max={120}
            suffix="in total"
            onChange={(v) => set({ endCount: v })}
            divider={false}
            testID="recurring-count"
          />
        ) : null}

        <View className="mx-5 mt-3 rounded-field bg-sunk px-4 py-3" testID="recurring-preview">
          <Text variant="label">{ruleText}</Text>
          {nextDates.length ? (
            <View className="mt-2 flex-row flex-wrap gap-1.5">
              {nextDates.map((d) => (
                <View key={d} className="rounded-full bg-sheet px-2.5 py-1">
                  <Text variant="caption" weight="medium" tabular>
                    {dueDayLabel(d)}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <Text variant="caption" tone="alert" className="mt-1">
              No payments left on this schedule.
            </Text>
          )}
          {earlierText ? (
            <Text variant="caption" tone="graphite" className="mt-2">
              {earlierText}
            </Text>
          ) : null}
        </View>
      </Section>

      <Section title="When a payment is due">
        <View className="px-5">
          <SegmentedControl testID="recurring-mode" options={MODES} value={form.mode} onChange={(v) => set({ mode: v })} />
        </View>
        <Text variant="caption" tone="graphite" className="mt-2 px-5">
          {MODE_HINTS[form.mode]}
          {form.mode === 'auto' && foreign ? ' If there’s no exchange rate yet (offline), the payment waits in your inbox instead.' : ''}
        </Text>
      </Section>

      <Section title="Reminder">
        <ToggleRow title="Remind me" subtitle={remindSubtitle} value={form.remind} onChange={(v) => set({ remind: v })} divider={form.remind} testID="recurring-remind" />
        {form.remind ? (
          <StepperRow
            label="When"
            value={form.remindDays}
            min={0}
            max={7}
            suffix={form.remindDays === 0 ? 'on the day' : plural(form.remindDays, 'day before', 'days before')}
            onChange={(v) => set({ remindDays: v })}
            divider={false}
            testID="recurring-remind-days"
          />
        ) : null}
      </Section>

      <Section>
        <ToggleRow
          title="Active"
          subtitle={form.active ? 'Turn off to pause it without deleting.' : 'Paused. Nothing is logged or reminded until you turn it back on.'}
          value={form.active}
          onChange={(v) => set({ active: v })}
          divider={false}
          testID="recurring-active"
        />
      </Section>

      {existing ? (
        <View className="mt-8 px-5">
          <Button label="Delete planned payment" variant="danger" full onPress={remove} testID="recurring-delete" />
        </View>
      ) : null}

      <AccountPicker
        visible={sheet === 'account'}
        onClose={() => setSheet(null)}
        selected={form.accountId}
        onSelect={pickAccount}
        title={isTransfer ? 'From account' : 'Account'}
      />
      <AccountPicker visible={sheet === 'to'} onClose={() => setSheet(null)} selected={form.toAccountId} onSelect={(id) => set({ toAccountId: id })} exclude={form.accountId} title="To account" />
      <CategoryPicker visible={sheet === 'category'} onClose={() => setSheet(null)} kind={categoryKind} selected={form.categoryId} onSelect={(id) => set({ categoryId: id })} />
      <PayeePicker visible={sheet === 'payee'} onClose={() => setSheet(null)} selectedName={form.payee?.name ?? null} onSelect={onPayee} title={payeeLabel} />
      <PaymentTypePicker visible={sheet === 'payment'} onClose={() => setSheet(null)} selected={paymentType} onSelect={(p) => set({ paymentType: p })} />
      <CurrencyPicker
        visible={sheet === 'currency'}
        onClose={() => setSheet(null)}
        selected={currency}
        onSelect={(cur) => set({ currency: cur === accountCurrency ? null : cur })}
      />
      <DateTimeSheet
        visible={sheet === 'start'}
        value={form.startDate}
        withTime={false}
        title="First payment"
        onClose={() => setSheet(null)}
        onChange={(d) => {
          // Re-confirming the same day keeps the stored time, so it doesn't count as a new schedule.
          if (!isSameDay(d, form.startDate)) set({ startDate: startOfDay(d).getTime() });
        }}
      />
      <DateTimeSheet
        visible={sheet === 'end'}
        value={form.endDate}
        withTime={false}
        title="Last date"
        onClose={() => setSheet(null)}
        onChange={(d) => set({ endDate: endOfDay(d).getTime() })}
      />
    </Screen>
  );
}
