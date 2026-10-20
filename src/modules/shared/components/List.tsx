import { useContext, type ReactNode } from 'react';
import { View } from 'react-native';

import { Icon } from './Icon';
import { Press } from './Press';
import { InSheetContext } from './sheetContext';
import { Text } from './Text';

export function Divider({ inset = 20 }: { inset?: number }) {
  return <View className="h-px bg-hairline" style={{ marginLeft: inset }} />;
}

type SectionProps = {
  title?: string;
  action?: { label: string; onPress: () => void; testID?: string };
  children: ReactNode;
  footer?: string;
  className?: string;
};

/** A titled group of rows; the title is plain sentence-case text, not a label chip. */
export function Section({ title, action, children, footer, className = '' }: SectionProps) {
  return (
    <View className={`mt-7 ${className}`}>
      {title || action ? (
        <View className="mb-1.5 flex-row items-end justify-between px-5">
          {title ? (
            <Text variant="label" tone="graphite">
              {title}
            </Text>
          ) : (
            <View />
          )}
          {action ? (
            <Press onPress={action.onPress} hitSlop={10} testID={action.testID}>
              <Text variant="label" tone="accent">
                {action.label}
              </Text>
            </Press>
          ) : null}
        </View>
      ) : null}
      {children}
      {footer ? (
        <Text variant="caption" tone="graphite" className="mt-2 px-5">
          {footer}
        </Text>
      ) : null}
    </View>
  );
}

type RowProps = {
  title: string;
  subtitle?: string | null;
  left?: ReactNode;
  right?: ReactNode;
  value?: string;
  chevron?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
  divider?: boolean;
  destructive?: boolean;
  testID?: string;
};

export function ListRow({
  title,
  subtitle,
  left,
  right,
  value,
  chevron,
  onPress,
  onLongPress,
  divider: dividerProp,
  destructive,
  testID,
}: RowProps) {
  const divider = !useContext(InSheetContext) && (dividerProp ?? true);
  const body = (
    <View>
      <View className="min-h-[56px] flex-row items-center px-5 py-3">
        {left ? <View className="mr-3.5">{left}</View> : null}
        <View className="flex-1 pr-3">
          <Text variant="body" tone={destructive ? 'danger' : 'ink'} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text variant="caption" tone="graphite" numberOfLines={1} className="mt-0.5">
              {subtitle}
            </Text>
          ) : null}
        </View>
        {value ? (
          <Text variant="label" tone="graphite" weight="regular" numberOfLines={1} className="max-w-[45%]">
            {value}
          </Text>
        ) : null}
        {right}
        {chevron ? (
          <View className="ml-1.5">
            <Icon name="chevron-right" size={18} tone="mist" />
          </View>
        ) : null}
      </View>
      {divider ? <Divider inset={left ? 70 : 20} /> : null}
    </View>
  );
  if (!onPress && !onLongPress) return <View testID={testID}>{body}</View>;
  return (
    <Press testID={testID} onPress={onPress} onLongPress={onLongPress} dim={0.6} haptic="none">
      {body}
    </Press>
  );
}
