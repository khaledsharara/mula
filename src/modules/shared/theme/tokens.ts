export type Scheme = 'light' | 'dark';
export type Appearance = 'system' | Scheme;

export type ColorToken =
  | 'paper'
  | 'sheet'
  | 'sunk'
  | 'ink'
  | 'graphite'
  | 'mist'
  | 'hairline'
  | 'accent'
  | 'accent-soft'
  | 'on-accent'
  | 'income'
  | 'alert'
  | 'alert-soft'
  | 'danger';

export type Palette = Record<ColorToken, string>;

/**
 * Quiet mono: paper and ink, one ledger-blue accent. Spending stays ink; only income
 * earns color, so the screen stays calm and the few colored things carry meaning.
 */
export const palettes: Record<Scheme, Palette> = {
  light: {
    paper: '#F5F5F1',
    sheet: '#FFFFFF',
    sunk: '#ECEBE5',
    ink: '#19191D',
    graphite: '#6B6B70',
    mist: '#A5A5A9',
    hairline: '#E2E1DA',
    accent: '#2F45D0',
    'accent-soft': '#E7EAFA',
    'on-accent': '#FFFFFF',
    income: '#2E7D57',
    alert: '#B4540A',
    'alert-soft': '#F8ECDD',
    danger: '#C23A32',
  },
  dark: {
    paper: '#131315',
    sheet: '#1C1C1F',
    sunk: '#0D0D0F',
    ink: '#ECEBE6',
    graphite: '#9C9CA1',
    mist: '#66666C',
    hairline: '#2A2A2E',
    accent: '#8C9BFF',
    'accent-soft': '#23274A',
    'on-accent': '#0E0F1E',
    income: '#63C08F',
    alert: '#E3A452',
    'alert-soft': '#36281A',
    danger: '#EE7A72',
  },
};

/**
 * Categorical chart colors: the dataviz reference palette (validated for CVD separation in
 * both modes). Assign in this order, never cycled.
 */
export const chartPalettes: Record<Scheme, string[]> = {
  light: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948'],
  dark: ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767'],
};

/**
 * Needs, wants and savings keep one fixed color each everywhere. Validated as a set
 * (all pairs) against paper and the dark surface; in light mode want/saving sit under
 * 3:1, so they are always shown with visible labels.
 */
export type NatureColors = { need: string; want: string; saving: string; none: string };
export const naturePalettes: Record<Scheme, NatureColors> = {
  light: { need: '#2F45D0', want: '#eb6834', saving: '#1baf7a', none: '#C9C8C1' },
  dark: { need: '#7684F0', want: '#d95926', saving: '#199e70', none: '#3A3A3F' },
};

function hexToRgbTriplet(hex: string): string {
  const h = hex.replace('#', '');
  const n = parseInt(h, 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
}

export function paletteToVars(p: Palette): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(p)) out[`--c-${k}`] = hexToRgbTriplet(v);
  return out;
}

export function withAlpha(hex: string, alpha: number): string {
  const a = Math.round(Math.min(1, Math.max(0, alpha)) * 255)
    .toString(16)
    .padStart(2, '0');
  return `${hex}${a}`;
}

/** Mixes a color toward white; used to keep dark entity colors legible on dark surfaces. */
export function lighten(hex: string, amount: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const mix = (c: number) => Math.round(c + (255 - c) * amount);
  const r = mix((n >> 16) & 255);
  const g = mix((n >> 8) & 255);
  const b = mix(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
