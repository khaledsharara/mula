import { useEffect, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { saveAccount, useAccounts } from '../../accounts/data/accountsRepo';
import { useCategories } from '../../categories/data/categoriesRepo';
import { recentInstapayPayees } from '../../payees/data/payeesRepo';
import { AccountPicker, CategoryPicker, PayeePicker, type PayeeChoice } from '../../transactions/components/Pickers';
import { Chip } from '../../shared/components/Chip';
import { toast } from '../../shared/components/Feedback';
import { Icon } from '../../shared/components/Icon';
import { IconTile } from '../../shared/components/Misc';
import { Money } from '../../shared/components/Money';
import { Press } from '../../shared/components/Press';
import { Text } from '../../shared/components/Text';
import type { Account, ID, Payee } from '../../shared/db/types';
import { ageLabel, dayLabel, timeLabel } from '../../shared/utils/dates';
import { useSettings } from '../../shared/settings/settingsStore';
import { formatMoney } from '../../shared/utils/money';
import { normalizeRaw } from '../../shared/utils/text';
import { useFrequentCategories } from '../data/quickCategories';
import type { Suggestion } from '../data/inboxRepo';
import { SMS_KIND_LABEL } from '../utils/parser';

export type CardChoice = {
  categoryId: ID | null;
  payee: PayeeChoice | null;
  account: Account | null;
};

type Props = {
  s: Suggestion;
  choice: CardChoice;
  onChange: (c: CardChoice) => void;
};

/** One detected payment, with just enough controls to finish it in a tap or two. */
export function ReviewCard({ s, choice, onChange }: Props) {
  const p = s.item.parsed;
  const { data: categories } = useCategories(true);
  const base = useSettings((st) => st.baseCurrency);
  const { data: accounts } = useAccounts();
  const isTransfer = s.draft.type === 'transfer';
  const kind = s.draft.type === 'income' ? 'income' : 'expense';
  const { data: frequent } = useFrequentCategories(kind);
  const [sheet, setSheet] = useState<null | 'category' | 'payee' | 'account'>(null);
  const [recents, setRecents] = useState<Payee[]>([]);
  const [showRaw, setShowRaw] = useState(false);
  const byId = useMemo(() => new Map((categories ?? []).map((c) => [c.id, c])), [categories]);

  useEffect(() => {
    if (s.needsPayee) void recentInstapayPayees(6).then(setRecents);
  }, [s.needsPayee]);

  const quick = (frequent ?? []).map((id) => byId.get(id)).filter((c): c is NonNullable<typeof c> => Boolean(c));
  if (choice.categoryId && !quick.some((q) => q.id === choice.categoryId)) {
    const cur = byId.get(choice.categoryId);
    if (cur) quick.unshift(cur);
  }

  const fallback = s.item.source === 'claude' ? (s.draft.type === 'income' ? 'Income' : 'Expense') : p ? SMS_KIND_LABEL[p.kind] : 'Bank message';
  const title = s.item.source === 'recurring' ? s.item.rawText : (choice.payee?.name ?? fallback);
  const signed = s.draft.type === 'expense' ? -s.draft.amount : s.draft.amount;
  const label =
    s.item.source === 'recurring'
      ? 'Planned payment'
      : s.item.source === 'applepay'
        ? 'Apple Pay'
        : s.item.source === 'claude'
          ? 'From Claude'
          : p
            ? SMS_KIND_LABEL[p.kind]
            : 'Bank message';

  const pickAccount = async (account: Account) => {
    onChange({ ...choice, account });
    // Learn the card/account digits (or the Wallet card's name) so the next one lands right.
    if (p?.last4 && !account.identifiers.includes(p.last4)) {
      await saveAccount({ ...account, identifiers: [...account.identifiers, p.last4] });
      toast(`${account.name} will catch messages ending ${p.last4}`);
    } else if (!p?.last4 && p?.accountHint && s.item.source === 'applepay') {
      const hint = p.accountHint.trim();
      if (hint && !account.identifiers.some((i) => i.toLowerCase() === hint.toLowerCase())) {
        await saveAccount({ ...account, identifiers: [...account.identifiers, hint] });
        toast(`${account.name} will catch Apple Pay on “${hint}”`);
      }
    }
  };

  return (
    <View className="flex-1 rounded-sheet bg-sheet px-5 pb-4 pt-5" testID="review-card">
      <View className="flex-row items-center justify-between">
        <Text variant="label" tone="graphite">
          {label}
        </Text>
        <Text variant="caption" tone="mist">
          {ageLabel(s.item.receivedAt)} ago
        </Text>
      </View>

      <Press onPress={() => !isTransfer && setSheet('payee')} disabled={isTransfer} dim={0.6} className="mt-3 flex-row items-center" testID="review-payee">
        <Text variant="title" numberOfLines={2} className="flex-shrink">
          {isTransfer ? `${choice.account?.name ?? 'Account'} to ${s.toAccount?.name ?? 'Cash'}` : title}
        </Text>
        {!isTransfer ? (
          <View className="ml-2">
            <Icon name="pencil" size={15} tone="mist" />
          </View>
        ) : null}
      </Press>
      {s.rawName && choice.payee?.name && normalizeRaw(choice.payee.name) !== normalizeRaw(s.rawName) ? (
        <Text variant="caption" tone="mist" className="mt-0.5" numberOfLines={1}>
          Bank name: {s.rawName}
        </Text>
      ) : null}

      <View className="mt-4">
        {s.unconverted ? (
          <Money
            minor={s.draft.type === 'expense' ? -s.unconverted.amount : s.unconverted.amount}
            size="display"
            colorIncome={s.draft.type === 'income'}
            sign={isTransfer ? 'never' : 'always'}
            currency={s.unconverted.currency}
            showCurrency
          />
        ) : (
          <Money
            minor={signed}
            size="display"
            colorIncome={s.draft.type === 'income'}
            sign={isTransfer ? 'never' : 'always'}
            currency={choice.account?.currency}
            showCurrency={Boolean(choice.account && choice.account.currency !== base)}
          />
        )}
        <Text variant="label" weight="regular" tone="graphite" className="mt-1" tabular>
          {dayLabel(s.draft.date)}, {timeLabel(s.draft.date)}
          {s.original ? `, paid ${formatMoney(s.original.amount, { currency: s.original.currency })}` : ''}
          {s.unconverted ? `, converted to ${choice.account?.currency ?? 'the account’s currency'} once a rate is available` : ''}
          {s.draft.fee ? `, plus ${formatMoney(s.draft.fee)} InstaPay fee` : ''}
        </Text>
      </View>

      <Press onPress={() => setSheet('account')} dim={0.6} className="mt-4 flex-row items-center self-start rounded-full bg-sunk px-3 py-1.5" testID="review-account">
        {choice.account ? <View className="mr-2 h-2 w-2 rounded-full" style={{ backgroundColor: choice.account.color }} /> : null}
        <Text variant="label" tone={choice.account ? 'ink' : 'accent'}>
          {choice.account ? choice.account.name : p?.last4 ? `Which account ends ${p.last4}?` : 'Choose an account'}
        </Text>
        <Icon name="chevron-down" size={14} tone="graphite" />
      </Press>

      {s.needsPayee ? (
        <View className="mt-5">
          <Text variant="label" tone="accent">
            Who did you send it to?
          </Text>
          <View className="mt-2 flex-row flex-wrap gap-2">
            {recents.map((r) => (
              <Chip key={r.id} label={r.name} selected={choice.payee?.payeeId === r.id} onPress={() => onChange({ ...choice, payee: { payeeId: r.id, name: r.name } })} />
            ))}
            <Chip label="Someone else" icon="plus" onPress={() => setSheet('payee')} testID="review-someone-else" />
          </View>
        </View>
      ) : null}

      {!isTransfer ? (
        <View className="mt-5 flex-1">
          <Text variant="label" tone={choice.categoryId ? 'graphite' : 'accent'}>
            {choice.categoryId ? 'Category' : 'Pick a category'}
          </Text>
          <ScrollView className="mt-2" showsVerticalScrollIndicator={false}>
            <View className="flex-row flex-wrap gap-2">
              {quick.slice(0, 9).map((cat) => (
                <Press
                  key={cat.id}
                  onPress={() => onChange({ ...choice, categoryId: cat.id })}
                  haptic="select"
                  testID={`review-cat-${cat.name}`}
                  className={`min-h-9 flex-row items-center rounded-full py-0.5 pl-1 pr-3 ${choice.categoryId === cat.id ? 'bg-ink' : 'bg-sunk'}`}
                >
                  <IconTile icon={cat.icon} color={cat.color} size={28} />
                  <Text variant="label" tone={choice.categoryId === cat.id ? 'paper' : 'ink'} className="ml-1.5" numberOfLines={1}>
                    {cat.name}
                  </Text>
                </Press>
              ))}
              <Chip label="More" icon="ellipsis" onPress={() => setSheet('category')} testID="review-cat-more" />
            </View>
          </ScrollView>
        </View>
      ) : (
        <View className="flex-1" />
      )}

      {s.item.source !== 'recurring' ? (
        <Press onPress={() => setShowRaw((v) => !v)} className="mt-3" hitSlop={6} testID="review-raw">
          <Text variant="caption" tone="mist" numberOfLines={showRaw ? undefined : 1}>
            {s.item.rawText}
          </Text>
        </Press>
      ) : null}

      <CategoryPicker visible={sheet === 'category'} onClose={() => setSheet(null)} kind={kind} selected={choice.categoryId} onSelect={(id) => onChange({ ...choice, categoryId: id })} />
      <PayeePicker
        visible={sheet === 'payee'}
        onClose={() => setSheet(null)}
        selectedName={choice.payee?.name ?? null}
        title={s.draft.type === 'income' ? 'From' : 'Paid to'}
        suggestions={s.needsPayee ? recents : undefined}
        onSelect={(payee) => onChange({ ...choice, payee })}
      />
      <AccountPicker
        visible={sheet === 'account'}
        onClose={() => setSheet(null)}
        selected={choice.account?.id}
        onSelect={(id) => {
          const a = accounts?.find((x) => x.id === id);
          if (a) void pickAccount(a);
        }}
      />
    </View>
  );
}
