import { Stack, ThemeProvider as NavThemeProvider, router, type Theme } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo } from 'react';
import { AppState } from 'react-native';

import { usePendingSummary } from '../../inbox/data/inboxRepo';
import { refreshTodayRates } from '../../integrations/utils/fx';
import { applySmsConfig, onSmsQueued } from '../../integrations/utils/androidSms';
import { drainShortcutQueue } from '../../integrations/utils/intents';
import { refreshReviewWidget } from '../../integrations/utils/reviewWidget';
import { configureNotifications, refreshReminders, subscribeNotificationTaps } from '../../integrations/utils/notifications';
import { AliasPromptHost } from '../../payees/components/AliasPrompt';
import { processDueRecurring } from '../../recurring/data/recurringRepo';
import { rememberTimeZone, startAutoSync, syncNow } from '../../sync/data/syncEngine';
import { repairBaseAmounts } from '../../transactions/data/transactionsRepo';
import { SheetHost } from '../components/BottomSheet';
import { ConfirmHost, ToastHost, toast } from '../components/Feedback';
import { useSettings } from '../settings/settingsStore';
import { useTheme } from '../theme/ThemeProvider';

configureNotifications();

let foregroundRun: Promise<void> | null = null;

function announceClaude(r: Awaited<ReturnType<typeof syncNow>>) {
  if (r.status === 'ok' && r.fromClaude > 0) toast(r.fromClaude === 1 ? 'Claude made a change' : `Claude made ${r.fromClaude} changes`, { label: 'See', onPress: () => router.push('/claude-activity') });
}

/** Catch-up work on launch and on return; one run at a time so planned payments never double up. */
function onForeground(base: string): Promise<void> {
  foregroundRun ??= catchUp(base).finally(() => {
    foregroundRun = null;
  });
  return foregroundRun;
}

async function catchUp(base: string) {
  // Bank messages and Apple Pay payments that Shortcuts (iPhone) or the SMS receiver (Android)
  // handed over while the app was closed.
  await drainShortcutQueue().catch((e) => console.warn('[mula] shortcuts', e));
  await rememberTimeZone().catch(() => undefined);
  // Claude's edits since last time, before planned payments run (Claude may have paused one).
  // A no-op until the relay is connected.
  await syncNow().then(announceClaude, (e) => console.warn('[mula] sync', e));
  await processDueRecurring().catch((e) => console.warn('[mula] recurring', e));
  await refreshReminders().catch((e) => console.warn('[mula] reminders', e));
  void refreshTodayRates(base).then(repairBaseAmounts).catch(() => undefined);
}

export function AppShell() {
  const { c, scheme } = useTheme();
  const onboarded = useSettings((s) => s.onboarded);
  const baseCurrency = useSettings((s) => s.baseCurrency);

  const navTheme = useMemo<Theme>(
    () => ({
      dark: scheme === 'dark',
      colors: { primary: c.accent, background: c.paper, card: c.paper, text: c.ink, border: c.hairline, notification: c.accent },
      fonts: {
        regular: { fontFamily: 'HostGrotesk_400Regular', fontWeight: '400' },
        medium: { fontFamily: 'HostGrotesk_500Medium', fontWeight: '500' },
        bold: { fontFamily: 'HostGrotesk_600SemiBold', fontWeight: '600' },
        heavy: { fontFamily: 'HostGrotesk_700Bold', fontWeight: '700' },
      },
    }),
    [c, scheme],
  );

  useEffect(() => {
    if (!onboarded) router.replace('/onboarding');
  }, [onboarded]);

  // Android: keep the SMS receiver in step with Automation settings (on/off, senders, notifications).
  const smsCapture = useSettings((s) => s.smsCapture);
  const smsNotify = useSettings((s) => s.smsNotify);
  const smsExtraSenders = useSettings((s) => s.smsExtraSenders);
  const settingsLoaded = useSettings((s) => s.loaded);
  useEffect(() => {
    applySmsConfig();
  }, [settingsLoaded, smsCapture, smsNotify, smsExtraSenders]);

  const { data: pending } = usePendingSummary();
  useEffect(() => {
    void refreshReviewWidget();
  }, [pending?.count, pending?.oldest]);

  useEffect(() => {
    void onForeground(baseCurrency);
    // Only a real return from the background counts: iOS also flips to "inactive" and back for
    // Control Center, Face ID and system alerts.
    let last = AppState.currentState;
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active' && last === 'background') void onForeground(baseCurrency);
      if (s === 'background') void refreshReviewWidget();
      last = s;
    });
    const unsubTaps = subscribeNotificationTaps((url) => router.push(url as never));
    // Android: a bank SMS caught while Mula is open goes straight to the inbox.
    const unsubSms = onSmsQueued(() => void drainShortcutQueue().catch(() => undefined));
    const stopSync = startAutoSync((n) => announceClaude({ status: 'ok', pushed: 0, pulled: n, fromClaude: n }));
    return () => {
      sub.remove();
      unsubTaps();
      unsubSms();
      stopSync();
    };
  }, [baseCurrency]);

  return (
    <NavThemeProvider value={navTheme}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      {/* Add and Review slide up as regular screens (not native modals), so the sheet layer
          below covers them like any other screen. */}
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.paper }, animation: 'default' }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="add" options={{ animation: 'slide_from_bottom', gestureDirection: 'vertical', fullScreenGestureEnabled: false }} />
        <Stack.Screen name="review" options={{ animation: 'slide_from_bottom', gestureDirection: 'vertical', fullScreenGestureEnabled: false }} />
        <Stack.Screen name="onboarding" options={{ gestureEnabled: false, animation: 'fade' }} />
      </Stack>
      <AliasPromptHost />
      <ConfirmHost />
      <SheetHost />
      <ToastHost />
    </NavThemeProvider>
  );
}
