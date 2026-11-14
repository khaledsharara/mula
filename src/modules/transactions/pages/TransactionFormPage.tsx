import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { useAccounts } from '../../accounts/data/accountsRepo';
import { effectiveNature, useCategories } from '../../categories/data/categoriesRepo';
import { buildSuggestion, confirmItem, getInboxItem, linkToExisting, type Suggestion } from '../../inbox/data/inboxRepo';
import { aliasDecisionForInbox } from '../../inbox/utils/aliasDecision';
import { getRate } from '../../integrations/utils/fx';
import { askAlias } from '../../payees/components/AliasPrompt';
import { findOrCreatePayee, getPayee, recentInstapayPayees, setAlias } from '../../payees/data/payeesRepo';
import { getTemplate, saveTemplate, useTemplates } from '../../templates/data/templatesRepo';
import { BottomSheet } from '../../shared/components/BottomSheet';
import { Button, IconButton } from '../../shared/components/Button';
import { Chip } from '../../shared/components/Chip';
import { DateTimeSheet } from '../../shared/components/DateTimeSheet';
import { confirm, toast } from '../../shared/components/Feedback';
import { TextField, ToggleRow } from '../../shared/components/Fields';
import { Icon } from '../../shared/components/Icon';
import { ListRow } from '../../shared/components/List';
import { IconTile } from '../../shared/components/Misc';
import { Money } from '../../shared/components/Money';
import { Numpad, applyNumpadKey, evaluateExpression, type NumpadKey } from '../../shared/components/Numpad';
import { haptic, Press } from '../../shared/components/Press';
import { SegmentedControl } from '../../shared/components/SegmentedControl';
import { Text } from '../../shared/components/Text';
import type { ID, Nature, Payee, PaymentType, Transaction } from '../../shared/db/types';
import type { RowLookups } from '../components/TransactionRow';
import { Screen } from '../../shared/layouts/Screen';
import { goBack } from '../../shared/utils/nav';
import { getSettings, useSettings, type FeeRule } from '../../shared/settings/settingsStore';
import { dayLabel, timeLabel } from '../../shared/utils/dates';
import { formatMoney, parseAmount, toMinor } from '../../shared/utils/money';
import { SYSTEM_CATEGORIES } from '../../shared/db/seeds/categories';
import { FieldRow } from '../components/FieldRow';
import { LinkRecordSheet } from '../components/LinkRecordSheet';
import { AccountPicker, CategoryPicker, CurrencyPicker, PayeePicker, PaymentTypePicker, type PayeeChoice } from '../components/Pickers';
import { createTransaction, deleteTransaction, getFeeTotal, getTransaction, setPayback, updateTransaction, usePaybacks, useTransaction } from '../data/transactionsRepo';
import { useLookups } from '../data/useLookups';
import { paymentTypeLabel, type TxInput, type TxListItem } from '../types';
import { instapayFee } from '../utils/instapay';
import { afterPaybacks, recordName } from '../utils/paybacks';

type Mode = 'expense' | 'income' | 'transfer' | 'instapay';

type Form = {
  mode: Mode;
  /** InstaPay between two of your own accounts. */
  instapayOwn: boolean;
  /** Income that arrived by InstaPay (the InstaPay mode itself is for money going out). */
  instapayIn: boolean;
  expr: string;
  currency: string | null;
  accountId: ID | null;
  toAccountId: ID | null;
  categoryId: ID | null;
  payee: PayeeChoice | null;
  paymentType: PaymentType | null;
  date: number;
  note: string;
  feeOn: boolean;
  feeOverride: number | null;
  nature: Nature | null;
  recurringId: ID | null;
  debtId: ID | null;
  /** Income only: the expense this pays back. */
  reimbursesId: ID | null;
};

const emptyForm = (mode: Mode = 'expense'): Form => ({
  mode,
  instapayOwn: false,
  instapayIn: false,
  expr: '',
  currency: null,
  accountId: null,
  toAccountId: null,
  categoryId: null,
  payee: null,
  paymentType: null,
  date: Date.now(),
  note: '',
  feeOn: true,
  feeOverride: null,
  nature: null,
  recurringId: null,
  debtId: null,
  reimbursesId: null,
});

const MODES: { value: Mode; label: string }[] = [
  { value: 'expense', label: 'Expense' },
  { value: 'income', label: 'Income' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'instapay', label: 'InstaPay' },
];

const amountExpr = (minor: number) => {
  const v = minor / 100;
  return Number.isInteger(v) ? String(v) : v.toFixed(2);
};

function formFromTx(t: Transaction, fee: number, payee: Payee | null, rule: FeeRule): Form {
  const standard = t.isInstapay ? instapayFee(t.amount, rule) : 0;
  return {
    mode: t.isInstapay && t.type !== 'income' ? 'instapay' : t.type,
    instapayOwn: t.isInstapay && t.type === 'transfer',
    instapayIn: t.isInstapay && t.type === 'income',
    expr: amountExpr(t.originalAmount ?? t.amount),
    currency: t.originalCurrency ?? t.currency,
    accountId: t.accountId,
    toAccountId: t.toAccountId,
    categoryId: t.categoryId,
    payee: payee ? { payeeId: payee.id, name: payee.name } : null,
    paymentType: t.paymentType,
    date: t.date,
    note: t.note ?? '',
    feeOn: fee > 0 || !t.isInstapay,
    // Keep a custom fee only if it was customised; otherwise it follows the amount.
    feeOverride: fee > 0 && fee !== standard ? fee : null,
    nature: t.natureOverride,
    recurringId: t.recurringId,
    debtId: t.debtId,
    reimbursesId: t.reimbursesId,
  };
}

export default function TransactionFormPage() {
  const params = useLocalSearchParams<{ id?: string; inboxId?: string; templateId?: string; mode?: Mode; accountId?: string; amount?: string; paysBack?: string }>();
  const settings = useSettings();
  const { data: accounts } = useAccounts();
  const { data: categories } = useCategories(true);
  const { data: templates } = useTemplates();
  const [form, setForm] = useState<Form>(() => ({
    ...emptyForm(params.paysBack ? 'income' : (params.mode ?? 'expense')),
    expr: params.amount && Number(params.amount) > 0 ? amountExpr(Number(params.amount)) : '',
    // "Add a payback" from an expense: money coming back for it.
    reimbursesId: params.paysBack ?? null,
    categoryId: params.paysBack ? SYSTEM_CATEGORIES.refunds : null,
  }));
  const [loaded, setLoaded] = useState(!params.id && !params.inboxId && !params.templateId);
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [rate, setRate] = useState<number | null>(null);
  const [toRate, setToRate] = useState<number | null>(null);
  const [sheet, setSheet] = useState<
    null | 'account' | 'to' | 'category' | 'payee' | 'payment' | 'date' | 'currency' | 'nature' | 'fee' | 'note' | 'menu' | 'template' | 'paysBack' | 'linkIncome'
  >(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [customFee, setCustomFee] = useState('');
  const [instapayRecents, setInstapayRecents] = useState<Payee[]>([]);
  const [saving, setSaving] = useState(false);
  const [existing, setExisting] = useState<Transaction | null>(null);
  const lookups = useLookups();
  const { data: reimbursed } = useTransaction(form.mode === 'income' ? form.reimbursesId : null);
  const { data: paybacks } = usePaybacks(existing?.type === 'expense' ? existing.id : null);

  const set = (patch: Partial<Form>) => setForm((f) => ({ ...f, ...patch }));
  const accountById = useMemo(() => new Map((accounts ?? []).map((a) => [a.id, a])), [accounts]);
  const catById = useMemo(() => new Map((categories ?? []).map((x) => [x.id, x])), [categories]);

  const applyTemplate = (t: Awaited<ReturnType<typeof getTemplate>>) => {
    if (!t) return;
    haptic('select');
    setForm((f) => ({
      ...f,
      mode: t.isInstapay && t.type !== 'income' ? 'instapay' : t.type,
      instapayOwn: t.isInstapay && t.type === 'transfer',
      instapayIn: t.isInstapay && t.type === 'income',
      expr: t.amount ? amountExpr(t.amount) : f.expr,
      currency: t.currency ?? f.currency,
      accountId: t.accountId ?? f.accountId,
      toAccountId: t.toAccountId,
      categoryId: t.categoryId,
      paymentType: t.paymentType,
      note: t.note ?? '',
      payee: f.payee,
    }));
    if (t.payeeId) void getPayee(t.payeeId).then((p) => p && set({ payee: { payeeId: p.id, name: p.name } }));
  };

  /* ----- initial load ----- */
  useEffect(() => {
    let alive = true;
    (async () => {
      if (params.id) {
        const t = await getTransaction(params.id);
        if (!t || !alive) return;
        const [fee, payee] = await Promise.all([getFeeTotal(t.id), t.payeeId ? getPayee(t.payeeId) : null]);
        setExisting(t);
        setForm(formFromTx(t, fee, payee, getSettings().instapayFee));
      } else if (params.inboxId) {
        const item = await getInboxItem(params.inboxId);
        if (!item || !alive) return;
        const s = await buildSuggestion(item);
        setSuggestion(s);
        const d = s.draft;
        setForm({
          ...emptyForm(d.isInstapay && d.type !== 'income' ? 'instapay' : d.type),
          instapayOwn: Boolean(d.isInstapay && d.type === 'transfer'),
          instapayIn: Boolean(d.isInstapay && d.type === 'income'),
          expr: amountExpr(s.original?.amount ?? s.unconverted?.amount ?? d.amount),
          currency: s.original?.currency ?? s.unconverted?.currency ?? s.account?.currency ?? null,
          accountId: d.accountId ?? null,
          toAccountId: d.toAccountId ?? null,
          categoryId: d.categoryId ?? null,
          payee: s.payee ? { payeeId: s.payee.id, name: s.payee.name } : s.suggestedName ? { payeeId: null, name: s.suggestedName } : null,
          paymentType: d.paymentType,
          date: d.date,
          note: d.note ?? '',
          recurringId: d.recurringId ?? null,
        });
        if (s.original) setRate(s.original.rate);
      } else if (params.templateId) {
        const t = await getTemplate(params.templateId);
        if (t && alive) applyTemplate(t);
      }
      if (alive) setLoaded(true);
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id, params.inboxId, params.templateId]);

  /* ----- defaults: account, currency, payment type ----- */
  const account = form.accountId ? accountById.get(form.accountId) : undefined;
  useEffect(() => {
    if (!loaded || !accounts?.length || form.accountId) return;
    const preferred = (params.accountId && accountById.get(params.accountId)) || (settings.lastAccountId && accountById.get(settings.lastAccountId)) || accounts[0];
    set({ accountId: preferred.id });
  }, [loaded, accounts, form.accountId, params.accountId, settings.lastAccountId, accountById]);

  const entryCurrency = form.currency ?? account?.currency ?? settings.baseCurrency;
  const accountCurrency = account?.currency ?? entryCurrency;
  const isTransfer = form.mode === 'transfer' || (form.mode === 'instapay' && form.instapayOwn);
  const txType = form.mode === 'instapay' ? (form.instapayOwn ? 'transfer' : 'expense') : form.mode;

  // Payment type follows the account (fixes "always Cash"), unless the user picked one.
  const autoPayment: PaymentType = form.mode === 'instapay' ? 'instapay' : isTransfer ? 'bank_transfer' : (account?.defaultPaymentType ?? 'cash');
  const paymentType = form.mode === 'instapay' ? 'instapay' : (form.paymentType ?? autoPayment);

  /* ----- FX ----- */
  useEffect(() => {
    let alive = true;
    if (entryCurrency === accountCurrency) {
      setRate(1);
      return;
    }
    if (suggestion?.original && suggestion.original.currency === entryCurrency) return;
    setRate(null);
    void getRate(entryCurrency, accountCurrency, form.date).then((r) => alive && setRate(r));
    return () => {
      alive = false;
    };
  }, [entryCurrency, accountCurrency, form.date, suggestion]);

  const toAccount = form.toAccountId ? accountById.get(form.toAccountId) : undefined;
  useEffect(() => {
    let alive = true;
    if (!toAccount || toAccount.currency === accountCurrency) {
      setToRate(1);
      return;
    }
    void getRate(accountCurrency, toAccount.currency, form.date).then((r) => alive && setToRate(r));
    return () => {
      alive = false;
    };
  }, [toAccount, accountCurrency, form.date]);

  /* ----- amounts ----- */
  const entered = evaluateExpression(form.expr);
  const enteredMinor = entered != null ? toMinor(entered) : 0;
  const amount = entryCurrency === accountCurrency ? enteredMinor : rate ? Math.round(enteredMinor * rate) : 0;
  const toAmount = isTransfer && toAccount ? Math.round(amount * (toRate ?? 1)) : null;
  const autoFee = form.mode === 'instapay' ? instapayFee(amount, settings.instapayFee) : 0;
  const fee = form.mode === 'instapay' && form.feeOn ? (form.feeOverride ?? autoFee) : 0;
  const hasOperator = /[+−×÷]/.test(form.expr);

  /* ----- category / payee ----- */
  const category = form.categoryId ? catById.get(form.categoryId) : undefined;
  const categoryNature = effectiveNature(category, catById);
  const categoryKind = form.mode === 'income' ? 'income' : 'expense';

  useEffect(() => {
    if (form.mode === 'instapay' && !form.instapayOwn && !instapayRecents.length) void recentInstapayPayees().then(setInstapayRecents);
  }, [form.mode, form.instapayOwn, instapayRecents.length]);

  const onPayee = async (choice: PayeeChoice | null) => {
    set({ payee: choice });
    if (choice?.payeeId && !form.categoryId) {
      const p = await getPayee(choice.payeeId);
      if (p?.defaultCategoryId) {
        const cat = catById.get(p.defaultCategoryId);
        if (cat && cat.kind === categoryKind) set({ categoryId: p.defaultCategoryId });
      }
    }
  };

  const onKey = (k: NumpadKey) => set({ expr: applyNumpadKey(form.expr, k) });

  /* ----- validation ----- */
  const problem = !account
    ? 'Choose an account'
    : amount <= 0
      ? entryCurrency !== accountCurrency && !rate
        ? 'No exchange rate yet. Check your connection.'
        : 'Enter an amount'
      : isTransfer && !toAccount
        ? 'Choose where the money goes'
        : isTransfer && toAccount?.id === account.id
          ? 'Pick two different accounts'
          : !isTransfer && !form.categoryId && !form.debtId && !(form.mode === 'income' && form.reimbursesId)
            ? 'Choose a category'
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
      let payeeId: ID | null = form.payee?.payeeId ?? null;
      if (!payeeId && form.payee?.name) {
        const kind = form.mode === 'instapay' || form.mode === 'income' ? 'person' : 'merchant';
        payeeId = (await findOrCreatePayee(form.payee.name, suggestion?.item.parsed?.kind === 'instapay_in' ? 'person' : kind)).id;
      }

      const paysBack = txType === 'income' ? form.reimbursesId : null;
      const input: TxInput = {
        type: txType,
        amount,
        accountId: account.id,
        toAccountId: isTransfer ? (toAccount?.id ?? null) : null,
        toAmount,
        categoryId: isTransfer ? null : (form.categoryId ?? (paysBack ? SYSTEM_CATEGORIES.refunds : null)),
        payeeId,
        paymentType,
        date: form.date,
        note: form.note,
        isInstapay: form.mode === 'instapay' || (form.mode === 'income' && form.instapayIn),
        fee,
        natureOverride: form.nature,
        original: entryCurrency !== accountCurrency && rate ? { amount: enteredMinor, currency: entryCurrency, rate } : null,
        recurringId: form.recurringId,
        debtId: form.debtId,
        reimbursesId: paysBack,
      };

      if (existing) {
        await updateTransaction(existing.id, { ...input, source: existing.source, sourceRef: existing.sourceRef });
        await maybeAliasForEdit(existing, payeeId, form.payee?.name ?? null);
        toast('Changes saved');
      } else if (suggestion) {
        const alias = await aliasDecisionForInbox(suggestion, payeeId, form.payee?.name ?? null);
        await confirmItem(suggestion.item.id, input, { alias });
        toast('Saved from your bank message');
      } else {
        await createTransaction(input);
        toast('Saved');
      }
      haptic('success');
      goBack();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Couldn’t save');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!existing) return;
    const ok = await confirm({ title: 'Delete this record?', message: 'It’s removed from balances and statistics.', confirmLabel: 'Delete record', destructive: true });
    if (!ok) return;
    await deleteTransaction(existing.id);
    toast('Record deleted');
    goBack();
  };

  const saveAsTemplate = async () => {
    const name = templateName.trim();
    if (!name) return toast('Give the template a name');
    setSheet(null);
    await saveTemplate({
      name,
      type: txType,
      // As typed, in the entry currency: applying the template converts it again on the day.
      amount: enteredMinor || null,
      currency: entryCurrency,
      accountId: account?.id ?? null,
      toAccountId: isTransfer ? (toAccount?.id ?? null) : null,
      categoryId: isTransfer ? null : form.categoryId,
      payeeId: form.payee?.payeeId ?? null,
      paymentType,
      note: form.note || null,
      isInstapay: form.mode === 'instapay',
    });
    toast(`Template “${name}” saved`);
  };

  const title = existing ? 'Edit record' : suggestion ? 'From your bank' : 'New record';
  const payeeLabel = form.mode === 'income' ? 'From' : form.mode === 'instapay' ? 'Sent to' : 'Paid to';

  return (
    <Screen
      close
      scroll={false}
      avoidKeyboard={false}
      title={title}
      testID="tx-form"
      right={<IconButton icon="ellipsis" label="More options" onPress={() => setSheet('menu')} testID="tx-menu" />}
    >
      <View className="px-5 pt-1">
        <SegmentedControl
          testID="tx-mode"
          options={MODES}
          value={form.mode}
          onChange={(m) => set({ mode: m, categoryId: m === 'income' || form.mode === 'income' ? null : form.categoryId, paymentType: null })}
        />
      </View>

      {!existing && !suggestion && templates?.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-3 max-h-10 flex-grow-0" contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
          {templates.map((t) => (
            <Chip key={t.id} label={t.name} icon="sparkle" onPress={() => applyTemplate(t)} testID={`template-chip-${t.name}`} />
          ))}
        </ScrollView>
      ) : null}

      {suggestion ? (
        <View className="mx-5 mt-3 rounded-field bg-sunk px-3.5 py-2.5">
          <Text variant="caption" tone="graphite" numberOfLines={3}>
            {suggestion.item.rawText}
          </Text>
        </View>
      ) : null}

      {/* Amount */}
      <View className="items-center px-5 pb-2 pt-5" testID="amount-display">
        <Text variant="label" tone="mist" tabular numberOfLines={1} className="min-h-5">
          {hasOperator ? form.expr : ' '}
        </Text>
        <View className="flex-row items-baseline">
          <Press onPress={() => setSheet('currency')} hitSlop={10} testID="currency-button" className="mr-2 flex-row items-center rounded-full bg-sunk px-2.5 py-1">
            <Text variant="label" weight="semibold">
              {entryCurrency}
            </Text>
            <Icon name="chevron-down" size={14} tone="graphite" />
          </Press>
          <Money
            minor={txType === 'income' ? enteredMinor : txType === 'expense' ? -enteredMinor : enteredMinor}
            size="hero"
            sign={txType === 'transfer' ? 'never' : 'always'}
            tone={enteredMinor ? (txType === 'income' ? 'income' : 'ink') : 'mist'}
          />
        </View>
        {entryCurrency !== accountCurrency ? (
          <Text variant="label" weight="regular" tone="graphite" tabular className="mt-1" testID="fx-line">
            {rate ? `≈ ${formatMoney(amount, { currency: accountCurrency })} at ${rate.toFixed(rate < 1 ? 4 : 2)}` : 'Fetching today’s rate…'}
          </Text>
        ) : null}
        {existing?.type === 'expense' && paybacks?.length ? (
          <Text variant="label" weight="regular" tone="graphite" tabular className="mt-1" testID="paid-back-line">
            {formatMoney(paybacks.reduce((sum, p) => sum + p.baseAmount, 0))} paid back, it cost you {formatMoney(afterPaybacks(existing, paybacks.reduce((sum, p) => sum + p.baseAmount, 0)))}
          </Text>
        ) : null}
        {form.mode === 'instapay' ? (
          <Press onPress={() => setSheet('fee')} hitSlop={8} testID="fee-line" className="mt-1.5 flex-row items-center">
            <Text variant="label" weight="regular" tone={form.feeOn ? 'graphite' : 'mist'} tabular>
              {form.feeOn
                ? `+ ${formatMoney(fee, { currency: accountCurrency })} InstaPay fee${amount ? `, ${formatMoney(amount + fee, { currency: accountCurrency })} in total` : ''}`
                : 'No fee on this transfer'}
            </Text>
            <View className="ml-1">
              <Icon name="pencil" size={13} tone="mist" />
            </View>
          </Press>
        ) : null}
      </View>

      {/* Details */}
      <ScrollView className="flex-1" keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {form.mode === 'instapay' ? (
          <ToggleRow title="To one of my accounts" value={form.instapayOwn} onChange={(v) => set({ instapayOwn: v })} testID="instapay-own" />
        ) : null}
        <FieldRow
          testID="field-account"
          label={isTransfer ? 'From' : 'Account'}
          value={account?.name}
          needed
          left={account ? <View className="h-2 w-2 rounded-full" style={{ backgroundColor: account.color }} /> : null}
          onPress={() => setSheet('account')}
        />
        {isTransfer ? (
          <FieldRow
            testID="field-to-account"
            label="To"
            value={toAccount?.name}
            needed
            right={toAccount && toAccount.currency !== accountCurrency && toAmount ? <Text variant="caption" tone="graphite" className="ml-2">{formatMoney(toAmount, { currency: toAccount.currency })}</Text> : null}
            onPress={() => setSheet('to')}
          />
        ) : (
          <FieldRow
            testID="field-category"
            label="Category"
            value={category?.name}
            needed
            left={category ? <IconTile icon={category.icon} color={category.color} size={24} /> : null}
            onPress={() => setSheet('category')}
          />
        )}
        {!form.instapayOwn ? (
          <FieldRow
            testID="field-payee"
            label={payeeLabel}
            value={form.payee?.name}
            placeholder={suggestion?.needsPayee ? 'Who did you send it to?' : 'Optional'}
            needed={suggestion?.needsPayee}
            onPress={() => setSheet('payee')}
          />
        ) : null}
        {form.mode === 'income' && !form.debtId ? (
          <FieldRow
            testID="field-pays-back"
            label="Pays back"
            value={reimbursed ? `${recordName(reimbursed, lookups)}, ${formatMoney(-reimbursed.amount, { currency: reimbursed.currency !== settings.baseCurrency ? reimbursed.currency : null })}` : null}
            placeholder="Optional, e.g. a friend’s share"
            onPress={() => setSheet('paysBack')}
          />
        ) : null}
        {form.mode !== 'instapay' && !isTransfer ? (
          <FieldRow testID="field-payment" label="Paid with" value={paymentTypeLabel(paymentType)} onPress={() => setSheet('payment')} />
        ) : null}
        <FieldRow testID="field-date" label="Date" value={`${dayLabel(form.date)}, ${timeLabel(form.date)}`} onPress={() => setSheet('date')} />
        {form.mode !== 'income' && !isTransfer ? (
          <FieldRow
            testID="field-nature"
            label="Counts as"
            value={form.nature ? natureLabel(form.nature) : categoryNature !== 'none' ? `${natureLabel(categoryNature)} (category)` : 'Not set'}
            onPress={() => setSheet('nature')}
          />
        ) : null}
        <FieldRow
          testID="field-note"
          label="Note"
          value={form.note || null}
          placeholder="Optional"
          divider={false}
          onPress={() => {
            setNoteDraft(form.note);
            setSheet('note');
          }}
        />
        {suggestion?.possibleDuplicate ? (
          <View className="mx-5 my-2 rounded-field bg-alert-soft px-4 py-3">
            <Text variant="label" tone="alert">
              Looks like you already logged this
            </Text>
            <Text variant="caption" tone="graphite" className="mt-0.5">
              A {formatMoney(suggestion.possibleDuplicate.amount, { currency: accountCurrency })} record at {timeLabel(suggestion.possibleDuplicate.date)} on the same account.
            </Text>
            <View className="mt-2">
              <Button
                label="Link to that record"
                size="sm"
                variant="secondary"
                onPress={async () => {
                  await linkToExisting(suggestion.item.id, suggestion.possibleDuplicate!.id);
                  toast('Linked to your existing record');
                  goBack();
                }}
              />
            </View>
          </View>
        ) : null}
        {existing?.type === 'expense' && !existing.debtId ? (
          <PaidBackSection
            expense={existing}
            paybacks={paybacks ?? []}
            lookups={lookups}
            onAdd={() => router.push({ pathname: '/add', params: { paysBack: existing.id } })}
            onLink={() => setSheet('linkIncome')}
          />
        ) : null}
      </ScrollView>

      {/* Keypad + save */}
      <View className="border-t border-hairline pt-1">
        <Numpad onKey={onKey} />
        <View className="px-5 pb-1 pt-2">
          <Button label={saving ? 'Saving' : existing ? 'Save changes' : 'Save'} size="lg" full loading={saving} onPress={save} testID="tx-save" haptic="none" />
        </View>
      </View>

      {/* Sheets */}
      <AccountPicker visible={sheet === 'account'} onClose={() => setSheet(null)} selected={form.accountId} onSelect={(id) => set({ accountId: id, paymentType: null })} title={isTransfer ? 'From account' : 'Account'} />
      <AccountPicker visible={sheet === 'to'} onClose={() => setSheet(null)} selected={form.toAccountId} onSelect={(id) => set({ toAccountId: id })} exclude={form.accountId} title="To account" />
      <CategoryPicker visible={sheet === 'category'} onClose={() => setSheet(null)} kind={categoryKind} selected={form.categoryId} onSelect={(id) => set({ categoryId: id })} />
      <PayeePicker
        visible={sheet === 'payee'}
        onClose={() => setSheet(null)}
        selectedName={form.payee?.name ?? null}
        onSelect={onPayee}
        title={payeeLabel}
        suggestions={form.mode === 'instapay' ? instapayRecents : undefined}
      />
      <LinkRecordSheet
        visible={sheet === 'paysBack'}
        onClose={() => setSheet(null)}
        want="expense"
        selected={form.reimbursesId}
        exclude={existing?.id}
        onSelect={(t) => set({ reimbursesId: t.id, categoryId: form.categoryId ?? SYSTEM_CATEGORIES.refunds })}
        onRemove={() => set({ reimbursesId: null })}
      />
      {existing?.type === 'expense' ? (
        <LinkRecordSheet
          visible={sheet === 'linkIncome'}
          onClose={() => setSheet(null)}
          want="income"
          onSelect={(t) => {
            void setPayback(t.id, existing.id).then(
              () => toast('Linked as a payback'),
              (e: unknown) => toast(e instanceof Error ? e.message : 'Couldn’t link that'),
            );
          }}
        />
      ) : null}
      <PaymentTypePicker visible={sheet === 'payment'} onClose={() => setSheet(null)} selected={paymentType} onSelect={(p) => set({ paymentType: p })} />
      <CurrencyPicker visible={sheet === 'currency'} onClose={() => setSheet(null)} selected={entryCurrency} onSelect={(cur) => set({ currency: cur })} />
      <DateTimeSheet visible={sheet === 'date'} value={form.date} onClose={() => setSheet(null)} onChange={(date) => set({ date })} />
      <BottomSheet visible={sheet === 'nature'} onClose={() => setSheet(null)} title="Counts as" subtitle="Decides where this lands in your needs and wants split.">
        {(['need', 'want', 'saving'] as Nature[]).map((n) => (
          <ListRow
            key={n}
            title={natureLabel(n)}
            right={form.nature === n ? <Icon name="check" size={18} tone="accent" /> : null}
            onPress={() => {
              set({ nature: n });
              setSheet(null);
            }}
          />
        ))}
        <ListRow
          title="Use the category’s setting"
          subtitle={category ? `${category.name}: ${natureLabel(categoryNature)}` : undefined}
          right={form.nature == null ? <Icon name="check" size={18} tone="accent" /> : null}
          divider={false}
          onPress={() => {
            set({ nature: null });
            setSheet(null);
          }}
        />
      </BottomSheet>
      <BottomSheet visible={sheet === 'fee'} onClose={() => setSheet(null)} title="InstaPay fee" subtitle={`0.1% of the amount, at least EGP 0.50 and at most EGP 20. For ${formatMoney(amount)} that’s ${formatMoney(autoFee)}.`}>
        <ListRow testID="fee-standard" title={`Standard fee, ${formatMoney(autoFee)}`} right={form.feeOn && form.feeOverride == null ? <Icon name="check" size={18} tone="accent" /> : null} onPress={() => { set({ feeOn: true, feeOverride: null }); setSheet(null); }} />
        <ListRow title="No fee this time" subtitle="For example during a fee-free holiday period" right={!form.feeOn ? <Icon name="check" size={18} tone="accent" /> : null} onPress={() => { set({ feeOn: false, feeOverride: null }); setSheet(null); }} testID="fee-none" />
        <TextField
          label="A different fee"
          value={customFee}
          onChangeText={setCustomFee}
          keyboardType="decimal-pad"
          placeholder={form.feeOverride != null ? (form.feeOverride / 100).toFixed(2) : '0.00'}
          right={<Text variant="label" tone="graphite">{accountCurrency}</Text>}
          testID="fee-custom"
        />
        <View className="px-5 pt-1">
          <Button
            label="Use this fee"
            variant="secondary"
            full
            disabled={parseAmount(customFee) == null}
            onPress={() => {
              const v = parseAmount(customFee);
              if (v == null) return;
              set({ feeOn: v > 0, feeOverride: v });
              setCustomFee('');
              setSheet(null);
            }}
            testID="fee-custom-save"
          />
        </View>
      </BottomSheet>
      <BottomSheet
        visible={sheet === 'note'}
        onClose={() => setSheet(null)}
        title="Note"
        testID="note-sheet"
        footer={
          <Button
            label="Done"
            size="lg"
            full
            onPress={() => {
              set({ note: noteDraft.trim() });
              setSheet(null);
            }}
            testID="note-done"
          />
        }
      >
        <TextField value={noteDraft} onChangeText={setNoteDraft} placeholder="What was it for?" autoFocus multiline testID="note-input" />
      </BottomSheet>
      <BottomSheet visible={sheet === 'menu'} onClose={() => setSheet(null)} title="Options">
        <ListRow
          title="Save as template"
          left={<Icon name="sparkle" size={20} />}
          onPress={() => {
            setTemplateName('');
            setSheet('template');
          }}
          testID="menu-template"
        />
        {existing?.type === 'expense' && !existing.debtId ? (
          <>
            <ListRow
              title="Add a payback"
              subtitle="Money a friend sent you back for this"
              left={<Icon name="undo-2" size={20} />}
              onPress={() => {
                setSheet(null);
                router.push({ pathname: '/add', params: { paysBack: existing.id } });
              }}
              testID="menu-add-payback"
            />
            <ListRow title="Link a payback I already logged" left={<Icon name="link" size={20} />} onPress={() => setSheet('linkIncome')} testID="menu-link-payback" />
          </>
        ) : null}
        {existing ? <ListRow title="Delete record" destructive left={<Icon name="trash" size={20} tone="danger" />} onPress={() => { setSheet(null); void remove(); }} testID="menu-delete" /> : null}
      </BottomSheet>
      <BottomSheet
        visible={sheet === 'template'}
        onClose={() => setSheet(null)}
        title="Name this template"
        subtitle="It appears as a shortcut at the top of this screen."
        scroll={false}
        testID="template-name-sheet"
        footer={<Button label="Save template" size="lg" full onPress={() => void saveAsTemplate()} disabled={!templateName.trim()} testID="template-name-save" />}
      >
        <TextField value={templateName} onChangeText={setTemplateName} placeholder="e.g. Morning coffee" autoFocus returnKeyType="done" onSubmitEditing={() => void saveAsTemplate()} testID="template-name-input" />
      </BottomSheet>
    </Screen>
  );
}

/** On a saved expense: what friends paid back, and what it cost you after that. */
function PaidBackSection({
  expense,
  paybacks,
  lookups,
  onAdd,
  onLink,
}: {
  expense: Transaction;
  paybacks: TxListItem[];
  lookups: RowLookups;
  onAdd: () => void;
  onLink: () => void;
}) {
  const back = paybacks.reduce((sum, p) => sum + p.baseAmount, 0);
  return (
    <View className="mx-5 mb-3 mt-2 rounded-field bg-sunk px-4 py-3" testID="paid-back">
      <Text variant="label" tone="graphite">
        Paid back
      </Text>
      {paybacks.length ? (
        <>
          {paybacks.map((p) => (
            <Press
              key={p.id}
              onPress={() => router.push({ pathname: '/add', params: { id: p.id } })}
              dim={0.6}
              className="mt-2 flex-row items-center justify-between"
              testID={`paid-back-${p.id}`}
            >
              <Text variant="body" numberOfLines={1} className="mr-3 flex-shrink">
                {p.payeeId ? (lookups.payees.get(p.payeeId)?.name ?? 'Someone') : 'Someone'}, {dayLabel(p.date)}
              </Text>
              <Money minor={p.amount} currency={p.currency} colorIncome sign="always" size="sm" />
            </Press>
          ))}
          <Text variant="label" weight="regular" tone="ink" tabular className="mt-2.5" testID="paid-back-net">
            It cost you {formatMoney(afterPaybacks(expense, back))} after {formatMoney(back)} came back.
          </Text>
        </>
      ) : (
        <Text variant="caption" tone="graphite" className="mt-1">
          Paid for friends too? Link the money they send back, and this counts only your share in your spending.
        </Text>
      )}
      <View className="mt-3 flex-row gap-2">
        <Button label="Add a payback" icon="plus" size="sm" variant="secondary" onPress={onAdd} testID="paid-back-add" />
        <Button label="Link one I logged" size="sm" variant="ghost" onPress={onLink} testID="paid-back-link" />
      </View>
    </View>
  );
}

export function natureLabel(n: Nature): string {
  return n === 'need' ? 'Need' : n === 'want' ? 'Want' : n === 'saving' ? 'Saving' : 'Not set';
}

/** Editing a record that came from a bank SMS: renaming its payee offers the same alias choice. */
async function maybeAliasForEdit(t: Transaction, payeeId: ID | null, name: string | null) {
  if (!payeeId || !name || !t.sourceRef || t.payeeId === payeeId) return;
  const item = await getInboxItem(t.sourceRef);
  const raw = item?.parsed?.counterparty;
  if (!raw) return;
  const decision = await askAlias(raw, name, true);
  if (decision?.always) await setAlias(raw, payeeId, { relabelPast: decision.relabelPast });
}
