import { format } from 'date-fns';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';

import { useAccounts } from '../../accounts/data/accountsRepo';
import { Button } from '../../shared/components/Button';
import { toast } from '../../shared/components/Feedback';
import { Divider, ListRow, Section } from '../../shared/components/List';
import { Money } from '../../shared/components/Money';
import { SegmentedControl } from '../../shared/components/SegmentedControl';
import { Text } from '../../shared/components/Text';
import type { ID } from '../../shared/db/types';
import { Screen } from '../../shared/layouts/Screen';
import { useSettings } from '../../shared/settings/settingsStore';
import { pickTextFile } from '../../shared/utils/files';
import { AccountPicker } from '../../transactions/components/Pickers';
import { FieldRow } from '../../transactions/components/FieldRow';
import { ColumnChoiceSheet } from '../components/ChoiceSheets';
import { ImportProgress, StepHeader } from '../components/StepHeader';
import { guessMapping, mapRows, parseDate, readCsv, type ColumnMapping, type DateOrder, type ImportRow, type ParsedCsv } from '../utils/csv';
import { countLabel, formatCount } from '../utils/format';
import { guessDateOrder, importCsvRows, sampleValue, type CsvImportResult } from '../utils/importCsv';
import { goBack } from '../../shared/utils/nav';

type Step = 'pick' | 'map' | 'preview' | 'importing' | 'done';
type Target = keyof ColumnMapping;

const TARGETS: Record<Target, { label: string; hint: string }> = {
  date: { label: 'Date', hint: 'The day of each record.' },
  time: { label: 'Time', hint: 'Optional. Records without a time are set to noon.' },
  amount: { label: 'Amount', hint: 'One column with the amount. Use Debit and Credit instead when the file splits them.' },
  debit: { label: 'Debit', hint: 'Money out. Rows with a debit count as spending.' },
  credit: { label: 'Credit', hint: 'Money in. Rows with a credit count as income.' },
  type: { label: 'Type', hint: 'Optional. Words like expense or income decide which way the money went.' },
  currency: { label: 'Currency', hint: 'Optional. Amounts in another currency are converted to the account’s.' },
  account: { label: 'Account', hint: 'Optional. Names that match one of your accounts are used; the rest go to the default account.' },
  category: { label: 'Category', hint: 'Optional. Names that match your categories are used; the rest go to Others › Missing.' },
  payee: { label: 'Payee', hint: 'Optional. New names are added to your payees.' },
  note: { label: 'Note', hint: 'Optional.' },
};

const ORDERS: { value: DateOrder; label: string }[] = [
  { value: 'dmy', label: 'Day/Month/Year' },
  { value: 'mdy', label: 'Month/Day/Year' },
  { value: 'ymd', label: 'Year/Month/Day' },
];

const PREVIEW_COUNT = 8;

export default function CsvImportPage() {
  const lastAccountId = useSettings((s) => s.lastAccountId);
  const { data: accounts } = useAccounts();
  const [step, setStep] = useState<Step>('pick');
  const [file, setFile] = useState<{ name: string; csv: ParsedCsv } | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping | null>(null);
  const [order, setOrder] = useState<DateOrder>('dmy');
  const [accountId, setAccountId] = useState<ID | null>(null);
  const [sheet, setSheet] = useState<'column' | 'account' | null>(null);
  const [target, setTarget] = useState<Target>('date');
  const [reading, setReading] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [result, setResult] = useState<(CsvImportResult & { skipped: number }) | null>(null);

  useEffect(() => {
    if (accountId || !accounts?.length) return;
    setAccountId(accounts.find((a) => a.id === lastAccountId)?.id ?? accounts[0].id);
  }, [accounts, accountId, lastAccountId]);

  const account = accounts?.find((a) => a.id === accountId) ?? null;

  // With a single amount column, separate debit/credit guesses would silently change the direction.
  const effective = useMemo<ColumnMapping | null>(
    () => (mapping ? (mapping.amount ? { ...mapping, debit: null, credit: null } : mapping) : null),
    [mapping],
  );
  const samples = useMemo(() => {
    const out: Record<string, string | null> = {};
    for (const h of file?.csv.headers ?? []) out[h] = file ? sampleValue(file.csv, h) : null;
    return out;
  }, [file]);
  // Mapping every row is the slow part, so it only runs once the preview is shown.
  const needRows = step === 'preview' || step === 'importing';
  const rows = useMemo<ImportRow[]>(
    () => (file && effective && needRows ? mapRows(file.csv, effective, order) : []),
    [file, effective, order, needRows],
  );
  const ready = rows.filter((r) => !r.error);
  const problems = rows.length - ready.length;
  const spending = ready.filter((r) => r.type === 'expense').length;

  /* ----- steps ----- */

  const pick = async () => {
    setReading(true);
    try {
      const picked = await pickTextFile('csv');
      if (!picked) return;
      const csv = readCsv(picked.text);
      if (!csv.headers.length || !csv.rows.length) {
        toast('This file has no rows to import');
        return;
      }
      const guessed = guessMapping(csv.headers);
      setFile({ name: picked.name, csv });
      setMapping(guessed);
      setOrder(guessed.date ? guessDateOrder(csv.rows.map((r) => r[guessed.date!] ?? '')) : 'dmy');
      setStep('map');
    } catch {
      toast('Couldn’t read that file');
    } finally {
      setReading(false);
    }
  };

  const runImport = async () => {
    if (!account) return;
    setProgress({ done: 0, total: ready.length });
    setStep('importing');
    try {
      const res = await importCsvRows(rows, {
        defaultAccountId: account.id,
        onProgress: (done, total) => {
          if (done === total || done % 5 === 0) setProgress({ done, total });
        },
      });
      setResult({ ...res, skipped: problems });
      setStep('done');
      toast(`Imported ${countLabel(res.created, 'record')}`);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Couldn’t import the file');
      setStep('preview');
    }
  };

  const leave = () => (router.canGoBack() ? goBack() : router.replace('/data'));
  const onBack = () => {
    if (step === 'importing') toast('Wait until the import finishes');
    else if (step === 'map') setStep('pick');
    else if (step === 'preview') setStep('map');
    else leave();
  };

  /* ----- mapping ----- */

  const hasAmount = Boolean(mapping?.amount || mapping?.debit || mapping?.credit);
  const mappingProblem = !mapping?.date ? 'Choose the date column' : !hasAmount ? 'Choose the amount column' : !account ? 'Choose an account' : null;
  const targets: Target[] = ['date', 'time', 'amount', ...(mapping?.amount ? [] : (['debit', 'credit'] as Target[])), 'type', 'currency', 'account', 'category', 'payee', 'note'];

  const dateSample = useMemo(() => {
    if (!file || !mapping?.date) return null;
    const row = file.csv.rows.find((r) => r[mapping.date!]?.trim());
    if (!row) return null;
    const value = row[mapping.date].trim();
    const ts = parseDate(value, mapping.time ? row[mapping.time] : undefined, order);
    return { value, ts };
  }, [file, mapping, order]);

  const directionHint = !mapping
    ? undefined
    : mapping.amount && !mapping.type
      ? 'Without a Type column, every row counts as spending.'
      : !mapping.amount && (mapping.debit || mapping.credit)
        ? 'Debits count as spending and credits as income.'
        : undefined;

  /* ----- footer ----- */

  const footer =
    step === 'pick' ? (
      <Button label="Choose a CSV file" size="lg" full loading={reading} onPress={pick} testID="csv-pick" />
    ) : step === 'map' ? (
      <Button label={mappingProblem ?? 'Preview import'} size="lg" full disabled={Boolean(mappingProblem)} onPress={() => setStep('preview')} testID="csv-preview" />
    ) : step === 'preview' ? (
      <Button
        label={ready.length ? `Import ${countLabel(ready.length, 'record')}` : 'Nothing to import'}
        size="lg"
        full
        disabled={!ready.length}
        onPress={runImport}
        testID="csv-import"
      />
    ) : step === 'done' ? (
      <Button label="Done" size="lg" full onPress={leave} testID="csv-done" />
    ) : undefined;

  return (
    <Screen title="Import CSV" back={onBack} footer={footer} testID="csv-import-page">
      {step === 'pick' ? (
        <StepHeader
          step={1}
          of={3}
          title="Choose a CSV file"
          body="Export a spreadsheet as CSV from another budgeting app or your bank. The first row should name the columns."
        />
      ) : null}

      {step === 'map' && file && mapping ? (
        <>
          <StepHeader step={2} of={3} title="Match the columns" body={`${file.name} has ${countLabel(file.csv.rows.length, 'row')}. Check what each column holds.`} />

          <Section title="Columns" footer={directionHint}>
            {targets.map((t, i) => {
              const needed = (t === 'date' && !mapping.date) || (t === 'amount' && !hasAmount);
              return (
                <FieldRow
                  key={t}
                  testID={`csv-map-${t}`}
                  label={TARGETS[t].label}
                  value={mapping[t]}
                  placeholder={needed ? 'Choose' : 'Not used'}
                  needed={needed}
                  divider={i < targets.length - 1}
                  onPress={() => {
                    setTarget(t);
                    setSheet('column');
                  }}
                />
              );
            })}
          </Section>

          <Section title="Date order">
            <View className="px-5">
              <SegmentedControl options={ORDERS} value={order} onChange={setOrder} testID="csv-date-order" />
            </View>
            {dateSample ? (
              <Text variant="caption" tone={dateSample.ts ? 'graphite' : 'alert'} className="mt-2 px-5" testID="csv-date-sample">
                {dateSample.ts
                  ? `“${dateSample.value}” reads as ${format(dateSample.ts, 'd MMMM yyyy')}.`
                  : `“${dateSample.value}” isn’t a date in this order.`}
              </Text>
            ) : null}
          </Section>

          <Section
            title="Account"
            footer={mapping.account ? 'Rows whose account name doesn’t match one of yours go here.' : 'Every row goes into this account.'}
          >
            <FieldRow
              testID="csv-default-account"
              label="Default account"
              value={account?.name}
              needed
              left={account ? <View className="h-2 w-2 rounded-full" style={{ backgroundColor: account.color }} /> : null}
              divider={false}
              onPress={() => setSheet('account')}
            />
          </Section>
        </>
      ) : null}

      {step === 'preview' ? (
        <>
          <StepHeader step={3} of={3} title="Check before importing" />
          <View className="px-5 pt-2">
            <Text variant="body" tabular testID="csv-counts">
              {formatCount(ready.length)} ready
              {problems ? (
                <Text variant="body" tone="alert" tabular>
                  , {formatCount(problems)} with problems
                </Text>
              ) : null}
            </Text>
            {ready.length ? (
              <Text variant="caption" tone="graphite" tabular className="mt-1">
                {formatCount(spending)} spending and {formatCount(ready.length - spending)} income
              </Text>
            ) : null}
          </View>

          <Section title="First rows" footer="Rows with problems are skipped. Categories that don’t match yours are filed under Others › Missing.">
            {rows.slice(0, PREVIEW_COUNT).map((r, i, arr) => (
              <PreviewRow key={r.index} row={r} divider={i < arr.length - 1} />
            ))}
          </Section>
        </>
      ) : null}

      {step === 'importing' ? <ImportProgress done={progress.done} total={progress.total} /> : null}

      {step === 'done' && result ? (
        <>
          <StepHeader
            title={`Imported ${countLabel(result.created, 'record')}`}
            body="Find them in Records. Anything under Others › Missing still needs a category."
          />
          <Section>
            <ListRow title="Imported" value={formatCount(result.created)} divider={Boolean(result.skipped || result.failed)} testID="csv-result-created" />
            {result.skipped ? (
              <ListRow title="Skipped" subtitle="Rows with a missing date or amount" value={formatCount(result.skipped)} divider={Boolean(result.failed)} testID="csv-result-skipped" />
            ) : null}
            {result.failed ? (
              <ListRow title="Couldn’t be saved" subtitle="Usually a currency without an exchange rate" value={formatCount(result.failed)} divider={false} testID="csv-result-failed" />
            ) : null}
          </Section>
        </>
      ) : null}

      <ColumnChoiceSheet
        visible={sheet === 'column'}
        onClose={() => setSheet(null)}
        title={TARGETS[target].label}
        subtitle={TARGETS[target].hint}
        headers={file?.csv.headers ?? []}
        samples={samples}
        selected={mapping?.[target] ?? null}
        onSelect={(h) => {
          setMapping((m) => (m ? { ...m, [target]: h } : m));
          if (target === 'date' && h && file) setOrder(guessDateOrder(file.csv.rows.map((r) => r[h] ?? '')));
        }}
      />
      <AccountPicker visible={sheet === 'account'} onClose={() => setSheet(null)} selected={accountId} onSelect={setAccountId} title="Default account" />
    </Screen>
  );
}

function PreviewRow({ row, divider }: { row: ImportRow; divider: boolean }) {
  const title = row.payee ?? row.note ?? row.category ?? 'No description';
  const details = [row.date ? format(row.date, 'd MMM yyyy') : null, row.category && row.category !== title ? row.category : null].filter(Boolean).join(', ');
  return (
    <View testID={`csv-preview-row-${row.index + 1}`}>
      <View className="min-h-[56px] flex-row items-center px-5 py-3">
        <View className="flex-1 pr-3">
          <Text variant="body" numberOfLines={1}>
            {title}
          </Text>
          {row.error ? (
            <Text variant="caption" tone="danger" className="mt-0.5">
              Row {row.index + 2}: {row.error.toLowerCase()}
            </Text>
          ) : details ? (
            <Text variant="caption" tone="graphite" numberOfLines={1} className="mt-0.5">
              {details}
            </Text>
          ) : null}
        </View>
        {row.amount != null ? <Money minor={row.type === 'expense' ? -row.amount : row.amount} size="sm" colorIncome sign="always" /> : null}
      </View>
      {divider ? <Divider /> : null}
    </View>
  );
}
