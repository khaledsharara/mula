import { View } from 'react-native';

import type { Minor } from '../db/types';
import type { ColorToken } from '../theme/tokens';
import { MINUS, splitMoney } from '../utils/money';
import { Text, type TextVariant } from './Text';

type Size = 'hero' | 'display' | 'lg' | 'md' | 'sm';

const sizes: Record<Size, { whole: TextVariant; fraction: TextVariant; currency: TextVariant }> = {
  hero: { whole: 'hero', fraction: 'title', currency: 'label' },
  display: { whole: 'display', fraction: 'heading', currency: 'label' },
  lg: { whole: 'title', fraction: 'body', currency: 'caption' },
  md: { whole: 'body', fraction: 'body', currency: 'caption' },
  sm: { whole: 'label', fraction: 'label', currency: 'caption' },
};

type Props = {
  minor: Minor;
  currency?: string;
  size?: Size;
  /** "auto" shows − for negatives; "always" also shows + for positives. */
  sign?: 'auto' | 'always' | 'never';
  tone?: ColorToken;
  /** Positive amounts render in the income color. */
  colorIncome?: boolean;
  showCurrency?: boolean;
  strike?: boolean;
};

/**
 * Amounts read as one number: whole part at full weight, decimals smaller and quieter,
 * the currency code as a small prefix. Digits are tabular so columns line up.
 */
export function Money({
  minor,
  currency,
  size = 'md',
  sign = 'auto',
  tone,
  colorIncome = false,
  showCurrency = false,
  strike = false,
}: Props) {
  const { whole, fraction, negative } = splitMoney(minor);
  const s = sizes[size];
  const resolvedTone: ColorToken = tone ?? (colorIncome && minor > 0 ? 'income' : 'ink');
  const prefix = sign === 'never' ? '' : negative ? MINUS : sign === 'always' && minor > 0 ? '+' : '';
  const big = size === 'hero' || size === 'display';
  const decorations = strike ? { textDecorationLine: 'line-through' as const } : null;

  return (
    <View className="flex-row items-baseline">
      {showCurrency && currency ? (
        <Text variant={s.currency} tone="graphite" weight="medium" className={big ? 'mr-2' : 'mr-1'}>
          {currency}
        </Text>
      ) : null}
      <Text variant={s.whole} tone={resolvedTone} tabular style={decorations}>
        {prefix}
        {whole}
      </Text>
      <Text
        variant={s.fraction}
        tone={big ? 'mist' : resolvedTone}
        weight={big ? 'light' : undefined}
        tabular
        style={[decorations, !big ? { opacity: 0.55 } : null]}
      >
        .{fraction}
      </Text>
    </View>
  );
}
