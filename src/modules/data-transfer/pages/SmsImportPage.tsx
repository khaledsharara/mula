import { format } from 'date-fns';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';

import { findAccountByIdentifier, useAccounts } from '../../accounts/data/accountsRepo';
import { SUPPORTED_BANK_NAMES } from '../../banks';
import { useCategories } from '../../categories/data/categoriesRepo';
import { SMS_KIND_LABEL } from '../../inbox/utils/parser';
import { resolveAlias } from '../../payees/data/payeesRepo';
import { Button } from '../../shared/components/Button';
import { toast } from '../../shared/components/Feedback';
import { Icon } from '../../shared/components/Icon';
import { Divider, ListRow, Section } from '../../shared/components/List';
import { IconTile } from '../../shared/components/Misc';
import { Money } from '../../shared/components/Money';
import { Press } from '../../shared/components/Press';
import { SegmentedControl } from '../../shared/components/SegmentedControl';
import { Text } from '../../shared/components/Text';
import { SYSTEM_CATEGORIES } from '../../shared/db/seeds/categories';
import type { Category, ID, SmsKind } from '../../shared/db/types';
import { Screen } from '../../shared/layouts/Screen';
import { pickTextFile, type PickedFile } from '../../shared/utils/files';
import { CategoryPicker } from '../../transactions/components/Pickers';
import { FieldRow } from '../../transactions/components/FieldRow';
import { AccountChoiceSheet, testIdPart } from '../components/ChoiceSheets';
import { ImportProgress, StepHeader } from '../components/StepHeader';
import { countLabel, formatCount } from '../utils/format';
import { groupCategoryKind, importSmsHistory, isCashKind, last4Key, type SmsImportResult } from '../utils/importSms';
import { rangeStart } from '../utils/ranges';
import { groupByMerchant, scanArchive, type ArchiveScan, type MerchantGroup } from '../utils/smsArchive';
import { goBack } from '../../shared/utils/nav';

type Step = 'pick' | 'accounts' | 'categories' | 'importing' | 'done';
type StartFrom = 'all' | 'year' | 'last3';

const START_OPTIONS: { value: StartFrom; label: string }[] = [
  { value: 'all', label: 'Everything' },
  { value: 'year', label: 'This year' },
  { value: 'last3', label: 'Last 3 months' },
];

const cardTitle = (last4: string) => (last4 ? `Card or account ending ${last4}` : 'Messages without a card number');

export default function SmsImportPage() {
  const { data: accounts } = useAccounts(true);
  const { data: categories } = useCategories(true);
  const [step, setStep] = useState<Step>('pick');
  const [file, setFile] = useState<PickedFile | null>(null);
  const [startFrom, setStartFrom] = useState<StartFrom>('all');
  const [scan, setScan] = useState<ArchiveScan | null>(null);
  const [reading, setReading] = useState(false);
  const [accountByLast4, setAccountByLast4] = useState<Record<string, ID | null>>({});
  /** undefined until preselected from the first cash account. */
  const [cashAccountId, setCashAccountId] = useState<ID | null | undefined>(undefined);
  const [categoryByGroup, setCategoryByGroup] = useState<Record<string, ID | null>>({});
  const [sheet, setSheet] = useState<null | 'card' | 'cash' | 'category'>(null);
  const [activeCard, setActiveCard] = useState('');
  const [activeGroup, setActiveGroup] = useState<MerchantGroup | null>(null);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [result, setResult] = useState<SmsImportResult | null>(null);

  const accountById = useMemo(() => new Map((accounts ?? []).map((a) => [a.id, a])), [accounts]);
  const catById = useMemo(() => new Map((categories ?? []).map((c) => [c.id, c])), [categories]);

  /* ----- derived ----- */

  const candidates = useMemo(() => scan?.candidates ?? [], [scan]);

  const kindCounts = useMemo(() => {
    const m = new Map<SmsKind, number>();
    for (const c of candidates) m.set(c.parsed.kind, (m.get(c.parsed.kind) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [candidates]);

  const cards = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of candidates) m.set(last4Key(c), (m.get(last4Key(c)) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [candidates]);

  const importable = useMemo(() => candidates.filter((c) => accountByLast4[last4Key(c)]), [candidates, accountByLast4]);
  const groups = useMemo(() => groupByMerchant(importable), [importable]);
  const hasCashMoves = candidates.some((c) => isCashKind(c.parsed.kind));
  const cashAccount = cashAccountId ? accountById.get(cashAccountId) : undefined;

  const unnamed = useMemo(() => {
    let instapay = 0;
    let cash = 0;
    let other = 0;
    for (const c of importable) {
      if (c.groupKey) continue;
      if (c.parsed.kind === 'instapay_out') instapay++;
      else if (isCashKind(c.parsed.kind)) cash++;
      else other++;
    }
    return { instapay, cash, other };
  }, [importable]);

  /* ----- preselection ----- */

  // Cards: the account whose bank-message digits match.
  useEffect(() => {
    const missing = cards.filter(([k]) => !(k in accountByLast4));
    if (!missing.length) return;
    let alive = true;
    void (async () => {
      const patch: Record<string, ID | null> = {};
      for (const [k] of missing) patch[k] = (await findAccountByIdentifier(k || null))?.id ?? null;
      if (alive) setAccountByLast4((prev) => ({ ...patch, ...prev }));
    })();
    return () => {
      alive = false;
    };
  }, [cards, accountByLast4]);

  // Cash: the first cash account, if there is one.
  useEffect(() => {
    if (cashAccountId !== undefined || !accounts) return;
    setCashAccountId(accounts.find((a) => a.type === 'cash' && !a.archived)?.id ?? null);
  }, [accounts, cashAccountId]);

  // Categories: what the payee behind this bank name was last filed under.
  useEffect(() => {
    if (!categories) return;
    const missing = groups.filter((g) => !(g.key in categoryByGroup));
    if (!missing.length) return;
    let alive = true;
    void (async () => {
      const patch: Record<string, ID | null> = {};
      for (const g of missing) {
        const payee = await resolveAlias(g.key);
        const cat = payee?.defaultCategoryId ? catById.get(payee.defaultCategoryId) : undefined;
        patch[g.key] = cat && cat.kind === groupCategoryKind(g) && cat.id !== SYSTEM_CATEGORIES.missing ? cat.id : null;
      }
      if (alive) setCategoryByGroup((prev) => ({ ...patch, ...prev }));
    })();
    return () => {
      alive = false;
    };
  }, [groups, categoryByGroup, categories, catById]);

  /* ----- actions ----- */

  const pick = async () => {
    setReading(true);
    try {
      const picked = await pickTextFile('csv');
      if (!picked) return;
      const filtered = scanArchive(picked.text, { from: rangeStart(startFrom) });
      const any = filtered.candidates.length || filtered.ignored || filtered.holdsRemoved ? filtered : scanArchive(picked.text);
      if (!any.candidates.length && !any.ignored && !any.holdsRemoved) {
        toast(`No ${SUPPORTED_BANK_NAMES} messages found in this file`);
        return;
      }
      setFile(picked);
      setScan(filtered);
      setAccountByLast4({});
      setCategoryByGroup({});
    } catch {
      toast('Couldn’t read that file');
    } finally {
      setReading(false);
    }
  };

  const changeStart = (v: StartFrom) => {
    setStartFrom(v);
    if (file) setScan(scanArchive(file.text, { from: rangeStart(v) }));
  };

  const runImport = async () => {
    setProgress({ done: 0, total: importable.length });
    setStep('importing');
    try {
      const res = await importSmsHistory(
        { candidates: importable, accountByLast4, cashAccountId: cashAccountId ?? null, groups, categoryByGroup },
        (done, total) => {
          if (done === total || done % 5 === 0) setProgress({ done, total });
        },
      );
      setResult({ ...res, unmapped: candidates.length - importable.length });
      setStep('done');
      toast(`Imported ${countLabel(res.created, 'record')}`);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Couldn’t import the messages');
      setStep('categories');
    }
  };

  const leave = () => (router.canGoBack() ? goBack() : router.replace('/data'));
  const onBack = () => {
    if (step === 'importing') toast('Wait until the import finishes');
    else if (step === 'accounts') setStep('pick');
    else if (step === 'categories') setStep('accounts');
    else leave();
  };

  /* ----- footer ----- */

  const footer =
    step === 'pick' ? (
      file ? (
        <Button
          label={candidates.length ? 'Continue' : 'No payments in this period'}
          size="lg"
          full
          disabled={!candidates.length}
          onPress={() => setStep('accounts')}
          testID="sms-continue-accounts"
        />
      ) : (
        <Button label="Choose the export file" size="lg" full loading={reading} onPress={pick} testID="sms-pick" />
      )
    ) : step === 'accounts' ? (
      <Button
        label={importable.length ? 'Continue' : 'Match at least one card'}
        size="lg"
        full
        disabled={!importable.length}
        onPress={() => setStep('categories')}
        testID="sms-continue-categories"
      />
    ) : step === 'categories' ? (
      <Button label={`Import ${countLabel(importable.length, 'record')}`} size="lg" full onPress={runImport} testID="sms-import" />
    ) : step === 'done' ? (
      <Button label="Done" size="lg" full onPress={leave} testID="sms-done" />
    ) : undefined;

  const activeKind = activeGroup ? groupCategoryKind(activeGroup) : 'expense';

  return (
    <Screen title="Import bank history" back={onBack} footer={footer} testID="sms-import-page">
      {step === 'pick' && !file ? (
        <>
          <StepHeader
            step={1}
            of={3}
            title="Choose your message export"
            body="Pick a message history export: a CSV with the columns chat, datetime, direction, sender and text."
          />
          <Text variant="body" tone="graphite" className="mt-2 px-5">
            Mula reads it on this phone. Nothing is uploaded.
          </Text>
        </>
      ) : null}

      {step === 'pick' && file && scan ? (
        <>
          <StepHeader step={1} of={3} title="What’s in the file" />
          <Section>
            <ListRow
              testID="sms-change-file"
              title={file.name}
              subtitle={countLabel(scan.totalMessages, 'message')}
              left={<IconTile icon="file-spreadsheet" size={36} muted />}
              value="Change"
              divider={false}
              onPress={reading ? undefined : pick}
            />
          </Section>

          <Section title="Start from">
            <View className="px-5">
              <SegmentedControl options={START_OPTIONS} value={startFrom} onChange={changeStart} testID="sms-start-from" />
            </View>
          </Section>

          <Section title="Found">
            <ListRow title="Transactions" value={formatCount(candidates.length)} testID="sms-found-transactions" />
            <ListRow
              title="Card holds removed"
              subtitle="Charges reversed within minutes"
              value={formatCount(Math.floor(scan.holdsRemoved / 2))}
              testID="sms-found-holds"
            />
            <ListRow
              title="Ignored messages"
              subtitle="Codes, notices and declined payments"
              value={formatCount(scan.ignored)}
              divider={scan.firstDate != null}
              testID="sms-found-ignored"
            />
            {scan.firstDate != null && scan.lastDate != null ? (
              <ListRow
                title="Dates"
                value={`${format(scan.firstDate, 'd MMM yyyy')} to ${format(scan.lastDate, 'd MMM yyyy')}`}
                divider={false}
                testID="sms-found-dates"
              />
            ) : null}
          </Section>

          {kindCounts.length ? (
            <Section title="By kind">
              {kindCounts.map(([kind, n], i) => (
                <ListRow key={kind} title={SMS_KIND_LABEL[kind]} value={formatCount(n)} divider={i < kindCounts.length - 1} testID={`sms-kind-${kind.replace(/_/g, '-')}`} />
              ))}
            </Section>
          ) : null}
        </>
      ) : null}

      {step === 'accounts' ? (
        <>
          <StepHeader step={2} of={3} title="Match cards to accounts" body="Choose where each card’s payments go. Cards you skip aren’t imported." />
          <Section title="Cards and accounts" footer="Accounts whose bank message digits match are picked for you.">
            {cards.map(([last4, n], i) => {
              const account = accountByLast4[last4] ? accountById.get(accountByLast4[last4]!) : undefined;
              return (
                <ListRow
                  key={last4 || 'none'}
                  testID={`sms-card-${last4 || 'none'}`}
                  title={cardTitle(last4)}
                  subtitle={countLabel(n, 'transaction')}
                  left={account ? <IconTile icon={account.icon} color={account.color} size={36} /> : <IconTile icon="credit-card" size={36} muted />}
                  value={account?.name ?? 'Skip'}
                  chevron
                  divider={i < cards.length - 1}
                  onPress={() => {
                    setActiveCard(last4);
                    setSheet('card');
                  }}
                />
              );
            })}
          </Section>

          {hasCashMoves ? (
            <Section
              title="ATM withdrawals and deposits"
              footer={
                cashAccount
                  ? `Withdrawals move money from the card’s account to ${cashAccount.name}; deposits move it back.`
                  : 'Without a cash account, withdrawals are filed as spending under Others and deposits as income.'
              }
            >
              <FieldRow
                testID="sms-cash-account"
                label="Cash account"
                value={cashAccount?.name ?? 'None'}
                left={cashAccount ? <View className="h-2 w-2 rounded-full" style={{ backgroundColor: cashAccount.color }} /> : null}
                divider={false}
                onPress={() => setSheet('cash')}
              />
            </Section>
          ) : null}
        </>
      ) : null}

      {step === 'categories' ? (
        <>
          <StepHeader
            step={3}
            of={3}
            title="Choose categories"
            body="One choice covers every payment to the same place, and Mula remembers it for future bank messages."
          />
          <Section title={groups.length ? `Places and people (${formatCount(groups.length)})` : 'Places and people'}>
            {groups.length ? (
              groups.map((g, i) => {
                const chosen = categoryByGroup[g.key];
                return (
                  <GroupRow
                    key={g.key}
                    testID={`sms-group-${testIdPart(g.name, i)}`}
                    group={g}
                    category={chosen ? catById.get(chosen) : undefined}
                    divider={i < groups.length - 1}
                    onPress={() => {
                      setActiveGroup(g);
                      setSheet('category');
                    }}
                  />
                );
              })
            ) : (
              <Text variant="label" weight="regular" tone="mist" className="px-5">
                No named payments in this period.
              </Text>
            )}
          </Section>

          {unnamed.instapay || unnamed.cash || unnamed.other ? (
            <Section title="Without a name" footer="Places you don’t choose a category for are filed under Others › Missing too.">
              {unnamed.instapay ? (
                <ListRow
                  title="InstaPay transfers without a name"
                  subtitle="Filed under Others › Missing"
                  value={formatCount(unnamed.instapay)}
                  divider={Boolean(unnamed.cash || unnamed.other)}
                  testID="sms-unnamed-instapay"
                />
              ) : null}
              {unnamed.cash ? (
                <ListRow
                  title="ATM withdrawals and deposits"
                  subtitle={cashAccount ? `Recorded as transfers with ${cashAccount.name}` : 'Filed under Others › Missing'}
                  value={formatCount(unnamed.cash)}
                  divider={Boolean(unnamed.other)}
                  testID="sms-unnamed-cash"
                />
              ) : null}
              {unnamed.other ? (
                <ListRow
                  title="Other payments without a name"
                  subtitle="Filed under Others › Missing"
                  value={formatCount(unnamed.other)}
                  divider={false}
                  testID="sms-unnamed-other"
                />
              ) : null}
            </Section>
          ) : null}
        </>
      ) : null}

      {step === 'importing' ? <ImportProgress done={progress.done} total={progress.total} /> : null}

      {step === 'done' && result ? (
        <>
          <StepHeader
            title={`Imported ${countLabel(result.created, 'record')}`}
            body="Find them in Records. Payments you didn’t categorize are waiting under Others › Missing."
          />
          <Section>
            <ListRow title="Imported" value={formatCount(result.created)} testID="sms-result-created" />
            <ListRow
              title="Already in Mula"
              subtitle="Imported before and left as they were"
              value={formatCount(result.alreadyImported)}
              divider={Boolean(result.unmapped || result.failed)}
              testID="sms-result-existing"
            />
            {result.unmapped ? (
              <ListRow
                title="Skipped"
                subtitle="From cards you didn’t match to an account"
                value={formatCount(result.unmapped)}
                divider={Boolean(result.failed)}
                testID="sms-result-skipped"
              />
            ) : null}
            {result.failed ? (
              <ListRow
                title="Couldn’t be saved"
                subtitle="Usually a currency without an exchange rate"
                value={formatCount(result.failed)}
                divider={false}
                testID="sms-result-failed"
              />
            ) : null}
          </Section>
        </>
      ) : null}

      <AccountChoiceSheet
        visible={sheet === 'card'}
        onClose={() => setSheet(null)}
        title={activeCard ? `Ending ${activeCard}` : 'Without a card number'}
        subtitle="Payments from these messages go to this account."
        selected={accountByLast4[activeCard] ?? null}
        onSelect={(id) => setAccountByLast4((prev) => ({ ...prev, [activeCard]: id }))}
        noneLabel="Skip these messages"
        testID="sms-card-sheet"
      />
      <AccountChoiceSheet
        visible={sheet === 'cash'}
        onClose={() => setSheet(null)}
        title="Cash account"
        subtitle="Where ATM withdrawals go and deposits come from."
        selected={cashAccountId ?? null}
        onSelect={setCashAccountId}
        noneLabel="No cash account"
        testID="sms-cash-sheet"
      />
      <CategoryPicker
        visible={sheet === 'category'}
        onClose={() => setSheet(null)}
        kind={activeKind}
        selected={activeGroup ? categoryByGroup[activeGroup.key] : null}
        onSelect={(id) => activeGroup && setCategoryByGroup((prev) => ({ ...prev, [activeGroup.key]: id }))}
      />
    </Screen>
  );
}

type GroupRowProps = {
  group: MerchantGroup;
  category: Category | undefined;
  onPress: () => void;
  divider: boolean;
  testID: string;
};

/** A merchant or sender with its total, and the category every record from it gets. */
function GroupRow({ group, category, onPress, divider, testID }: GroupRowProps) {
  const income = groupCategoryKind(group) === 'income';
  return (
    <Press onPress={onPress} dim={0.6} testID={testID} accessibilityLabel={`${group.name}: ${category?.name ?? 'Choose a category'}`}>
      <View className="min-h-[64px] flex-row items-center px-5 py-3">
        <View className="mr-3.5">
          {category ? <IconTile icon={category.icon} color={category.color} size={36} /> : <IconTile icon="circle-question-mark" size={36} muted />}
        </View>
        <View className="flex-1 pr-3">
          <Text variant="body" numberOfLines={1}>
            {group.name}
          </Text>
          <Text variant="caption" tone={category ? 'graphite' : 'accent'} numberOfLines={1} className="mt-0.5">
            {category?.name ?? 'Choose a category'}
          </Text>
        </View>
        <View className="items-end">
          <Money minor={group.total} size="sm" colorIncome={income} />
          <Text variant="caption" tone="mist" tabular className="mt-0.5">
            {countLabel(group.count, 'record')}
          </Text>
        </View>
        <View className="ml-1.5">
          <Icon name="chevron-right" size={16} tone="mist" />
        </View>
      </View>
      {divider ? <Divider inset={70} /> : null}
    </Press>
  );
}
