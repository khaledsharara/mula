import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

import { pendingSummary } from '../../inbox/data/inboxRepo';
import { listRecurring } from '../../recurring/data/recurringRepo';
import { getSettings } from '../../shared/settings/settingsStore';
import { formatMoney } from '../../shared/utils/money';

const supported = Platform.OS !== 'web';

const DIGEST_PREFIX = 'digest-';
const RECURRING_PREFIX = 'recurring-';
const BACKUP_ID = 'backup-reminder';

export function configureNotifications(): void {
  if (!supported) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: true,
    }),
  });
}

export async function ensurePermission(): Promise<boolean> {
  if (!supported) return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const next = await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowBadge: true, allowSound: true } });
  return next.granted;
}

async function cancelWithPrefix(prefix: string): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled.filter((n) => n.identifier.startsWith(prefix)).map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
}

/**
 * Keeps the accountability loop current: icon badge = items waiting, and the next week of
 * evening reminders reflect the backlog as it stands now.
 */
export async function refreshReminders(): Promise<void> {
  if (!supported) return;
  const settings = getSettings();
  const { count } = await pendingSummary();
  await Notifications.setBadgeCountAsync(count).catch(() => undefined);

  const perm = await Notifications.getPermissionsAsync();
  if (!perm.granted) return;

  await cancelWithPrefix(DIGEST_PREFIX);
  if (settings.digestEnabled) {
    const now = new Date();
    for (let d = 0; d < 7; d++) {
      const at = new Date(now.getFullYear(), now.getMonth(), now.getDate() + d, settings.digestHour, 0, 0);
      if (at.getTime() <= now.getTime()) continue;
      await Notifications.scheduleNotificationAsync({
        identifier: `${DIGEST_PREFIX}${d}`,
        content: {
          title: count > 0 ? `${count} ${count === 1 ? 'payment needs' : 'payments need'} details` : 'Anything to log today?',
          body: count > 0 ? 'Open Mula to review what your bank reported.' : 'Cash spending never reaches your bank SMS. Add it while you remember.',
          data: { url: count > 0 ? '/review' : '/add' },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at },
      });
    }
  }

  await cancelWithPrefix(RECURRING_PREFIX);
  const recurring = await listRecurring();
  for (const r of recurring) {
    if (!r.active || r.nextDue == null || r.remindDaysBefore < 0) continue;
    const day = new Date(r.nextDue - r.remindDaysBefore * 86_400_000);
    day.setHours(10, 0, 0, 0);
    if (day.getTime() <= Date.now()) continue;
    await Notifications.scheduleNotificationAsync({
      identifier: `${RECURRING_PREFIX}${r.id}`,
      content: {
        title: r.remindDaysBefore === 0 ? `${r.name} is due today` : `${r.name} is due in ${r.remindDaysBefore} ${r.remindDaysBefore === 1 ? 'day' : 'days'}`,
        body: r.amount ? formatMoney(r.amount, { currency: r.currency ?? settings.baseCurrency }) : 'Planned payment',
        data: { url: `/recurring/${r.id}` },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: day },
    });
  }

  await Notifications.cancelScheduledNotificationAsync(BACKUP_ID).catch(() => undefined);
  if (settings.backupReminderEnabled) {
    const last = settings.lastBackupAt ?? Date.now();
    const at = new Date(Math.max(last + 7 * 86_400_000, Date.now() + 3_600_000));
    at.setHours(11, 0, 0, 0);
    // Overdue and already past 11:00: remind tomorrow (iOS rejects dates in the past).
    if (at.getTime() <= Date.now()) at.setDate(at.getDate() + 1);
    await Notifications.scheduleNotificationAsync({
      identifier: BACKUP_ID,
      content: {
        title: 'Back up your Mula data',
        body: 'Your records live only on this phone. Export a backup to Files.',
        data: { url: '/data' },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at },
    });
  }
}

/**
 * Opens the route a notification points at when it's tapped, including the tap that launched
 * the app (it arrives before this listener exists, so it is read back once).
 */
export function subscribeNotificationTaps(onUrl: (url: string) => void): () => void {
  if (!supported) return () => undefined;
  const open = (resp: Notifications.NotificationResponse | null) => {
    const url = resp?.notification.request.content.data?.url;
    if (typeof url === 'string') onUrl(url);
  };
  const launch = Notifications.getLastNotificationResponse();
  if (launch) {
    open(launch);
    Notifications.clearLastNotificationResponse();
  }
  const sub = Notifications.addNotificationResponseReceivedListener(open);
  return () => sub.remove();
}
