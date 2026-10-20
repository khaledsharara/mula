import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { FieldRow } from '../../transactions/components/FieldRow';
import { AccountPicker, CategoryPicker, PayeePicker, type PayeeChoice } from '../../transactions/components/Pickers';
import { TransactionRow } from '../../transactions/components/TransactionRow';
import { useTransactions } from '../../transactions/data/transactionsRepo';
import { useLookups } from '../../transactions/data/useLookups';
import { Button, IconButton } from '../../shared/components/Button';
import { confirm, toast } from '../../shared/components/Feedback';
import { TextField, ToggleRow } from '../../shared/components/Fields';
import { ListRow, Section } from '../../shared/components/List';
import { EmptyState, IconTile } from '../../shared/components/Misc';
import { SegmentedControl } from '../../shared/components/SegmentedControl';
import { Text } from '../../shared/components/Text';
import type { CategoryKind, ID, PayeeKind } from '../../shared/db/types';
import { Screen } from '../../shared/layouts/Screen';
import { shortDate } from '../../shared/utils/dates';
import { plural } from '../../shared/utils/text';
import { PayeeAvatar } from '../components/PayeeAvatar';
import {
  deletePayee,
  findPayeeByName,
  mergePayees,
  removeAlias,
  updatePayee,
  usePayee,
  usePayeeAliases,
  usePayeeUsage,
} from '../data/payeesRepo';
import { goBack } from '../../shared/utils/nav';

type Form = { name: string; kind: PayeeKind; categoryId: ID | null; accountId: ID | null; autoConfirm: boolean };

const KINDS: { value: PayeeKind; label: string }[] = [
  { value: 'person', label: 'Person' },
  { value: 'merchant', label: 'Place' },
];

const RECENT_LIMIT = 30;

/** Lets one bottom sheet finish sliding away before the next one opens. */
const afterSheet = () => new Promise<void>((resolve) => setTimeout(resolve, 260));

export default function PayeeDetailPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: payee, loading } = usePayee(id);
  const { data: aliases } = usePayeeAliases(id);
  const { data: usage } = usePayeeUsage(id);
  const { data: txs } = useTransactions({ payeeId: id, limit: RECENT_LIMIT }, [id]);
  const lookups = useLookups();

  const [form, setForm] = useState<Form | null>(null);
  const [formFor, setFormFor] = useState<ID | null>(null);
  const [sheet, setSheet] = useState<null | 'category' | 'account' | 'merge'>(null);
  const [saving, setSaving] = useState(false);

  // Fill the form once per payee; later refreshes (e.g. a new record) don't overwrite edits.
  useEffect(() => {
    if (!payee || formFor === payee.id) return;
    setForm({
      name: payee.name,
      kind: payee.kind,
      categoryId: payee.defaultCategoryId,
      accountId: payee.defaultAccountId,
      autoConfirm: payee.autoConfirm,
    });
    setFormFor(payee.id);
  }, [payee, formFor]);

  const set = (patch: Partial<Form>) => setForm((f) => (f ? { ...f, ...patch } : f));

  if (!payee || !form) {
    return (
      <Screen title="Payee" back testID="payee-detail">
        {payee === null && !loading ? <EmptyState icon="users" title="Payee not found" body="They may have been merged into someone else or deleted." /> : <View />}
      </Screen>
    );
  }

  const category = form.categoryId ? lookups.categories.get(form.categoryId) : undefined;
  const account = form.accountId ? lookups.accounts.get(form.accountId) : undefined;
  const records = txs ?? [];
  const incomeCount = records.filter((t) => t.type === 'income').length;
  const expenseCount = records.filter((t) => t.type === 'expense').length;
  // Offer income categories for someone who mostly pays you; expense otherwise.
  const categoryKind: CategoryKind = category?.kind ?? (incomeCount > expenseCount ? 'income' : 'expense');
  const canAuto = Boolean(form.categoryId);
  const aliasList = aliases ?? [];
  const recordCount = usage?.records ?? 0;
  const latest = records[0]?.date;
  const usageLine = recordCount ? `${plural(recordCount, 'record')}${latest ? `, latest on ${shortDate(latest)}` : ''}` : 'No records yet';

  const save = async () => {
    const name = form.name.trim();
    if (!name) return toast('Give them a name');
    const clash = await findPayeeByName(name);
    if (clash && clash.id !== payee.id) return toast(`${clash.name} already exists. Merge into them instead.`);
    setSaving(true);
    try {
      await updatePayee({
        id: payee.id,
        name,
        kind: form.kind,
        defaultCategoryId: form.categoryId,
        defaultAccountId: form.accountId,
        autoConfirm: canAuto && form.autoConfirm,
        note: payee.note,
      });
      toast('Payee updated');
      goBack();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Couldn’t save the payee');
    } finally {
      setSaving(false);
    }
  };

  const removeName = async (raw: string) => {
    const ok = await confirm({
      title: 'Remove this bank name?',
      message: `Messages that say “${raw}” won’t be filed under ${payee.name} automatically anymore.`,
      confirmLabel: 'Remove name',
      destructive: true,
    });
    if (!ok) return;
    await removeAlias(raw);
    toast('Bank name removed');
  };

  const mergeInto = async (choice: PayeeChoice | null) => {
    if (!choice) return;
    if (!choice.payeeId) return toast('Pick someone already in your list');
    if (choice.payeeId === payee.id) return toast('Pick a different payee');
    const targetId = choice.payeeId;
    const targetName = lookups.payees.get(targetId)?.name ?? choice.name;
    await afterSheet();
    const ok = await confirm({
      title: `Merge into ${targetName}?`,
      message: `${payee.name}’s records, bank names and debts move to ${targetName}, and ${payee.name} is removed. This can’t be undone.`,
      confirmLabel: 'Merge payees',
      destructive: true,
    });
    if (!ok) return;
    await mergePayees(payee.id, targetId);
    toast(`Merged into ${targetName}`);
    goBack();
  };

  const remove = async () => {
    if (usage?.debts) {
      toast(`${payee.name} has ${plural(usage.debts, 'debt')}. Merge them into another payee instead.`);
      return;
    }
    const ok = await confirm({
      title: `Delete ${payee.name}?`,
      message: recordCount
        ? `Their ${plural(recordCount, 'record')} stay, just without a payee. Bank names linked to them are forgotten.`
        : 'Bank names linked to them are forgotten.',
      confirmLabel: 'Delete payee',
      destructive: true,
    });
    if (!ok) return;
    await deletePayee(payee.id);
    toast('Payee deleted');
    goBack();
  };

  return (
    <Screen
      title={payee.name}
      back
      testID="payee-detail"
      footer={<Button label="Save changes" size="lg" full loading={saving} onPress={save} testID="payee-save" />}
    >
      <View className="items-center pb-1 pt-3">
        <PayeeAvatar payee={{ name: form.name || payee.name, kind: form.kind }} size={64} />
        <Text variant="label" weight="regular" tone="graphite" tabular className="mt-2.5">
          {usageLine}
        </Text>
      </View>

      <TextField label="Name" value={form.name} onChangeText={(name) => set({ name })} placeholder="Their name" autoCorrect={false} testID="payee-name" />
      <View className="px-5 pt-2">
        <SegmentedControl testID="payee-kind" options={KINDS} value={form.kind} onChange={(kind) => set({ kind })} />
      </View>

      <Section title="Defaults" footer="Filled in on new records with them. Mula updates these as you log.">
        <FieldRow
          testID="payee-category"
          label="Usual category"
          value={category?.name ?? null}
          placeholder="None"
          left={category ? <IconTile icon={category.icon} color={category.color} size={24} /> : null}
          right={
            category ? (
              <View className="ml-1">
                <IconButton icon="x" label="Clear usual category" size={28} tone="mist" onPress={() => set({ categoryId: null, autoConfirm: false })} testID="payee-category-clear" />
              </View>
            ) : null
          }
          onPress={() => setSheet('category')}
        />
        <FieldRow
          testID="payee-account"
          label="Usual account"
          value={account?.name ?? null}
          placeholder="None"
          left={account ? <View className="h-2 w-2 rounded-full" style={{ backgroundColor: account.color }} /> : null}
          right={
            account ? (
              <View className="ml-1">
                <IconButton icon="x" label="Clear usual account" size={28} tone="mist" onPress={() => set({ accountId: null })} testID="payee-account-clear" />
              </View>
            ) : null
          }
          onPress={() => setSheet('account')}
          divider={false}
        />
      </Section>

      <Section footer={canAuto ? undefined : 'Choose a usual category first, so Mula knows where to file their messages.'}>
        <View style={{ pointerEvents: canAuto ? 'auto' : 'none', opacity: canAuto ? 1 : 0.45 }} accessibilityState={{ disabled: !canAuto }}>
          <ToggleRow
            title="Log their bank messages without asking"
            subtitle="New messages from them are saved straight away with the usual category, instead of waiting in your inbox."
            value={canAuto && form.autoConfirm}
            onChange={(autoConfirm) => set({ autoConfirm })}
            divider={false}
            testID="payee-auto-confirm"
          />
        </View>
      </Section>

      <Section
        title="Names your bank uses"
        footer={
          aliasList.length
            ? `Bank messages with these names are filed under ${payee.name}.`
            : 'None yet. When you rename a sender while confirming a bank message, the bank’s name for them is kept here.'
        }
      >
        {aliasList.map((raw, i) => (
          <ListRow
            key={raw}
            testID={`payee-alias-${i}`}
            title={raw}
            right={<IconButton icon="x" label={`Remove ${raw}`} size={32} tone="graphite" onPress={() => void removeName(raw)} testID={`payee-alias-remove-${i}`} />}
            divider={i < aliasList.length - 1}
          />
        ))}
      </Section>

      <Section title="Recent records" footer={records.length >= RECENT_LIMIT ? `Showing the latest ${RECENT_LIMIT}.` : undefined}>
        {records.length ? (
          records.map((tx, i) => (
            <TransactionRow
              key={tx.id}
              tx={tx}
              lookups={lookups}
              onPress={() => router.push({ pathname: '/add', params: { id: tx.id } })}
              divider={i < records.length - 1}
            />
          ))
        ) : (
          <Text variant="label" weight="regular" tone="mist" className="px-5">
            No records with them yet.
          </Text>
        )}
      </Section>

      <View className="mt-8 px-5">
        <Button label="Merge into another payee" variant="secondary" full onPress={() => setSheet('merge')} testID="payee-merge" />
        <Text variant="caption" tone="mist" className="mt-2 text-center">
          For when the same person or place shows up under two names.
        </Text>
        <View className="mt-5">
          <Button label="Delete payee" variant="danger" full onPress={remove} testID="payee-delete" />
        </View>
      </View>

      <CategoryPicker
        visible={sheet === 'category'}
        onClose={() => setSheet(null)}
        kind={categoryKind}
        selected={form.categoryId}
        onSelect={(categoryId) => set({ categoryId })}
      />
      <AccountPicker
        visible={sheet === 'account'}
        onClose={() => setSheet(null)}
        selected={form.accountId}
        onSelect={(accountId) => set({ accountId })}
        title="Usual account"
      />
      <PayeePicker
        visible={sheet === 'merge'}
        onClose={() => setSheet(null)}
        selectedName={null}
        onSelect={(choice) => void mergeInto(choice)}
        title={`Merge ${payee.name} into`}
      />
    </Screen>
  );
}
