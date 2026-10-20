import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { TextInput, View } from 'react-native';

import { findOrCreatePayee, getPayee } from '../../payees/data/payeesRepo';
import { FieldRow } from '../../transactions/components/FieldRow';
import {
  AccountPicker,
  CategoryPicker,
  CurrencyPicker,
  PayeePicker,
  PaymentTypePicker,
  type PayeeChoice,
} from '../../transactions/components/Pickers';
import { useLookups } from '../../transactions/data/useLookups';
import { paymentTypeLabel } from '../../transactions/types';
import { Button } from '../../shared/components/Button';
import { confirm, toast } from '../../shared/components/Feedback';
import { TextField, ToggleRow } from '../../shared/components/Fields';
import { Icon } from '../../shared/components/Icon';
import { Section } from '../../shared/components/List';
import { EmptyState, IconTile } from '../../shared/components/Misc';
import { Press } from '../../shared/components/Press';
import { SegmentedControl } from '../../shared/components/SegmentedControl';
import { Text } from '../../shared/components/Text';
import type { CategoryKind, ID, PaymentType, TxType } from '../../shared/db/types';
import { Screen } from '../../shared/layouts/Screen';
import { useSettings } from '../../shared/settings/settingsStore';
import { useTheme } from '../../shared/theme/ThemeProvider';
import { parseAmount } from '../../shared/utils/money';
import { deleteTemplate, getTemplate, saveTemplate } from '../data/templatesRepo';
import { goBack } from '../../shared/utils/nav';
import { noOutline } from '../../shared/utils/styles';

type Mode = 'expense' | 'income' | 'transfer' | 'instapay';

const MODES: { value: Mode; label: string }[] = [
  { value: 'expense', label: 'Expense' },
  { value: 'income', label: 'Income' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'instapay', label: 'InstaPay' },
];

type Form = {
  name: string;
  mode: Mode;
  /** InstaPay between two of your own accounts. */
  instapayOwn: boolean;
  amountText: string;
  /** Null follows the account's currency. */
  currency: string | null;
  accountId: ID | null;
  toAccountId: ID | null;
  categoryId: ID | null;
  payee: PayeeChoice | null;
  /** Null uses the account's usual payment type. */
  paymentType: PaymentType | null;
  note: string;
};

const emptyForm: Form = {
  name: '',
  mode: 'expense',
  instapayOwn: false,
  amountText: '',
  currency: null,
  accountId: null,
  toAccountId: null,
  categoryId: null,
  payee: null,
  paymentType: null,
  note: '',
};

const toAmountText = (minor: number) => {
  const v = minor / 100;
  return Number.isInteger(v) ? String(v) : v.toFixed(2);
};

type Sheet = null | 'account' | 'to' | 'category' | 'payee' | 'payment' | 'currency';

export default function TemplateFormPage() {
  const params = useLocalSearchParams<{ id?: string }>();
  const editing = Boolean(params.id);
  const { c } = useTheme();
  const baseCurrency = useSettings((s) => s.baseCurrency);
  const lookups = useLookups();
  const [form, setForm] = useState<Form>(emptyForm);
  const [loaded, setLoaded] = useState(!editing);
  const [missing, setMissing] = useState(false);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [saving, setSaving] = useState(false);

  const set = (patch: Partial<Form>) => setForm((f) => ({ ...f, ...patch }));

  useEffect(() => {
    if (!params.id) return;
    let alive = true;
    void (async () => {
      const t = await getTemplate(params.id!);
      if (!alive) return;
      if (!t) {
        setMissing(true);
        return;
      }
      const payee = t.payeeId ? await getPayee(t.payeeId) : null;
      if (!alive) return;
      setForm({
        name: t.name,
        mode: t.isInstapay ? 'instapay' : t.type,
        instapayOwn: t.isInstapay && t.type === 'transfer',
        amountText: t.amount ? toAmountText(t.amount) : '',
        currency: t.currency,
        accountId: t.accountId,
        toAccountId: t.toAccountId,
        categoryId: t.categoryId,
        payee: payee ? { payeeId: payee.id, name: payee.name } : null,
        paymentType: t.isInstapay ? null : t.paymentType,
        note: t.note ?? '',
      });
      setLoaded(true);
    })();
    return () => {
      alive = false;
    };
  }, [params.id]);

  const account = form.accountId ? lookups.accounts.get(form.accountId) : undefined;
  const toAccount = form.toAccountId ? lookups.accounts.get(form.toAccountId) : undefined;
  const category = form.categoryId ? lookups.categories.get(form.categoryId) : undefined;
  const isTransfer = form.mode === 'transfer' || (form.mode === 'instapay' && form.instapayOwn);
  const txType: TxType = form.mode === 'instapay' ? (form.instapayOwn ? 'transfer' : 'expense') : form.mode;
  const categoryKind: CategoryKind = form.mode === 'income' ? 'income' : 'expense';
  const currency = form.currency ?? account?.currency ?? baseCurrency;
  const showPayee = !(form.mode === 'instapay' && form.instapayOwn);
  const payeeLabel = form.mode === 'income' ? 'From' : form.mode === 'instapay' ? 'Sent to' : 'Paid to';

  const changeMode = (mode: Mode) =>
    set({
      mode,
      // Income and expense categories don't mix, so switching across clears the choice.
      categoryId: (mode === 'income') !== (form.mode === 'income') ? null : form.categoryId,
      paymentType: null,
    });

  const pickAccount = (id: ID) => {
    const next = lookups.accounts.get(id);
    // A currency picked on purpose (unlike either account's) stays; otherwise it follows the account.
    const keep = form.currency && form.currency !== account?.currency && form.currency !== next?.currency;
    set({
      accountId: id,
      currency: keep ? form.currency : null,
      toAccountId: form.toAccountId === id ? null : form.toAccountId,
    });
  };

  const save = async () => {
    const typed = form.amountText.trim();
    const amount = typed ? parseAmount(typed) : null;
    if (typed && amount == null) return toast('The amount isn’t a number');
    if (isTransfer && form.accountId && form.accountId === form.toAccountId) return toast('Pick two different accounts');
    const name = form.name.trim();
    if (!name) return toast('Give the template a name');

    setSaving(true);
    try {
      let payeeId: ID | null = showPayee ? (form.payee?.payeeId ?? null) : null;
      if (showPayee && !payeeId && form.payee?.name) {
        const kind = form.mode === 'instapay' || form.mode === 'income' ? 'person' : 'merchant';
        payeeId = (await findOrCreatePayee(form.payee.name, kind)).id;
      }
      await saveTemplate({
        id: params.id,
        name,
        type: txType,
        amount: amount ? Math.abs(amount) : null,
        currency: form.currency ?? account?.currency ?? null,
        accountId: form.accountId,
        toAccountId: isTransfer ? form.toAccountId : null,
        categoryId: isTransfer ? null : form.categoryId,
        payeeId,
        paymentType: form.mode === 'instapay' ? 'instapay' : form.paymentType,
        note: form.note.trim() || null,
        isInstapay: form.mode === 'instapay',
      });
      toast(editing ? 'Template updated' : 'Template saved');
      goBack();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Couldn’t save the template');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!params.id) return;
    const ok = await confirm({
      title: `Delete ${form.name.trim() || 'this template'}?`,
      message: 'Records you added with it stay as they are.',
      confirmLabel: 'Delete template',
      destructive: true,
    });
    if (!ok) return;
    await deleteTemplate(params.id);
    toast('Template deleted');
    goBack();
  };

  const title = editing ? 'Edit template' : 'New template';
  if (!loaded) {
    return (
      <Screen title={title} back testID="template-form">
        {missing ? <EmptyState icon="sparkle" title="Template not found" body="It may have been deleted. Go back to see your templates." /> : <View />}
      </Screen>
    );
  }

  const accountDot = (color?: string) => (color ? <View className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} /> : null);

  return (
    <Screen
      title={title}
      back
      testID="template-form"
      footer={<Button label={editing ? 'Save changes' : 'Save template'} size="lg" full loading={saving} onPress={save} testID="template-save" />}
    >
      <TextField
        label="Name"
        value={form.name}
        onChangeText={(name) => set({ name })}
        placeholder="e.g. Rent, Morning coffee"
        autoFocus={!editing}
        testID="template-name"
      />

      <View className="px-5 pb-1 pt-3">
        <SegmentedControl testID="template-mode" options={MODES} value={form.mode} onChange={changeMode} />
      </View>

      <TextField
        label="Amount"
        value={form.amountText}
        onChangeText={(amountText) => set({ amountText })}
        keyboardType="decimal-pad"
        placeholder="Optional"
        hint="Leave it empty to type the amount each time."
        testID="template-amount"
        right={
          <Press
            onPress={() => setSheet('currency')}
            hitSlop={10}
            haptic="select"
            testID="template-currency"
            accessibilityLabel={`Currency: ${currency}. Change`}
            className="ml-2 flex-row items-center rounded-full bg-sheet px-2.5 py-1"
          >
            <Text variant="label" weight="semibold">
              {currency}
            </Text>
            <Icon name="chevron-down" size={14} tone="graphite" />
          </Press>
        }
      />

      <Section title="Details">
        {form.mode === 'instapay' ? (
          <ToggleRow
            title="To one of my accounts"
            value={form.instapayOwn}
            onChange={(instapayOwn) => set({ instapayOwn })}
            testID="template-instapay-own"
          />
        ) : null}
        <FieldRow
          testID="template-account"
          label={isTransfer ? 'From' : 'Account'}
          value={account?.name}
          placeholder="Last used"
          left={accountDot(account?.color)}
          onPress={() => setSheet('account')}
        />
        {isTransfer ? (
          <FieldRow
            testID="template-to-account"
            label="To"
            value={toAccount?.name}
            placeholder="Choose"
            left={accountDot(toAccount?.color)}
            onPress={() => setSheet('to')}
          />
        ) : (
          <FieldRow
            testID="template-category"
            label="Category"
            value={category?.name}
            placeholder="Optional"
            left={category ? <IconTile icon={category.icon} color={category.color} size={24} /> : null}
            onPress={() => setSheet('category')}
          />
        )}
        {showPayee ? (
          <FieldRow testID="template-payee" label={payeeLabel} value={form.payee?.name} placeholder="Optional" onPress={() => setSheet('payee')} />
        ) : null}
        {form.mode !== 'instapay' ? (
          <FieldRow
            testID="template-payment"
            label="Payment type"
            value={form.paymentType ? paymentTypeLabel(form.paymentType) : null}
            placeholder="Account’s usual"
            onPress={() => setSheet('payment')}
          />
        ) : null}
        <View className="min-h-12 flex-row items-center px-5">
          <Text variant="label" weight="regular" tone="graphite" numberOfLines={1} className="mr-4 flex-shrink-0">
            Note
          </Text>
          <TextInput
            testID="template-note"
            value={form.note}
            onChangeText={(note) => set({ note })}
            placeholder="Optional"
            placeholderTextColor={c.mist}
            selectionColor={c.accent}
            className="flex-1 text-right font-regular text-body text-ink"
            style={noOutline}
            returnKeyType="done"
            accessibilityLabel="Note"
          />
        </View>
      </Section>

      {editing ? (
        <View className="mt-8 px-5">
          <Button label="Delete template" variant="danger" full onPress={remove} testID="template-delete" />
        </View>
      ) : null}

      <AccountPicker
        visible={sheet === 'account'}
        onClose={() => setSheet(null)}
        selected={form.accountId}
        onSelect={pickAccount}
        title={isTransfer ? 'From account' : 'Account'}
      />
      <AccountPicker
        visible={sheet === 'to'}
        onClose={() => setSheet(null)}
        selected={form.toAccountId}
        onSelect={(toAccountId) => set({ toAccountId })}
        exclude={form.accountId}
        title="To account"
      />
      <CategoryPicker
        visible={sheet === 'category'}
        onClose={() => setSheet(null)}
        kind={categoryKind}
        selected={form.categoryId}
        onSelect={(categoryId) => set({ categoryId })}
      />
      <PayeePicker
        visible={sheet === 'payee'}
        onClose={() => setSheet(null)}
        selectedName={form.payee?.name ?? null}
        onSelect={(payee) => set({ payee })}
        title={payeeLabel}
      />
      <PaymentTypePicker
        visible={sheet === 'payment'}
        onClose={() => setSheet(null)}
        selected={form.paymentType ?? account?.defaultPaymentType ?? 'cash'}
        onSelect={(paymentType) => set({ paymentType })}
      />
      <CurrencyPicker visible={sheet === 'currency'} onClose={() => setSheet(null)} selected={currency} onSelect={(cur) => set({ currency: cur })} />
    </Screen>
  );
}
