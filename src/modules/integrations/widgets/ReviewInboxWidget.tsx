import { AccessoryWidgetBackground, HStack, Image, Spacer, Text, VStack, ZStack } from '@expo/ui/swift-ui';
import { containerBackground, font, foregroundStyle, lineLimit, monospacedDigit, widgetURL } from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

export type ReviewInboxProps = {
  count: number;
  /** When the oldest waiting item arrived (ms); 0 when nothing is waiting. */
  oldest: number;
  /** The latest few, already formatted. */
  items: { title: string; amount: string }[];
};

/**
 * Home and Lock Screen widget for the review inbox. Runs inside the widget extension, so it may
 * only use Expo UI's SwiftUI components and modifiers, declared names only (no aliases, no other
 * imports, no hooks): the function is turned into a string at build time.
 */
function ReviewInbox(props: ReviewInboxProps, environment: WidgetEnvironment) {
  'widget';
  const family = environment.widgetFamily;
  const dark = environment.colorScheme === 'dark';
  const ink = dark ? '#F2F2EE' : '#18181B';
  const quiet = dark ? '#9A9AA0' : '#6B6B70';
  const accent = dark ? '#8A98FF' : '#2F45D0';
  const income = dark ? '#4CC38A' : '#1F8A5B';
  const surface = dark ? '#1C1C1F' : '#FFFFFF';
  const count = props.count || 0;
  const items = props.items || [];
  const done = count === 0;
  const url = done ? 'mula://' : 'mula://review';

  if (family === 'accessoryCircular') {
    return (
      <ZStack modifiers={[widgetURL(url)]}>
        <AccessoryWidgetBackground />
        {done ? (
          <Image systemName="checkmark" size={18} />
        ) : (
          <Text modifiers={[font({ size: 22, weight: 'semibold', design: 'rounded' }), monospacedDigit()]}>{String(count)}</Text>
        )}
      </ZStack>
    );
  }

  if (family === 'accessoryRectangular') {
    return (
      <VStack alignment="leading" spacing={1} modifiers={[widgetURL(url)]}>
        <Text modifiers={[font({ textStyle: 'caption', weight: 'semibold' })]}>Mula</Text>
        <Text modifiers={[font({ textStyle: 'headline' }), lineLimit(1)]}>{done ? 'All caught up' : `${count} to review`}</Text>
        {!done && props.oldest ? (
          <HStack spacing={3}>
            <Text modifiers={[font({ textStyle: 'caption' })]}>Oldest</Text>
            <Text date={new Date(props.oldest)} dateStyle="relative" modifiers={[font({ textStyle: 'caption' })]} />
          </HStack>
        ) : null}
      </VStack>
    );
  }

  const summary = (
    <VStack alignment="leading" spacing={2}>
      <HStack spacing={6}>
        <Text modifiers={[font({ size: 13, weight: 'semibold' }), foregroundStyle(quiet)]}>Review</Text>
        <Spacer />
        <Image systemName={done ? 'checkmark.circle.fill' : 'tray.full.fill'} size={15} color={done ? income : accent} />
      </HStack>
      <Spacer />
      {done ? (
        <VStack alignment="leading" spacing={2}>
          <Text modifiers={[font({ size: 20, weight: 'semibold' }), foregroundStyle(ink)]}>All caught up</Text>
          <Text modifiers={[font({ size: 12 }), foregroundStyle(quiet), lineLimit(2)]}>Nothing waiting</Text>
        </VStack>
      ) : (
        <VStack alignment="leading" spacing={0}>
          <Text modifiers={[font({ size: 44, weight: 'semibold', design: 'rounded' }), monospacedDigit(), foregroundStyle(ink)]}>{String(count)}</Text>
          <Text modifiers={[font({ size: 13, weight: 'medium' }), foregroundStyle(ink)]}>to review</Text>
          {props.oldest ? (
            <HStack spacing={3}>
              <Text modifiers={[font({ size: 12 }), foregroundStyle(quiet)]}>Oldest</Text>
              <Text date={new Date(props.oldest)} dateStyle="relative" modifiers={[font({ size: 12 }), foregroundStyle(quiet), lineLimit(1)]} />
            </HStack>
          ) : null}
        </VStack>
      )}
    </VStack>
  );

  if (family !== 'systemMedium' || done) {
    return (
      <VStack alignment="leading" modifiers={[containerBackground(surface, 'widget'), widgetURL(url)]}>
        {summary}
      </VStack>
    );
  }

  return (
    <HStack spacing={16} modifiers={[containerBackground(surface, 'widget'), widgetURL(url)]}>
      {summary}
      <VStack alignment="leading" spacing={8}>
        {items.slice(0, 3).map((item, i) => (
          <HStack key={i} spacing={8}>
            <Text modifiers={[font({ size: 13, weight: 'medium' }), foregroundStyle(ink), lineLimit(1)]}>{item.title}</Text>
            <Spacer />
            <Text modifiers={[font({ size: 13 }), monospacedDigit(), foregroundStyle(quiet), lineLimit(1)]}>{item.amount}</Text>
          </HStack>
        ))}
        {count > 3 ? <Text modifiers={[font({ size: 12 }), foregroundStyle(quiet)]}>{`+${count - 3} more`}</Text> : null}
        <Spacer />
      </VStack>
    </HStack>
  );
}

export default createWidget<ReviewInboxProps>('ReviewInbox', ReviewInbox);
