import { Text as RNText, type TextProps } from 'react-native';

import type { ColorToken } from '../theme/tokens';

export type TextVariant = 'hero' | 'display' | 'title' | 'heading' | 'body' | 'label' | 'caption';
export type TextWeight = 'light' | 'regular' | 'medium' | 'semibold' | 'bold';

// Full class strings so Tailwind's scanner can see them.
const variantClass: Record<TextVariant, string> = {
  hero: 'text-hero',
  display: 'text-display',
  title: 'text-title',
  heading: 'text-heading',
  body: 'text-body',
  label: 'text-label',
  caption: 'text-caption',
};

const weightClass: Record<TextWeight, string> = {
  light: 'font-light',
  regular: 'font-regular',
  medium: 'font-medium',
  semibold: 'font-semibold',
  bold: 'font-bold',
};

const toneClass: Partial<Record<ColorToken, string>> = {
  ink: 'text-ink',
  graphite: 'text-graphite',
  mist: 'text-mist',
  accent: 'text-accent',
  'on-accent': 'text-on-accent',
  income: 'text-income',
  alert: 'text-alert',
  danger: 'text-danger',
  paper: 'text-paper',
};

const defaultWeight: Record<TextVariant, TextWeight> = {
  hero: 'light',
  display: 'medium',
  title: 'semibold',
  heading: 'semibold',
  body: 'regular',
  label: 'medium',
  caption: 'regular',
};

export type AppTextProps = TextProps & {
  variant?: TextVariant;
  weight?: TextWeight;
  tone?: ColorToken;
  /** Aligns digits in columns; use for every amount. */
  tabular?: boolean;
  className?: string;
};

export function Text({
  variant = 'body',
  weight,
  tone = 'ink',
  tabular,
  className = '',
  style,
  ...rest
}: AppTextProps) {
  const classes = `${variantClass[variant]} ${weightClass[weight ?? defaultWeight[variant]]} ${toneClass[tone] ?? 'text-ink'} ${className}`;
  return (
    <RNText
      className={classes}
      style={[tabular ? { fontVariant: ['tabular-nums'] } : null, style]}
      maxFontSizeMultiplier={1.4}
      {...rest}
    />
  );
}
