export type { Frequency, Recurring, RecurringEnd, RecurringMode } from '../../shared/db/types';
export type { RecurringInput, Upcoming } from '../data/recurringRepo';
export type { RecurrenceRule } from '../utils/recurrence';

/** The form's type switch; InstaPay is stored as an expense (or transfer) with `isInstapay`. */
export type RecurringKind = 'expense' | 'income' | 'transfer' | 'instapay';
