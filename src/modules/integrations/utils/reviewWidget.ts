import { requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';

import { listInbox, pendingSummary } from '../../inbox/data/inboxRepo';
import { SMS_KIND_LABEL, suggestPayeeName } from '../../inbox/utils/parser';
import { formatMoney } from '../../shared/utils/money';
import type { ReviewInboxProps } from '../widgets/ReviewInboxWidget';

type ReviewWidget = { updateSnapshot(props: ReviewInboxProps): void };

let widget: ReviewWidget | null | undefined;

/** The widget, in builds that include it (not Expo Go, not the web). */
function getWidget(): ReviewWidget | null {
  if (widget !== undefined) return widget;
  widget = null;
  if (Platform.OS === 'ios' && requireOptionalNativeModule('ExpoWidgets')) {
    try {
      // Loaded lazily: importing expo-widgets throws where its native module is missing.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      widget = (require('../widgets/ReviewInboxWidget') as { default: ReviewWidget }).default;
    } catch {
      widget = null;
    }
  }
  return widget;
}

/** Pushes the current review queue to the home screen widget. */
export async function refreshReviewWidget(): Promise<void> {
  const w = getWidget();
  if (!w) return;
  try {
    const [summary, pending] = await Promise.all([pendingSummary(), listInbox('pending', 3)]);
    const items = pending.map((item) => {
      const p = item.parsed;
      const title = p?.counterparty ? suggestPayeeName(p.counterparty) : p ? SMS_KIND_LABEL[p.kind] : item.rawText.slice(0, 40);
      const amount = p ? formatMoney(p.amount, { currency: p.currency }) : '';
      return { title, amount };
    });
    w.updateSnapshot({ count: summary.count, oldest: summary.oldest ?? 0, items });
  } catch {
    // The widget simply keeps its last state.
  }
}
