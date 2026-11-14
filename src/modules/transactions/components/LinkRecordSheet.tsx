import { useState } from 'react';
import { View } from 'react-native';

import { BottomSheet } from '../../shared/components/BottomSheet';
import { Icon } from '../../shared/components/Icon';
import { IconTile } from '../../shared/components/Misc';
import { Money } from '../../shared/components/Money';
import { Press } from '../../shared/components/Press';
import { Text } from '../../shared/components/Text';
import { useLiveQuery } from '../../shared/db/live';
import type { ID } from '../../shared/db/types';
import { useSettings } from '../../shared/settings/settingsStore';
import { dayLabel } from '../../shared/utils/dates';
import { formatMoney } from '../../shared/utils/money';
import { listLinkCandidates } from '../data/transactionsRepo';
import { useLookups } from '../data/useLookups';
import type { TxListItem } from '../types';
import { afterPaybacks, recordName } from '../utils/paybacks';
import { SearchBox } from './Pickers';

type Props = {
  visible: boolean;
  onClose: () => void;
  /** `expense`: what an income pays back. `income`: an unlinked income that paid this expense back. */
  want: 'expense' | 'income';
  selected?: ID | null;
  exclude?: ID | null;
  onSelect: (tx: TxListItem) => void;
  /** Shown as a last row when something is linked, to undo it. */
  onRemove?: () => void;
};

/** Picks the record on the other side of a payback: the expense, or the income that paid it back. */
export function LinkRecordSheet({ visible, onClose, want, selected, exclude, onSelect, onRemove }: Props) {
  const [query, setQuery] = useState('');
  const lookups = useLookups();
  const base = useSettings((s) => s.baseCurrency);
  const q = query.trim();
  const { data: rows, loading } = useLiveQuery(['transactions', 'payees', 'categories'], () => (visible ? listLinkCandidates(want, { search: q, exclude }) : Promise.resolve([])), [visible, want, q, exclude]);

  const close = () => {
    setQuery('');
    onClose();
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={close}
      tall
      title={want === 'expense' ? 'What does it pay back?' : 'Which payment paid it back?'}
      subtitle={
        want === 'expense'
          ? 'Pick what you paid for. It then counts only what it cost you, and this money doesn’t count as income.'
          : 'Income you logged that isn’t linked to anything yet.'
      }
      testID="link-sheet"
    >
      <SearchBox value={query} onChange={setQuery} placeholder="Search by name, category or amount" />
      {(rows ?? []).map((t) => {
        const cat = t.categoryId ? lookups.categories.get(t.categoryId) : undefined;
        const account = lookups.accounts.get(t.accountId);
        const isSelected = t.id === selected;
        const parts = [dayLabel(t.date), cat && t.payeeId ? cat.name : null, account?.name].filter(Boolean);
        return (
          <Press
            key={t.id}
            onPress={() => {
              onSelect(t);
              close();
            }}
            haptic="select"
            dim={0.6}
            testID={`link-option-${t.id}`}
          >
            <View className="min-h-[60px] flex-row items-center px-5 py-2.5">
              <View className="mr-3.5">
                <IconTile icon={cat?.icon ?? 'circle-question-mark'} color={cat?.color} muted={!cat} size={36} />
              </View>
              <View className="flex-1 pr-3">
                <Text variant="body" numberOfLines={1}>
                  {recordName(t, lookups)}
                </Text>
                <Text variant="caption" tone="graphite" numberOfLines={1} className="mt-0.5">
                  {parts.join(', ')}
                </Text>
              </View>
              <View className="items-end">
                <Money minor={t.type === 'expense' ? -t.amount : t.amount} currency={t.currency} showCurrency={t.currency !== base} colorIncome={t.type === 'income'} size="md" />
                {t.type === 'expense' && t.paidBack > 0 ? (
                  <Text variant="caption" tone="mist" tabular className="mt-0.5">
                    {formatMoney(afterPaybacks(t, t.paidBack))} after paybacks
                  </Text>
                ) : null}
              </View>
              {isSelected ? (
                <View className="ml-2">
                  <Icon name="check" size={18} tone="accent" />
                </View>
              ) : null}
            </View>
          </Press>
        );
      })}
      {!loading && rows && !rows.length ? (
        <Text variant="label" weight="regular" tone="graphite" className="px-5 py-6 text-center">
          {q ? 'Nothing matches that.' : want === 'expense' ? 'No expenses yet.' : 'No unlinked income yet. Log the money you got back first.'}
        </Text>
      ) : null}
      {selected && onRemove ? (
        <Press
          onPress={() => {
            onRemove();
            close();
          }}
          className="px-5 py-4"
          testID="link-remove"
        >
          <Text variant="body" tone="danger">
            Remove the link
          </Text>
        </Press>
      ) : null}
    </BottomSheet>
  );
}
