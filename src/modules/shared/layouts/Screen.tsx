import { goBack } from '../utils/nav';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View, type ScrollViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAnySheetOpen } from '../components/BottomSheet';
import { IconButton } from '../components/Button';
import { Text } from '../components/Text';

type Props = {
  title?: string;
  /** Large left-aligned title for top-level tabs; compact centered bar for pushed screens. */
  large?: boolean;
  back?: boolean | (() => void);
  /** Use × instead of ‹ for modal screens. */
  close?: boolean;
  right?: ReactNode;
  scroll?: boolean;
  /** Extra bottom padding for screens under the tab bar. */
  tabBar?: boolean;
  children?: ReactNode;
  footer?: ReactNode;
  scrollProps?: ScrollViewProps;
  /** Skip the top safe-area inset (e.g. inside an iOS page sheet, which has none). */
  sheet?: boolean;
  /**
   * Keep inputs clear of the keyboard (default): the scroll area insets itself and the footer
   * rises with the keyboard. Turn off for screens with their own keypad.
   */
  avoidKeyboard?: boolean;
  testID?: string;
};

export const TAB_BAR_SPACE = 104;

export function Screen({
  title,
  large,
  back,
  close,
  right,
  scroll = true,
  tabBar,
  children,
  footer,
  scrollProps,
  sheet,
  avoidKeyboard = true,
  testID,
}: Props) {
  const insets = useSafeAreaInsets();
  // A keyboard opened inside a sheet must not move the page behind it.
  const sheetOpen = useAnySheetOpen();
  const top = sheet && Platform.OS === 'ios' ? 12 : insets.top;
  const onBack = typeof back === 'function' ? back : goBack;
  const showBar = Boolean(back || close || (!large && title) || right);

  const largeTitle = (
    <View className={`px-5 pb-2 ${showBar ? 'pt-1' : 'pt-4'}`}>
      <Text variant="display" weight="semibold" accessibilityRole="header">
        {title}
      </Text>
    </View>
  );

  const header = (
    <View style={{ paddingTop: top }}>
      {showBar ? (
        <View className="h-12 flex-row items-center px-3">
          <View className="w-12 items-start">
            {back || close ? (
              <IconButton icon={close ? 'x' : 'chevron-left'} label={close ? 'Close' : 'Back'} onPress={onBack} testID="screen-back" />
            ) : null}
          </View>
          <View className="flex-1 items-center">
            {!large && title ? (
              <Text variant="body" weight="semibold" numberOfLines={1}>
                {title}
              </Text>
            ) : null}
          </View>
          <View className="min-w-12 flex-row items-center justify-end">{right}</View>
        </View>
      ) : null}
      {large && title && !scroll ? largeTitle : null}
    </View>
  );

  const bottomPad = (tabBar ? TAB_BAR_SPACE : 32) + (footer ? 0 : insets.bottom);

  return (
    <View testID={testID} className="flex-1 bg-paper">
      {header}
      {scroll ? (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: bottomPad }}
          keyboardShouldPersistTaps="handled"
          // iOS: inset for the keyboard and keep the focused field in view; drag down to dismiss.
          automaticallyAdjustKeyboardInsets={avoidKeyboard && !footer}
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          showsVerticalScrollIndicator={false}
          {...scrollProps}
        >
          {large && title ? largeTitle : null}
          {children}
        </ScrollView>
      ) : (
        // Without a scroll area or footer, keep bottom buttons off the home indicator.
        <View className="flex-1" style={{ paddingBottom: footer || tabBar ? 0 : insets.bottom }}>
          {children}
        </View>
      )}
      {footer ? (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} enabled={avoidKeyboard && !sheetOpen}>
          <View className="border-t border-hairline bg-paper px-5 pt-3" style={{ paddingBottom: Math.max(insets.bottom, 16) }}>
            {footer}
          </View>
        </KeyboardAvoidingView>
      ) : null}
    </View>
  );
}
