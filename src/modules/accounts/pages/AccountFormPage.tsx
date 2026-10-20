import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { CurrencyPicker, PaymentTypePicker } from '../../transactions/components/Pickers';
import { FieldRow } from '../../transactions/components/FieldRow';
import { paymentTypeLabel } from '../../transactions/types';
import { Button } from '../../shared/components/Button';
import { Chip } from '../../shared/components/Chip';
import { confirm, toast } from '../../shared/components/Feedback';
import { TextField, ToggleRow } from '../../shared/components/Fields';
import { Section } from '../../shared/components/List';
import { Press } from '../../shared/components/Press';
import { Text } from '../../shared/components/Text';
import type { AccountType, PaymentType } from '../../shared/db/types';
import { Screen } from '../../shared/layouts/Screen';
import { goBack } from '../../shared/utils/nav';
import { useSettings } from '../../shared/settings/settingsStore';
import { formatMoney, parseAmount } from '../../shared/utils/money';
import { deleteAccount, getAccount, getBalances, saveAccount } from '../data/accountsRepo';
import { ACCOUNT_COLORS, ACCOUNT_TYPES, accountTypeMeta } from '../utils/accountMeta';

type Preset = 'bank' | 'cash' | 'usd';

const PRESETS: Record<Preset, { name: string; type: AccountType; currency: string; payment: PaymentType; color: string }> = {
  bank: { name: 'Bank account', type: 'bank', currency: 'EGP', payment: 'debit_card', color: ACCOUNT_COLORS[0] },
  cash: { name: 'Cash', type: 'cash', currency: 'EGP', payment: 'cash', color: ACCOUNT_COLORS[1] },
  usd: { name: 'Dollar account', type: 'bank', currency: 'USD', payment: 'debit_card', color: ACCOUNT_COLORS[2] },
};

export default function AccountFormPage() {
  const params = useLocalSearchParams<{ id?: string; preset?: Preset }>();
  const baseCurrency = useSettings((s) => s.baseCurrency);
  const preset = params.preset ? PRESETS[params.preset] : null;

  const [name, setName] = useState(preset?.name ?? '');
  const [type, setType] = useState<AccountType>(preset?.type ?? 'bank');
  const [currency, setCurrency] = useState(preset?.currency ?? baseCurrency);
  const [balanceText, setBalanceText] = useState('');
  const [payment, setPayment] = useState<PaymentType>(preset?.payment ?? 'debit_card');
  const [paymentTouched, setPaymentTouched] = useState(false);
  const [digits, setDigits] = useState('');
  const [color, setColor] = useState(preset?.color ?? ACCOUNT_COLORS[0]);
  const [exclude, setExclude] = useState(false);
  const [archived, setArchived] = useState(false);
  const [sheet, setSheet] = useState<null | 'currency' | 'payment'>(null);
  const [txSum, setTxSum] = useState(0);
  const [saving, setSaving] = useState(false);
  const editing = Boolean(params.id);

  useEffect(() => {
    if (!params.id) return;
    void (async () => {
      const a = await getAccount(params.id!);
      if (!a) return;
      const balances = await getBalances();
      const current = balances[a.id] ?? a.initialBalance;
      setTxSum(current - a.initialBalance);
      setName(a.name);
      setType(a.type);
      setCurrency(a.currency);
      setBalanceText(String(current / 100));
      setPayment(a.defaultPaymentType);
      setPaymentTouched(true);
      setDigits(a.identifiers.join(', '));
      setColor(a.color);
      setExclude(a.excludeFromStats);
      setArchived(a.archived);
    })();
  }, [params.id]);

  const pickType = (t: AccountType) => {
    setType(t);
    if (!paymentTouched) setPayment(accountTypeMeta(t).payment);
  };

  const balance = parseAmount(balanceText || '0');
  const identifiers = digits
    .split(/[,\s]+/)
    .map((d) => d.replace(/\D/g, ''))
    .filter((d) => d.length >= 3)
    .map((d) => d.slice(-4));

  const save = async () => {
    if (!name.trim()) return toast('Give the account a name');
    if (balance == null) return toast('The balance isn’t a number');
    setSaving(true);
    try {
      await saveAccount({
        id: params.id,
        name,
        type,
        currency,
        initialBalance: balance - txSum,
        color,
        icon: accountTypeMeta(type).icon,
        defaultPaymentType: payment,
        identifiers,
        excludeFromStats: exclude,
        archived,
      });
      toast(editing ? 'Account updated' : `${name.trim()} added`);
      goBack();
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    const ok = await confirm({
      title: `Delete ${name}?`,
      message: 'All records in this account are deleted too. Archive it instead to keep its history.',
      confirmLabel: 'Delete account and records',
      destructive: true,
    });
    if (!ok || !params.id) return;
    await deleteAccount(params.id);
    toast('Account deleted');
    goBack();
  };

  return (
    <Screen title={editing ? 'Edit account' : 'New account'} back footer={<Button label={editing ? 'Save changes' : 'Add account'} size="lg" full loading={saving} onPress={save} testID="account-save" />}>
      <TextField label="Name" value={name} onChangeText={setName} placeholder="e.g. CIB, Cash, Vodafone Cash" autoFocus={!editing} testID="account-name" />

      <View className="px-5 pb-1 pt-3">
        <Text variant="label" tone="graphite" className="mb-2">
          Type
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {ACCOUNT_TYPES.map((t) => (
            <Chip key={t.value} label={t.label} icon={t.icon} selected={type === t.value} onPress={() => pickType(t.value)} testID={`account-type-${t.value}`} />
          ))}
        </View>
      </View>

      <TextField
        label={editing ? 'Balance now' : 'Current balance'}
        value={balanceText}
        onChangeText={setBalanceText}
        keyboardType="decimal-pad"
        placeholder="0.00"
        hint={editing ? 'Changing this adjusts the starting balance; your records stay as they are.' : 'What the account holds today. Records you add update it.'}
        right={<Text variant="label" tone="graphite">{currency}</Text>}
        testID="account-balance"
      />

      <Section title="Defaults">
        <FieldRow label="Currency" value={currency} onPress={() => setSheet('currency')} testID="account-currency" />
        <FieldRow label="Usually paid with" value={paymentTypeLabel(payment)} onPress={() => setSheet('payment')} divider={false} testID="account-payment" />
      </Section>

      <Section title="Bank messages" footer="Last 4 digits of the cards and account numbers in your bank SMS (for example **1234). Separate several with commas. Messages mentioning them are filed into this account.">
        <TextField value={digits} onChangeText={setDigits} placeholder="1234, 5678" keyboardType="numbers-and-punctuation" testID="account-digits" />
      </Section>

      <Section title="Color">
        <View className="flex-row flex-wrap gap-3 px-5">
          {ACCOUNT_COLORS.map((col) => (
            <Press key={col} onPress={() => setColor(col)} haptic="select" accessibilityLabel={`Color ${col}`} accessibilityState={{ selected: color === col }}>
              <View className={`h-9 w-9 items-center justify-center rounded-full ${color === col ? 'border-2 border-ink' : ''}`}>
                <View className="h-7 w-7 rounded-full" style={{ backgroundColor: col }} />
              </View>
            </Press>
          ))}
        </View>
      </Section>

      <Section>
        <ToggleRow title="Leave out of statistics" subtitle="For savings or business accounts you don’t want in your spending." value={exclude} onChange={setExclude} />
        {editing ? <ToggleRow title="Archived" subtitle="Hidden from pickers and totals, history kept." value={archived} onChange={setArchived} divider={false} /> : null}
      </Section>

      {editing ? (
        <View className="mt-8 px-5">
          <Button label="Delete account" variant="danger" full onPress={remove} />
          <Text variant="caption" tone="mist" className="mt-2 text-center">
            Records currently add up to {formatMoney(txSum, { currency, sign: 'always' })}.
          </Text>
        </View>
      ) : null}

      <CurrencyPicker visible={sheet === 'currency'} onClose={() => setSheet(null)} selected={currency} onSelect={setCurrency} />
      <PaymentTypePicker
        visible={sheet === 'payment'}
        onClose={() => setSheet(null)}
        selected={payment}
        onSelect={(p) => {
          setPayment(p);
          setPaymentTouched(true);
        }}
      />
    </Screen>
  );
}
