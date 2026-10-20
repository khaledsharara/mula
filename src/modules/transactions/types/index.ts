import type { ID, Minor, Nature, PaymentType, Transaction, TxSource, TxType } from '../../shared/db/types';

export type { Transaction, TxType, PaymentType } from '../../shared/db/types';

/** What the add/edit form and the inbox hand to the repository. */
export type TxInput = {
  type: TxType;
  /** In the account's currency. */
  amount: Minor;
  accountId: ID;
  toAccountId?: ID | null;
  /** Amount landing in the destination account (cross-currency transfers). */
  toAmount?: Minor | null;
  categoryId?: ID | null;
  payeeId?: ID | null;
  paymentType: PaymentType;
  date: number;
  note?: string | null;
  isInstapay?: boolean;
  /** InstaPay (or other) fee; stored as a linked "Charges, Fees" expense. */
  fee?: Minor | null;
  natureOverride?: Nature | null;
  /** When entered in another currency: the amount as typed and the rate used. */
  original?: { amount: Minor; currency: string; rate: number } | null;
  recurringId?: ID | null;
  debtId?: ID | null;
  source?: TxSource;
  sourceRef?: string | null;
};

/** A list row: the transaction plus its linked fee total. */
export type TxListItem = Transaction & { feeTotal: Minor };

export type TxFilter = {
  accountId?: ID | null;
  categoryIds?: ID[] | null;
  payeeId?: ID | null;
  debtId?: ID | null;
  types?: TxType[] | null;
  search?: string | null;
  from?: number | null;
  to?: number | null;
  limit?: number;
};

export const PAYMENT_TYPES: { value: PaymentType; label: string; icon: string }[] = [
  { value: 'debit_card', label: 'Debit card', icon: 'credit-card' },
  { value: 'apple_pay', label: 'Apple Pay', icon: 'smartphone-nfc' },
  { value: 'instapay', label: 'InstaPay', icon: 'zap' },
  { value: 'cash', label: 'Cash', icon: 'banknote' },
  { value: 'credit_card', label: 'Credit card', icon: 'credit-card' },
  { value: 'bank_transfer', label: 'Bank transfer', icon: 'landmark' },
  { value: 'mobile_wallet', label: 'Mobile wallet', icon: 'wallet' },
  { value: 'web_payment', label: 'Web payment', icon: 'app-window' },
  { value: 'voucher', label: 'Voucher', icon: 'ticket-percent' },
];

export const paymentTypeLabel = (p: PaymentType): string => PAYMENT_TYPES.find((x) => x.value === p)?.label ?? p;
