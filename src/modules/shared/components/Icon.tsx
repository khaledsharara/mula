import type { LucideIcon } from 'lucide-react-native';

import { useTheme } from '../theme/ThemeProvider';
import type { ColorToken } from '../theme/tokens';
import { ICON_SET } from './iconSet';

export const ICONS: Record<string, LucideIcon> = ICON_SET;

/** Icons offered when you create a category or account (grouped in iconCatalog.ts). */
export { ICON_GROUPS, PICKABLE_ICONS } from './iconCatalog';

type Props = {
  name: string;
  size?: number;
  color?: string;
  tone?: ColorToken;
  strokeWidth?: number;
};

export function Icon({ name, size = 20, color, tone = 'ink', strokeWidth = 1.75 }: Props) {
  const { c } = useTheme();
  const Cmp = ICONS[name] ?? ICONS.shapes;
  return <Cmp size={size} color={color ?? c[tone]} strokeWidth={strokeWidth} />;
}
