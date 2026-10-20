import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { refreshReminders } from '../../integrations/utils/notifications';
import { BottomSheet } from '../../shared/components/BottomSheet';
import { Button } from '../../shared/components/Button';
import { toast } from '../../shared/components/Feedback';
import { ListRow, Section } from '../../shared/components/List';
import { EmptyState } from '../../shared/components/Misc';
import { Text } from '../../shared/components/Text';
import type { Recurring } from '../../shared/db/types';
import { Screen } from '../../shared/layouts/Screen';
import { useSettings } from '../../shared/settings/settingsStore';
import { shortDate } from '../../shared/utils/dates';
import { TransactionRow } from '../../transactions/components/TransactionRow';
import { useLookups } from '../../transactions/data/useLookups';
import { paymentTypeLabel } from '../../transactions/types';
import { RecurringAmount, RecurringIcon } from '../components/RecurringRows';
import {
  missedWhilePaused,
  processDueRecurring,
  setRecurringActive,
  skipMissedRecurring,
  useRecurring,
  useRecurringTransactions,
} from '../data/recurringRepo';
import { describeRule, upcomingDates } from '../utils/recurrence';
import { dueDayLabel, dueText, modeHint, plural, relativeDays, reminderLabel } from '../utils/labels';

const noop = () => undefined;

function endsLabel(r: Recurring): string {
  if (r.endType === 'until' && r.endDate) return `On ${shortDate(r.endDate)}`;
  if (r.endType === 'count' && r.endCount) {
    const left = Math.max(0, r.endCount - r.occurrences);
    return `After ${r.endCount} ${plural(r.endCount, 'payment', 'payments')}, ${left} left`;
  }
  return 'Never';
}

export default function RecurringDetailPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const baseCurrency = useSettings((s) => s.baseCurrency);
  const { data: r } = useRecurring(id);
  const { data: history } = useRecurringTransactions(id);
  const lookups = useLookups();
  const [resumeSheet, setResumeSheet] = useState(false);
  const [busy, setBusy] = useState(false);

  const next = useMemo(() => (r ? upcomingDates(r, r.occurrences, 0, Number.MAX_SAFE_INTEGER, 5) : []), [r]);

  if (r === null) {
    return (
      <Screen title="Planned payment" back testID="recurring-detail">
        <EmptyState icon="repeat" title="This planned payment is gone" body="It may have been deleted. Your earlier records are still in your accounts." />
      </Screen>
    );
  }
  if (!r) return <Screen title="Planned payment" back testID="recurring-detail">{null}</Screen>;

  const account = r.accountId ? lookups.accounts.get(r.accountId) : undefined;
  const toAccount = r.toAccountId ? lookups.accounts.get(r.toAccountId) : undefined;
  const category = r.categoryId ? lookups.categories.get(r.categoryId) : undefined;
  const payee = r.payeeId ? lookups.payees.get(r.payeeId) : undefined;
  const isTransfer = r.type === 'transfer';
  const missed = missedWhilePaused(r);
  const status = !r.active ? 'Paused' : r.nextDue == null ? 'Ended' : dueText(r.nextDue);

  const resume = async (catchUp: boolean) => {
    setResumeSheet(false);
    setBusy(true);
    try {
      if (!catchUp) await skipMissedRecurring(r.id);
      await setRecurringActive(r.id, true);
      if (catchUp) await processDueRecurring();
      void refreshReminders().catch(noop);
      toast('Planned payment resumed');
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async () => {
    if (r.active) {
      setBusy(true);
      try {
        await setRecurringActive(r.id, false);
        void refreshReminders().catch(noop);
        toast('Planned payment paused');
      } finally {
        setBusy(false);
      }
    } else if (missed > 0) {
      setResumeSheet(true);
    } else {
      await resume(false);
    }
  };

  return (
    <Screen title="Planned payment" back testID="recurring-detail">
      <View className="px-5 pt-3">
        <View className="flex-row items-center">
          <RecurringIcon r={r} category={category} size={44} />
          <View className="ml-3.5 flex-1">
            <Text variant="heading" numberOfLines={2}>
              {r.name}
            </Text>
            <Text variant="label" weight="regular" tone="graphite" className="mt-0.5">
              {describeRule(r)}
            </Text>
          </View>
        </View>
        <View className="mt-5">
          <RecurringAmount r={r} baseCurrency={baseCurrency} accountCurrency={account?.currency} size="display" />
        </View>
        <Text variant="label" weight="regular" tone={r.active ? 'graphite' : 'alert'} className="mt-1" testID="recurring-status">
          {status}
        </Text>
      </View>

      <View className="mt-5 flex-row gap-2.5 px-5">
        <View className="flex-1">
          <Button
            label="Edit"
            icon="pencil"
            variant="secondary"
            full
            onPress={() => router.push({ pathname: '/recurring/edit', params: { id: r.id } })}
            testID="recurring-edit"
          />
        </View>
        <View className="flex-1">
          <Button label={r.active ? 'Pause' : 'Resume'} variant="secondary" full loading={busy} onPress={toggleActive} testID="recurring-toggle-active" />
        </View>
      </View>

      <Section title="Details">
        <ListRow title={isTransfer ? 'From' : 'Account'} value={account?.name ?? 'Not set'} />
        {r.currency && account && r.currency !== account.currency ? (
          <ListRow title="Charged in" value={`${r.currency}, converted to ${account.currency}`} testID="recurring-charged-in" />
        ) : null}
        {isTransfer ? (
          <ListRow title="To" value={toAccount?.name ?? 'Not set'} />
        ) : (
          <ListRow title="Category" value={category?.name ?? 'Not set'} />
        )}
        {payee ? <ListRow title={r.type === 'income' ? 'From' : r.isInstapay ? 'Sent to' : 'Paid to'} value={payee.name} /> : null}
        {r.paymentType && !r.isInstapay ? <ListRow title="Paid with" value={paymentTypeLabel(r.paymentType)} /> : null}
        <ListRow title="When it’s due" value={modeHint(r.mode)} />
        <ListRow title="Reminder" value={reminderLabel(r.remindDaysBefore)} />
        <ListRow title="Ends" value={endsLabel(r)} divider={Boolean(r.note)} />
        {r.note ? <ListRow title="Note" value={r.note} divider={false} /> : null}
      </Section>

      <Section title="Next" footer={!r.active && next.length ? 'Paused. These dates wait until you resume it.' : undefined}>
        {next.length ? (
          next.map((d, i) => (
            <ListRow
              key={d}
              title={dueDayLabel(d)}
              subtitle={relativeDays(d)}
              right={<RecurringAmount r={r} baseCurrency={baseCurrency} accountCurrency={account?.currency} />}
              divider={i < next.length - 1}
            />
          ))
        ) : (
          <Text variant="label" weight="regular" tone="mist" className="px-5 py-2">
            No more payments. This schedule has ended.
          </Text>
        )}
      </Section>

      <Section title="History">
        {history?.length ? (
          history.map((tx, i) => (
            <TransactionRow
              key={tx.id}
              tx={tx}
              lookups={lookups}
              divider={i < history.length - 1}
              onPress={() => router.push({ pathname: '/add', params: { id: tx.id } })}
            />
          ))
        ) : history ? (
          <Text variant="label" weight="regular" tone="mist" className="px-5 py-2">
            Nothing logged yet. Records appear here once a payment is logged or confirmed.
          </Text>
        ) : null}
      </Section>

      <BottomSheet
        visible={resumeSheet}
        onClose={() => setResumeSheet(false)}
        title={`Resume ${r.name}?`}
        subtitle={`${missed} ${plural(missed, 'payment was', 'payments were')} due while it was paused.`}
        scroll={false}
        testID="resume-sheet"
      >
        <View className="gap-2.5 px-5 pb-2 pt-3">
          <Button label="Skip them and resume" size="lg" full onPress={() => void resume(false)} testID="resume-skip" />
          <Button
            label={r.mode === 'auto' ? 'Log them and resume' : 'Send them to my inbox and resume'}
            variant="secondary"
            size="lg"
            full
            onPress={() => void resume(true)}
            testID="resume-catch-up"
          />
          <Button label="Cancel" variant="ghost" size="lg" full onPress={() => setResumeSheet(false)} testID="resume-cancel" />
        </View>
      </BottomSheet>
    </Screen>
  );
}
