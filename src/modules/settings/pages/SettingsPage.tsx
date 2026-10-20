import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { useCallback, useEffect, useState } from 'react';
import { AppState, Linking, Platform, View } from 'react-native';

import { ensurePermission, refreshReminders } from '../../integrations/utils/notifications';
import { Button } from '../../shared/components/Button';
import { confirm, toast } from '../../shared/components/Feedback';
import { Stepper, TextField, ToggleRow } from '../../shared/components/Fields';
import { ListRow, Section } from '../../shared/components/List';
import { SegmentedControl } from '../../shared/components/SegmentedControl';
import { Text } from '../../shared/components/Text';
import { Screen } from '../../shared/layouts/Screen';
import { INSTAPAY_DEFAULT_FEE, setSetting, useSettings, type FeeRule, type Settings } from '../../shared/settings/settingsStore';
import type { Appearance } from '../../shared/theme/tokens';
import { CURRENCY_NAMES, formatMoney } from '../../shared/utils/money';
import { CurrencyPicker } from '../../transactions/components/Pickers';
import { instapayFee } from '../../transactions/utils/instapay';
import { feeDraftFrom, hourLabel, parseFeeDraft, sameFee, type FeeDraft } from '../utils/settingsFormat';

const PHONE_SETTINGS = Platform.OS === 'android' ? 'Android settings' : 'iPhone Settings';

const APPEARANCES: { value: Appearance; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

type Permission = { granted: boolean; canAskAgain: boolean };

const isWeb = Platform.OS === 'web';

/** Saves a reminder setting and reschedules what's pending. */
async function setReminder<K extends keyof Settings>(key: K, value: Settings[K]) {
  await setSetting(key, value);
  void refreshReminders().catch(() => undefined);
}

export default function SettingsPage() {
  const settings = useSettings();
  const [currencySheet, setCurrencySheet] = useState(false);
  const [permission, setPermission] = useState<Permission | null>(null);
  const [fee, setFee] = useState<FeeDraft>(() => feeDraftFrom(settings.instapayFee));

  /* ----- notifications permission ----- */

  const readPermission = useCallback(async () => {
    if (isWeb) return;
    try {
      const p = await Notifications.getPermissionsAsync();
      setPermission({ granted: p.granted, canAskAgain: p.canAskAgain });
    } catch {
      setPermission(null);
    }
  }, []);

  useEffect(() => {
    void readPermission();
    // Coming back from the phone's settings may have changed it.
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') void readPermission();
    });
    return () => sub.remove();
  }, [readPermission]);

  const allowNotifications = async () => {
    const ok = await ensurePermission();
    await readPermission();
    if (ok) {
      void refreshReminders().catch(() => undefined);
      toast('Notifications allowed');
    } else {
      toast(`Notifications are off. Turn them on in ${PHONE_SETTINGS}.`);
    }
  };

  /* ----- base currency ----- */

  const chooseBaseCurrency = async (code: string) => {
    if (code === settings.baseCurrency) return;
    const ok = await confirm({
      title: `Use ${code} as the base currency?`,
      message: `Totals and statistics switch to ${code}. Records you already have keep the ${settings.baseCurrency} values stored with them.`,
      confirmLabel: `Switch to ${code}`,
    });
    if (!ok) return;
    await setSetting('baseCurrency', code);
    toast(`Base currency set to ${code}`);
  };

  /* ----- InstaPay fee ----- */

  // Follow the stored rule when it changes elsewhere (reset, restore from backup).
  useEffect(() => {
    setFee(feeDraftFrom(settings.instapayFee));
  }, [settings.instapayFee]);

  const draft = parseFeeDraft(fee);
  const dirty = !draft.rule || !sameFee(draft.rule, settings.instapayFee);
  const isDefault = sameFee(settings.instapayFee, INSTAPAY_DEFAULT_FEE);
  const example: FeeRule = draft.rule ?? settings.instapayFee;

  const saveFee = async () => {
    if (!draft.rule) {
      toast(draft.problem);
      return;
    }
    await setSetting('instapayFee', draft.rule);
    toast('InstaPay fee saved');
  };

  const resetFee = async () => {
    await setSetting('instapayFee', INSTAPAY_DEFAULT_FEE);
    setFee(feeDraftFrom(INSTAPAY_DEFAULT_FEE));
    toast('InstaPay fee reset to the official tariff');
  };

  const version = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <Screen title="Settings" back testID="settings-page">
      <Section title="Appearance">
        <View className="px-5">
          <SegmentedControl options={APPEARANCES} value={settings.appearance} onChange={(v) => void setSetting('appearance', v)} testID="settings-appearance" />
        </View>
      </Section>

      <Section title="Money" footer="Totals and statistics are shown in this currency. Other currencies are converted at the day’s rate.">
        <ListRow
          testID="settings-base-currency"
          title="Base currency"
          subtitle={CURRENCY_NAMES[settings.baseCurrency]}
          value={settings.baseCurrency}
          chevron
          divider={false}
          onPress={() => setCurrencySheet(true)}
        />
      </Section>

      <Section title="InstaPay fee" footer="InstaPay charges 0.1% per transfer, at least EGP 0.50 and at most EGP 20 (since April 2025).">
        <TextField
          testID="settings-fee-percent"
          label="Percent of the amount"
          value={fee.percent}
          onChangeText={(percent) => setFee((f) => ({ ...f, percent }))}
          keyboardType="decimal-pad"
          placeholder="0.1"
          right={<Text variant="label" tone="graphite">%</Text>}
          hint={`A transfer of EGP 1,000 costs ${formatMoney(instapayFee(100000, example), { currency: 'EGP' })}.`}
          error={draft.field === 'percent' ? draft.problem : null}
        />
        <TextField
          testID="settings-fee-min"
          label="Minimum fee"
          value={fee.min}
          onChangeText={(min) => setFee((f) => ({ ...f, min }))}
          keyboardType="decimal-pad"
          placeholder="0.50"
          right={<Text variant="label" tone="graphite">EGP</Text>}
        />
        <TextField
          testID="settings-fee-max"
          label="Maximum fee"
          value={fee.max}
          onChangeText={(max) => setFee((f) => ({ ...f, max }))}
          keyboardType="decimal-pad"
          placeholder="20.00"
          right={<Text variant="label" tone="graphite">EGP</Text>}
          error={draft.field === 'amounts' ? draft.problem : null}
        />
        <View className="mt-2 flex-row flex-wrap items-center gap-2 px-5">
          {dirty ? <Button label="Save fee" size="sm" onPress={saveFee} disabled={!draft.rule} testID="settings-fee-save" /> : null}
          <Button
            label="Reset to the official tariff"
            variant="ghost"
            size="sm"
            disabled={isDefault && !dirty}
            onPress={resetFee}
            testID="settings-fee-reset"
          />
        </View>
      </Section>

      <Section title="Reminders">
        {isWeb ? (
          <ListRow title="Notifications" subtitle="Notifications work in the phone app" testID="settings-notifications" />
        ) : (
          <ListRow
            testID="settings-notifications"
            title="Notifications"
            subtitle={
              permission == null
                ? 'Checking'
                : permission.granted
                  ? 'Allowed'
                  : permission.canAskAgain
                    ? 'Not allowed yet'
                    : `Turned off in ${PHONE_SETTINGS}`
            }
            right={
              permission && !permission.granted ? (
                permission.canAskAgain ? (
                  <Button label="Allow notifications" size="sm" variant="secondary" onPress={allowNotifications} testID="settings-allow-notifications" />
                ) : (
                  <Button label="Open Settings" size="sm" variant="secondary" onPress={() => void Linking.openSettings()} testID="settings-open-system-settings" />
                )
              ) : null
            }
          />
        )}
        <ToggleRow
          testID="settings-digest"
          title="Daily reminder"
          subtitle="An evening nudge about payments still to review"
          value={settings.digestEnabled}
          onChange={(v) => void setReminder('digestEnabled', v)}
        />
        {settings.digestEnabled ? (
          <ListRow
            title="Reminder time"
            right={
              <View testID="settings-digest-hour">
                <Stepper value={settings.digestHour} min={0} max={23} format={hourLabel} onChange={(h) => void setReminder('digestHour', h)} />
              </View>
            }
          />
        ) : null}
        <ToggleRow
          testID="settings-backup-reminder"
          title="Weekly backup reminder"
          subtitle="Reminds you to export a backup once the last one is a week old"
          value={settings.backupReminderEnabled}
          onChange={(v) => void setReminder('backupReminderEnabled', v)}
          divider={false}
        />
      </Section>

      <Section title="About" footer="Your data stays on this phone.">
        <ListRow title="Version" value={version} divider={false} testID="settings-version" />
      </Section>

      <CurrencyPicker visible={currencySheet} onClose={() => setCurrencySheet(false)} selected={settings.baseCurrency} onSelect={(code) => void chooseBaseCurrency(code)} />
    </Screen>
  );
}
