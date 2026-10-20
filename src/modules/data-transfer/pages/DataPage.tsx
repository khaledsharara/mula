import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator } from 'react-native';

import { listAccounts } from '../../accounts/data/accountsRepo';
import { SUPPORTED_BANK_NAMES } from '../../banks';
import { listCategories } from '../../categories/data/categoriesRepo';
import { refreshReminders } from '../../integrations/utils/notifications';
import { listPayees } from '../../payees/data/payeesRepo';
import { BottomSheet } from '../../shared/components/BottomSheet';
import { confirm, toast } from '../../shared/components/Feedback';
import { ListRow, Section } from '../../shared/components/List';
import { IconTile } from '../../shared/components/Misc';
import { Screen } from '../../shared/layouts/Screen';
import { setSetting, useSettings } from '../../shared/settings/settingsStore';
import { useTheme } from '../../shared/theme/ThemeProvider';
import { isoDay, shortDate } from '../../shared/utils/dates';
import { pickTextFile, saveAndShare } from '../../shared/utils/files';
import { listTransactions } from '../../transactions/data/transactionsRepo';
import { createBackup, readBackup, restoreBackup } from '../utils/backup';
import { transactionsToCsv } from '../utils/csv';
import { countLabel, describeBackup, lastBackupLine } from '../utils/format';
import { PERIOD_LABELS, rangeDescription, rangeFileSuffix, rangeStart, type PeriodRange } from '../utils/ranges';

type Busy = null | 'backup' | 'restore' | 'csv';

const EXPORT_RANGES: PeriodRange[] = ['month', 'last3', 'year', 'all'];

const NOTHING_TO_EXPORT: Record<PeriodRange, string> = {
  month: 'No records this month',
  last3: 'No records in the last 3 months',
  year: 'No records this year',
  all: 'No records to export yet',
};

const errorText = (e: unknown, fallback: string) => (e instanceof Error && e.message ? e.message : fallback);

export default function DataPage() {
  const { c } = useTheme();
  const lastBackupAt = useSettings((s) => s.lastBackupAt);
  const [busy, setBusy] = useState<Busy>(null);
  const [rangeSheet, setRangeSheet] = useState(false);

  const spinner = (kind: Busy) => (busy === kind ? <ActivityIndicator color={c.graphite} /> : null);

  const exportBackup = async () => {
    setBusy('backup');
    try {
      const backup = await createBackup();
      const how = await saveAndShare(`mula-backup-${isoDay(Date.now())}.json`, JSON.stringify(backup), 'application/json');
      // The share sheet closes the same way whether the file was saved or not, so ask.
      const saved =
        how === 'downloaded' ||
        (await confirm({
          title: 'Did the backup save?',
          message: 'Your phone doesn’t tell Mula whether you saved the file or closed the sheet.',
          confirmLabel: 'Yes, it’s saved',
          cancelLabel: 'No, not yet',
        }));
      if (!saved) return;
      await setSetting('lastBackupAt', Date.now());
      void refreshReminders().catch(() => undefined);
      toast('Backup saved');
    } catch (e) {
      toast(errorText(e, 'Couldn’t export the backup'));
    } finally {
      setBusy(null);
    }
  };

  const restore = async () => {
    let picked;
    try {
      picked = await pickTextFile('json');
    } catch {
      toast('Couldn’t open that file');
      return;
    }
    if (!picked) return;

    let parsed: ReturnType<typeof readBackup>;
    try {
      parsed = readBackup(picked.text);
    } catch (e) {
      toast(errorText(e, 'This isn’t a Mula backup file.'));
      return;
    }

    const exported = Date.parse(parsed.summary.exportedAt);
    const from = Number.isFinite(exported) ? ` from ${shortDate(exported)}` : '';
    const ok = await confirm({
      title: 'Restore this backup?',
      message: `Replaces everything on this phone with ${describeBackup(parsed.backup)}${from}. This can’t be undone.`,
      confirmLabel: 'Replace with backup',
      destructive: true,
    });
    if (!ok) return;

    setBusy('restore');
    try {
      await restoreBackup(parsed.backup);
      toast('Backup restored');
    } catch (e) {
      toast(errorText(e, 'Couldn’t restore the backup'));
    } finally {
      setBusy(null);
    }
  };

  const exportCsv = async (range: PeriodRange) => {
    setRangeSheet(false);
    setBusy('csv');
    try {
      const now = Date.now();
      const [txs, accounts, categories, payees] = await Promise.all([
        listTransactions({ from: rangeStart(range, now), to: now, limit: 100000 }),
        listAccounts(true),
        listCategories(true),
        listPayees(),
      ]);
      if (!txs.length) {
        toast(NOTHING_TO_EXPORT[range]);
        return;
      }
      // Oldest first, the way spreadsheets and bank statements read.
      const csv = transactionsToCsv([...txs].reverse(), {
        accounts: new Map(accounts.map((a) => [a.id, a])),
        categories: new Map(categories.map((x) => [x.id, x])),
        payees: new Map(payees.map((p) => [p.id, p])),
      });
      await saveAndShare(`mula-records-${rangeFileSuffix(range, now)}.csv`, csv, 'text/csv');
      toast(`Exported ${countLabel(txs.length, 'record')}`);
    } catch (e) {
      toast(errorText(e, 'Couldn’t export the records'));
    } finally {
      setBusy(null);
    }
  };

  const idle = busy === null;

  return (
    <Screen title="Import and export" back testID="data-page">
      <Section title="Backup" footer="Everything lives on this phone. Keep a recent backup in Files.">
        <ListRow
          testID="data-export-backup"
          title="Export backup"
          subtitle={lastBackupAt ? lastBackupLine(lastBackupAt) : 'No backup yet'}
          left={<IconTile icon="upload" size={36} muted />}
          right={spinner('backup')}
          chevron={busy !== 'backup'}
          onPress={idle ? exportBackup : undefined}
        />
        <ListRow
          testID="data-restore-backup"
          title="Restore from a backup"
          subtitle="Replaces what’s on this phone"
          left={<IconTile icon="download" size={36} muted />}
          right={spinner('restore')}
          chevron={busy !== 'restore'}
          divider={false}
          onPress={idle ? restore : undefined}
        />
      </Section>

      <Section title="Spreadsheet">
        <ListRow
          testID="data-export-csv"
          title="Export records as CSV"
          subtitle="Opens in Numbers, Excel or Google Sheets"
          left={<IconTile icon="file-spreadsheet" size={36} muted />}
          right={spinner('csv')}
          chevron={busy !== 'csv'}
          onPress={idle ? () => setRangeSheet(true) : undefined}
        />
        <ListRow
          testID="data-import-csv"
          title="Import a CSV file"
          subtitle="From another app or a bank statement"
          left={<IconTile icon="download" size={36} muted />}
          chevron
          divider={false}
          onPress={idle ? () => router.push('/data/csv-import') : undefined}
        />
      </Section>

      <Section title="Bank history">
        <ListRow
          testID="data-import-sms"
          title={`Import ${SUPPORTED_BANK_NAMES} SMS history`}
          subtitle="Adds past payments from an exported message history"
          left={<IconTile icon="message-square-text" size={36} muted />}
          chevron
          divider={false}
          onPress={idle ? () => router.push('/data/sms-import') : undefined}
        />
      </Section>

      <BottomSheet visible={rangeSheet} onClose={() => setRangeSheet(false)} title="Export records" subtitle="Choose which records go in the file." testID="csv-range-sheet">
        {EXPORT_RANGES.map((r, i) => (
          <ListRow
            key={r}
            testID={`csv-range-${r}`}
            title={PERIOD_LABELS[r]}
            subtitle={rangeDescription(r)}
            divider={i < EXPORT_RANGES.length - 1}
            onPress={() => void exportCsv(r)}
          />
        ))}
      </BottomSheet>
    </Screen>
  );
}
