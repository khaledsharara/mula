import type { LucideIcon } from 'lucide-react-native';

import { useTheme } from '../theme/ThemeProvider';
import type { ColorToken } from '../theme/tokens';
import { ICON_SET } from './iconSet';

export const ICONS: Record<string, LucideIcon> = ICON_SET;

/** Icons offered when you create a category or account. */
export const PICKABLE_ICONS = [
  'utensils', 'coffee', 'shopping-basket', 'pizza', 'shopping-bag', 'shirt', 'pill', 'smartphone', 'gamepad-2', 'gift',
  'sparkles', 'sofa', 'gem', 'baby', 'paw-print', 'house', 'zap', 'wrench', 'key-round', 'bus', 'plane', 'train-front',
  'car-taxi-front', 'car', 'fuel', 'dumbbell', 'wine', 'book-open', 'hand-heart', 'ticket', 'graduation-cap',
  'stethoscope', 'palette', 'luggage', 'cake', 'tv', 'wifi', 'phone', 'receipt', 'banknote', 'piggy-bank', 'wallet',
  'credit-card', 'landmark', 'coins', 'hand-coins', 'briefcase-business', 'tag', 'store', 'shapes',
];

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
