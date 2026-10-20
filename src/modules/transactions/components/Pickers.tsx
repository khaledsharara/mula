import { useMemo, useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';

import { useAccounts, useBalances } from '../../accounts/data/accountsRepo';
import { buildTree, useCategories } from '../../categories/data/categoriesRepo';
import { usePayees } from '../../payees/data/payeesRepo';
import { BottomSheet } from '../../shared/components/BottomSheet';
import { Icon } from '../../shared/components/Icon';
import { Divider, ListRow } from '../../shared/components/List';
import { Avatar, IconTile } from '../../shared/components/Misc';
import { Money } from '../../shared/components/Money';
import { Press } from '../../shared/components/Press';
import { Text } from '../../shared/components/Text';
import type { Category, CategoryKind, ID, Payee, PaymentType } from '../../shared/db/types';
import { useTheme } from '../../shared/theme/ThemeProvider';
import { CURRENCIES, CURRENCY_NAMES } from '../../shared/utils/money';
import { matches } from '../../shared/utils/text';
import { PAYMENT_TYPES } from '../types';
import { noOutline } from '../../shared/utils/styles';

function SearchBox({ value, onChange, placeholder, autoFocus }: { value: string; onChange: (v: string) => void; placeholder: string; autoFocus?: boolean }) {
  const { c } = useTheme();
  return (
    <View className="mx-5 mb-2 h-11 flex-row items-center rounded-field bg-sunk px-3.5">
      <Icon name="search" size={17} tone="mist" />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={c.mist}
        selectionColor={c.accent}
        autoFocus={autoFocus}
        autoCorrect={false}
        className="ml-2 flex-1 font-regular text-body text-ink"
        style={noOutline}
        testID="picker-search"
      />
    </View>
  );
}

/* ---------- Account ---------- */

export function AccountPicker({
  visible,
  onClose,
  selected,
  onSelect,
  exclude,
  title = 'Account',
}: {
  visible: boolean;
  onClose: () => void;
  selected: ID | null | undefined;
  onSelect: (id: ID) => void;
  exclude?: ID | null;
  title?: string;
}) {
  const { data: accounts } = useAccounts();
  const { data: balances } = useBalances();
  return (
    <BottomSheet visible={visible} onClose={onClose} title={title} testID="account-picker">
      {(accounts ?? [])
        .filter((a) => a.id !== exclude)
        .map((a, i, arr) => (
          <ListRow
            key={a.id}
            testID={`account-option-${a.name}`}
            title={a.name}
            subtitle={a.currency}
            left={<IconTile icon={a.icon} color={a.color} size={36} />}
            right={
              <View className="flex-row items-center">
                <Money minor={balances?.[a.id] ?? 0} size="sm" />
                {a.id === selected ? (
                  <View className="ml-2">
                    <Icon name="check" size={18} tone="accent" />
                  </View>
                ) : null}
              </View>
            }
            divider={i < arr.length - 1}
            onPress={() => {
              onSelect(a.id);
              onClose();
            }}
          />
        ))}
    </BottomSheet>
  );
}

/* ---------- Category ---------- */

export function CategoryPicker({
  visible,
  onClose,
  kind,
  selected,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  kind: CategoryKind;
  selected: ID | null | undefined;
  onSelect: (id: ID) => void;
}) {
  const { data: categories } = useCategories();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<ID | null>(null);
  const tree = useMemo(() => buildTree(categories ?? [], kind), [categories, kind]);

  const pick = (id: ID) => {
    onSelect(id);
    setQuery('');
    setOpen(null);
    onClose();
  };

  const results: Category[] = query.trim()
    ? (categories ?? []).filter((c) => c.kind === kind && matches(c.name, query))
    : [];

  const openGroup = tree.find((g) => g.parent.id === open);

  return (
    <BottomSheet
      visible={visible}
      onClose={() => {
        setOpen(null);
        setQuery('');
        onClose();
      }}
      title={openGroup ? openGroup.parent.name : 'Category'}
      tall
      testID="category-picker"
    >
      {!openGroup ? <SearchBox value={query} onChange={setQuery} placeholder="Search categories" /> : null}
      {query.trim() ? (
        results.map((c) => (
          <ListRow
            key={c.id}
            title={c.name}
            subtitle={c.parentId ? (categories ?? []).find((p) => p.id === c.parentId)?.name : null}
            left={<IconTile icon={c.icon} color={c.color} size={34} />}
            onPress={() => pick(c.id)}
          />
        ))
      ) : openGroup ? (
        <View>
          <Press onPress={() => setOpen(null)} className="flex-row items-center px-5 pb-2" hitSlop={8}>
            <Icon name="chevron-left" size={16} tone="accent" />
            <Text variant="label" tone="accent" className="ml-1">
              All categories
            </Text>
          </Press>
          <ListRow
            title={`${openGroup.parent.name} (general)`}
            left={<IconTile icon={openGroup.parent.icon} color={openGroup.parent.color} size={34} />}
            right={openGroup.parent.id === selected ? <Icon name="check" size={18} tone="accent" /> : null}
            onPress={() => pick(openGroup.parent.id)}
          />
          {openGroup.children.map((c, i) => (
            <ListRow
              key={c.id}
              testID={`category-option-${c.name}`}
              title={c.name}
              left={<IconTile icon={c.icon} color={c.color} size={34} />}
              right={c.id === selected ? <Icon name="check" size={18} tone="accent" /> : null}
              divider={i < openGroup.children.length - 1}
              onPress={() => pick(c.id)}
            />
          ))}
        </View>
      ) : (
        <View className="flex-row flex-wrap px-3 pt-1">
          {tree.map(({ parent, children }) => {
            const active = parent.id === selected || children.some((c) => c.id === selected);
            return (
              <Press
                key={parent.id}
                testID={`category-group-${parent.name}`}
                onPress={() => (children.length ? setOpen(parent.id) : pick(parent.id))}
                haptic="select"
                className="items-center py-2.5"
                style={{ width: '25%', paddingHorizontal: 1 }}
              >
                <View className={`rounded-full p-0.5 ${active ? 'border-2 border-accent' : 'border-2 border-transparent'}`}>
                  <IconTile icon={parent.icon} color={parent.color} size={48} />
                </View>
                <Text variant="caption" className="mt-1.5 text-center" numberOfLines={2} style={{ fontSize: 11.5, letterSpacing: -0.1 }}>
                  {parent.name}
                </Text>
              </Press>
            );
          })}
        </View>
      )}
    </BottomSheet>
  );
}

/* ---------- Payee ---------- */

export type PayeeChoice = { payeeId: ID | null; name: string };

export function PayeePicker({
  visible,
  onClose,
  selectedName,
  onSelect,
  title,
  suggestions,
}: {
  visible: boolean;
  onClose: () => void;
  selectedName: string | null;
  onSelect: (choice: PayeeChoice | null) => void;
  title: string;
  /** Chips shown first, e.g. recent InstaPay recipients. */
  suggestions?: Payee[];
}) {
  const { data: payees } = usePayees();
  const [query, setQuery] = useState('');
  const q = query.trim();
  const list = (payees ?? []).filter((p) => !q || matches(p.name, q)).slice(0, 60);
  const exact = (payees ?? []).some((p) => p.name.toLowerCase() === q.toLowerCase());

  const choose = (choice: PayeeChoice | null) => {
    onSelect(choice);
    setQuery('');
    onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={() => { setQuery(''); onClose(); }} title={title} tall testID="payee-picker">
      <SearchBox value={query} onChange={setQuery} placeholder="Name of a person or place" autoFocus />
      {q && !exact ? (
        <ListRow
          testID="payee-create"
          title={`Add “${q}”`}
          subtitle="Saved so you can pick it next time"
          left={
            <View className="h-9 w-9 items-center justify-center rounded-full bg-accent-soft">
              <Icon name="plus" size={18} tone="accent" />
            </View>
          }
          onPress={() => choose({ payeeId: null, name: q })}
        />
      ) : null}
      {!q && suggestions?.length ? (
        <View className="pb-2">
          <Text variant="label" tone="graphite" className="px-5 pb-2">
            Recent
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
            {suggestions.map((p) => (
              <Press key={p.id} onPress={() => choose({ payeeId: p.id, name: p.name })} haptic="select" className="min-h-9 justify-center rounded-full bg-sunk px-3.5 py-1">
                <Text variant="label">{p.name}</Text>
              </Press>
            ))}
          </ScrollView>
          <Divider inset={0} />
        </View>
      ) : null}
      {list.map((p, i) => (
        <ListRow
          key={p.id}
          testID={`payee-option-${p.name}`}
          title={p.name}
          left={p.kind === 'person' ? <Avatar name={p.name} size={36} /> : <IconTile icon="store" size={36} muted />}
          right={p.name === selectedName ? <Icon name="check" size={18} tone="accent" /> : null}
          divider={i < list.length - 1}
          onPress={() => choose({ payeeId: p.id, name: p.name })}
        />
      ))}
      {selectedName ? (
        <ListRow title="Clear" destructive divider={false} onPress={() => choose(null)} />
      ) : null}
    </BottomSheet>
  );
}

/* ---------- Payment type ---------- */

export function PaymentTypePicker({ visible, onClose, selected, onSelect }: { visible: boolean; onClose: () => void; selected: PaymentType; onSelect: (p: PaymentType) => void }) {
  return (
    <BottomSheet visible={visible} onClose={onClose} title="Payment type" testID="payment-picker">
      {PAYMENT_TYPES.map((p, i) => (
        <ListRow
          key={p.value}
          testID={`payment-option-${p.value}`}
          title={p.label}
          left={<IconTile icon={p.icon} size={34} muted />}
          right={p.value === selected ? <Icon name="check" size={18} tone="accent" /> : null}
          divider={i < PAYMENT_TYPES.length - 1}
          onPress={() => {
            onSelect(p.value);
            onClose();
          }}
        />
      ))}
    </BottomSheet>
  );
}

/* ---------- Currency ---------- */

export function CurrencyPicker({ visible, onClose, selected, onSelect }: { visible: boolean; onClose: () => void; selected: string; onSelect: (c: string) => void }) {
  return (
    <BottomSheet visible={visible} onClose={onClose} title="Currency" subtitle="Amounts in another currency are converted at today’s rate." testID="currency-picker">
      {CURRENCIES.map((code, i) => (
        <ListRow
          key={code}
          testID={`currency-option-${code}`}
          title={code}
          subtitle={CURRENCY_NAMES[code]}
          right={code === selected ? <Icon name="check" size={18} tone="accent" /> : null}
          divider={i < CURRENCIES.length - 1}
          onPress={() => {
            onSelect(code);
            onClose();
          }}
        />
      ))}
    </BottomSheet>
  );
}
