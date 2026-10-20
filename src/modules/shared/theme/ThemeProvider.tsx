import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { Appearance as RNAppearance, Platform, View, useColorScheme } from 'react-native';
import { vars } from 'nativewind';

import { useSettings } from '../settings/settingsStore';
import {
  chartPalettes,
  naturePalettes,
  palettes,
  paletteToVars,
  type NatureColors,
  type Palette,
  type Scheme,
} from './tokens';

const varsByScheme = {
  light: vars(paletteToVars(palettes.light)),
  dark: vars(paletteToVars(palettes.dark)),
};

type ThemeValue = {
  scheme: Scheme;
  c: Palette;
  chart: string[];
  nature: NatureColors;
  /** Style that defines the color variables; re-apply it inside portals such as modals. */
  vars: (typeof varsByScheme)['light'];
};

const ThemeContext = createContext<ThemeValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const appearance = useSettings((s) => s.appearance);
  const system = useColorScheme();
  const scheme: Scheme = appearance === 'system' ? (system === 'dark' ? 'dark' : 'light') : appearance;

  useEffect(() => {
    // Keep native chrome (sheets, keyboard, status bar) in step with the in-app choice.
    if (Platform.OS !== 'web') RNAppearance.setColorScheme(appearance === 'system' ? 'unspecified' : appearance);
  }, [appearance]);

  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.documentElement.style.colorScheme = scheme;
      document.body.style.backgroundColor = palettes[scheme].paper;
    }
  }, [scheme]);

  const value = useMemo<ThemeValue>(
    () => ({ scheme, c: palettes[scheme], chart: chartPalettes[scheme], nature: naturePalettes[scheme], vars: varsByScheme[scheme] }),
    [scheme],
  );

  return (
    <ThemeContext.Provider value={value}>
      <View style={[{ flex: 1, backgroundColor: value.c.paper }, value.vars]}>{children}</View>
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
