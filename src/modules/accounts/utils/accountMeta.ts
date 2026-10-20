import type { AccountType, PaymentType } from '../../shared/db/types';

export const ACCOUNT_TYPES: { value: AccountType; label: string; icon: string; payment: PaymentType }[] = [
  { value: 'bank', label: 'Bank account', icon: 'landmark', payment: 'debit_card' },
  { value: 'card', label: 'Credit card', icon: 'credit-card', payment: 'credit_card' },
  { value: 'cash', label: 'Cash', icon: 'banknote', payment: 'cash' },
  { value: 'wallet', label: 'Mobile wallet', icon: 'wallet', payment: 'mobile_wallet' },
  { value: 'savings', label: 'Savings', icon: 'piggy-bank', payment: 'bank_transfer' },
  { value: 'other', label: 'Other', icon: 'coins', payment: 'cash' },
];

export const ACCOUNT_COLORS = ['#2F45D0', '#1F8A70', '#C77D16', '#B4417A', '#5B6B7F', '#7C5CC4', '#D0533F', '#3E8FB0'];

export const accountTypeMeta = (t: AccountType) => ACCOUNT_TYPES.find((x) => x.value === t) ?? ACCOUNT_TYPES[0];
