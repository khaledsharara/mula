import { View } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';
import { lighten, withAlpha } from '../theme/tokens';
import { Button } from './Button';
import { Icon } from './Icon';
import { Text } from './Text';

type TileProps = { icon: string; color?: string; size?: number; muted?: boolean };

/** Round glyph used for categories, accounts and payees: tinted wash, colored stroke. */
export function IconTile({ icon, color, size = 40, muted }: TileProps) {
  const { c, scheme } = useTheme();
  const tint = color ? (scheme === 'dark' ? lighten(color, 0.32) : color) : c.graphite;
  return (
    <View
      className="items-center justify-center rounded-full"
      style={{ width: size, height: size, backgroundColor: muted ? c.sunk : withAlpha(tint, scheme === 'dark' ? 0.22 : 0.13) }}
    >
      <Icon name={icon} size={Math.round(size * 0.48)} color={muted ? c.graphite : tint} />
    </View>
  );
}

/** Initials avatar for people. */
export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
  return (
    <View className="items-center justify-center rounded-full bg-sunk" style={{ width: size, height: size }}>
      <Text variant={size > 44 ? 'heading' : 'label'} weight="semibold" tone="graphite">
        {initials || '?'}
      </Text>
    </View>
  );
}

export function ProgressBar({ value, color, height = 4 }: { value: number; color?: string; height?: number }) {
  const { c } = useTheme();
  const pct = Math.max(0, Math.min(1, value));
  return (
    <View className="overflow-hidden rounded-full bg-sunk" style={{ height }}>
      <View className="h-full rounded-full" style={{ width: `${pct * 100}%`, backgroundColor: color ?? c.ink }} />
    </View>
  );
}

export function CountBadge({ count, tone = 'accent' }: { count: number; tone?: 'accent' | 'alert' }) {
  if (count <= 0) return null;
  return (
    <View className={`h-5 min-w-5 items-center justify-center rounded-full px-1.5 ${tone === 'accent' ? 'bg-accent' : 'bg-alert'}`}>
      <Text variant="caption" weight="semibold" tone="on-accent" tabular>
        {count > 99 ? '99+' : count}
      </Text>
    </View>
  );
}

type EmptyProps = {
  icon: string;
  title: string;
  body?: string;
  action?: { label: string; onPress: () => void; icon?: string };
  testID?: string;
};

export function EmptyState({ icon, title, body, action, testID }: EmptyProps) {
  return (
    <View className="items-center px-10 py-14" testID={testID}>
      <View className="mb-4 h-14 w-14 items-center justify-center rounded-full bg-sunk">
        <Icon name={icon} size={24} tone="graphite" />
      </View>
      <Text variant="heading" className="text-center">
        {title}
      </Text>
      {body ? (
        <Text variant="label" weight="regular" tone="graphite" className="mt-1.5 text-center">
          {body}
        </Text>
      ) : null}
      {action ? (
        <View className="mt-5">
          <Button label={action.label} icon={action.icon} onPress={action.onPress} variant="secondary" size="md" testID={testID ? `${testID}-action` : undefined} />
        </View>
      ) : null}
    </View>
  );
}
