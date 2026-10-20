import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';

import { IconButton, Button } from '../../shared/components/Button';
import { toast } from '../../shared/components/Feedback';
import { ListRow, Section } from '../../shared/components/List';
import { EmptyState, IconTile } from '../../shared/components/Misc';
import { Money } from '../../shared/components/Money';
import { SegmentedControl } from '../../shared/components/SegmentedControl';
import { Text } from '../../shared/components/Text';
import type { InboxItem } from '../../shared/db/types';
import { Screen } from '../../shared/layouts/Screen';
import { useSettings } from '../../shared/settings/settingsStore';
import { ageLabel, dayLabel, timeLabel } from '../../shared/utils/dates';
import { plural } from '../../shared/utils/text';
import { PasteSmsSheet } from '../components/PasteSmsSheet';
import { useRecurringList } from '../../recurring/data/recurringRepo';
import { restoreItem, useInbox } from '../data/inboxRepo';
import { isOutflow, SMS_KIND_LABEL, suggestPayeeName } from '../utils/parser';

const KIND_ICON: Record<string, string> = {
  card_purchase: 'credit-card',
  applepay_purchase: 'smartphone-nfc',
  instapay_out: 'zap',
  instapay_in: 'zap',
  atm_withdrawal: 'banknote',
  cash_deposit: 'banknote',
  refund: 'undo-2',
  unknown_debit: 'arrow-up-right',
  unknown_credit: 'arrow-down-left',
};

function itemTitle(i: InboxItem): string {
  if (i.source === 'recurring') return i.rawText;
  const p = i.parsed;
  if (!p) return 'Unreadable message';
  if (p.counterparty && p.kind !== 'atm_withdrawal' && p.kind !== 'cash_deposit') return i.source === 'claude' ? p.counterparty : suggestPayeeName(p.counterparty);
  if (i.source === 'claude') return p.toAccountHint ? `${p.accountHint ?? 'Account'} to ${p.toAccountHint}` : isOutflow(p.kind) ? 'Expense' : 'Income';
  return SMS_KIND_LABEL[p.kind];
}

function itemSubtitle(i: InboxItem): string {
  if (i.source === 'recurring') return `Planned payment, due ${dayLabel(i.receivedAt)}`;
  const p = i.parsed;
  const when = p?.occurredAt ?? i.receivedAt;
  const kind = i.source === 'claude' ? 'From Claude' : i.source === 'applepay' ? 'Apple Pay' : p ? SMS_KIND_LABEL[p.kind] : 'Bank message';
  return `${kind}, ${dayLabel(when)} ${timeLabel(when)}`;
}

const STATUS_NOTE: Record<string, string> = {
  confirmed: 'Saved as a record',
  dismissed: 'Skipped',
  merged: 'Merged',
};

export default function InboxPage() {
  const params = useLocalSearchParams<{ paste?: string }>();
  const [tab, setTab] = useState<'pending' | 'done'>('pending');
  const [paste, setPaste] = useState(params.paste === '1');
  const { data: pending } = useInbox('pending');
  const { data: all } = useInbox('all');
  const { data: recurring } = useRecurringList();
  const base = useSettings((s) => s.baseCurrency);
  const plannedById = new Map((recurring ?? []).map((r) => [r.id, r]));
  const done = (all ?? []).filter((i) => i.status !== 'pending').slice(0, 80);

  useEffect(() => {
    if (params.paste === '1') setPaste(true);
  }, [params.paste]);

  const list = tab === 'pending' ? (pending ?? []) : done;
  const oldest = pending?.length ? Math.min(...pending.map((p) => p.receivedAt)) : null;

  return (
    <Screen
      title="Inbox"
      back
      testID="inbox"
      right={<IconButton icon="clipboard-paste" label="Paste a bank message" onPress={() => setPaste(true)} testID="inbox-paste" />}
      footer={pending?.length ? <Button label={`Review ${plural(pending.length, 'payment')}`} size="lg" full onPress={() => router.push('/review')} testID="inbox-review" /> : undefined}
    >
      <View className="px-5 pt-1">
        <SegmentedControl
          testID="inbox-tab"
          options={[
            { value: 'pending', label: pending?.length ? `Waiting (${pending.length})` : 'Waiting' },
            { value: 'done', label: 'Handled' },
          ]}
          value={tab}
          onChange={setTab}
        />
        {tab === 'pending' && oldest ? (
          <Text variant="label" weight="regular" tone="graphite" className="mt-3">
            The oldest has been waiting {ageLabel(oldest)}. Payments you don’t confirm stay out of your balances.
          </Text>
        ) : null}
      </View>

      <Section>
        {list.length ? (
          list.map((i, idx) => {
            const p = i.parsed;
            const planned = i.recurringId ? plannedById.get(i.recurringId) : undefined;
            const signed = p ? (isOutflow(p.kind) ? -p.amount : p.amount) : planned?.amount ? (planned.type === 'income' ? planned.amount : -planned.amount) : 0;
            return (
              <ListRow
                key={i.id}
                testID={`inbox-item-${idx}`}
                title={itemTitle(i)}
                subtitle={tab === 'done' ? `${STATUS_NOTE[i.status] ?? i.status}${i.note ? `: ${i.note}` : ''}` : itemSubtitle(i)}
                left={<IconTile icon={i.source === 'recurring' ? 'repeat' : KIND_ICON[p?.kind ?? ''] ?? 'message-square-text'} muted size={38} />}
                right={p || planned?.amount ? <Money minor={signed} currency={p?.currency ?? planned?.currency ?? undefined} showCurrency={(p?.currency ?? planned?.currency ?? base) !== base} sign="always" colorIncome={signed > 0} /> : null}
                divider={idx < list.length - 1}
                onPress={
                  tab === 'pending'
                    ? () => router.push({ pathname: '/add', params: { inboxId: i.id } })
                    : i.status === 'confirmed' && i.transactionId
                      ? () => router.push({ pathname: '/add', params: { id: i.transactionId! } })
                      : async () => {
                          await restoreItem(i.id);
                          toast('Back in your inbox');
                        }
                }
              />
            );
          })
        ) : tab === 'pending' ? (
          <EmptyState
            icon="inbox"
            title="Nothing waiting"
            body={
              Platform.OS === 'android'
                ? 'Bank messages show up here once SMS capture is on in More › Automation. You can also paste one.'
                : 'Bank messages show up here once Mula is installed on your iPhone with the Shortcuts automation. You can also paste one.'
            }
            action={{ label: 'Paste a bank message', icon: 'clipboard-paste', onPress: () => setPaste(true) }}
          />
        ) : (
          <EmptyState icon="archive" title="Nothing handled yet" body="Confirmed and skipped messages are listed here for a while, so you can undo." />
        )}
      </Section>

      <PasteSmsSheet visible={paste} onClose={() => setPaste(false)} />
    </Screen>
  );
}
