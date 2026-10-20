import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { BackHandler, Dimensions, Keyboard, Platform, Pressable, ScrollView, StyleSheet, useWindowDimensions, View, type KeyboardEvent, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';

import { useTheme } from '../theme/ThemeProvider';
import { IconButton } from './Button';
import { InSheetContext } from './sheetContext';
import { Text } from './Text';

type Props = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: ReactNode;
  /** Tallest the sheet gets, as a share of the screen. */
  maxHeight?: number;
  /** Scroll the content once it reaches `maxHeight`. Off for short prompts. */
  scroll?: boolean;
  /** Always open at `maxHeight`, for searchable lists that would otherwise resize while filtering. */
  tall?: boolean;
  /** Pinned under the content, so it stays reachable however long the content is. */
  footer?: ReactNode;
  testID?: string;
};

type Entry = Props & { order: number };

// Sheets render in one layer above every screen (see SheetHost in AppShell), so they cover the
// tab bar and stack in the order they were opened. Each BottomSheet hands its props to the layer.
const useSheetLayer = create<{ entries: Record<string, Entry> }>(() => ({ entries: {} }));
let openCount = 0;

/**
 * Bottom sheet for pickers and prompts: slides up over the app, follows the keyboard, fits its
 * content up to `maxHeight`, and closes with a swipe down, a tap outside or the close button.
 */
export function BottomSheet(props: Props) {
  const id = useId();
  const order = useRef(0);
  const wasVisible = useRef(false);

  useLayoutEffect(() => {
    if (props.visible && !wasVisible.current) order.current = ++openCount;
    wasVisible.current = props.visible;
    useSheetLayer.setState((s) => {
      const prev = s.entries[id];
      if (props.visible || !prev) return { entries: { ...s.entries, [id]: { ...props, order: order.current } } };
      // Closing: keep what was on screen while it slides away (hosts often clear their content).
      if (!prev.visible) return s;
      return { entries: { ...s.entries, [id]: { ...prev, visible: false } } };
    });
  });

  useLayoutEffect(
    () => () =>
      useSheetLayer.setState((s) => {
        const entries = { ...s.entries };
        delete entries[id];
        return { entries };
      }),
    [id],
  );

  return null;
}

/** True while any sheet is open, e.g. to keep the page behind it from reacting to the keyboard. */
export function useAnySheetOpen(): boolean {
  return useSheetLayer((s) => Object.values(s.entries).some((e) => e.visible));
}

/** Renders every registered sheet; mount once, above the navigator. */
export function SheetHost() {
  const entries = useSheetLayer((s) => s.entries);
  const keyboard = useKeyboardHeight();
  const anyOpen = useAnySheetOpen();
  // Android's back button closes the top sheet instead of leaving the screen under it. Added only
  // while a sheet is open, so it runs before the navigator's own handler (newest runs first).
  useEffect(() => {
    if (Platform.OS !== 'android' || !anyOpen) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      const open = Object.values(useSheetLayer.getState().entries).filter((e) => e.visible);
      const top = open.sort((a, b) => b.order - a.order)[0];
      if (!top) return false;
      top.onClose();
      return true;
    });
    return () => sub.remove();
  }, [anyOpen]);
  const list = Object.entries(entries).sort((a, b) => a[1].order - b[1].order);
  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      {list.map(([id, entry]) => (
        <SheetSlot key={id} {...entry} keyboard={keyboard} />
      ))}
    </View>
  );
}

type FrameProps = Entry & { keyboard: SharedValue<number> };

/** Mounts the sheet while it's open or sliding away; closed sheets cost nothing. */
function SheetSlot(props: FrameProps) {
  const [shown, setShown] = useState(props.visible);
  useEffect(() => {
    if (props.visible) setShown(true);
  }, [props.visible]);
  return shown ? <SheetFrame {...props} onHidden={() => setShown(false)} /> : null;
}

const KEYBOARD_EASING = Easing.bezier(0.17, 0.59, 0.4, 0.77);

/** The keyboard's height as a shared value, moving with the keyboard's own timing. */
function useKeyboardHeight(): SharedValue<number> {
  const height = useSharedValue(0);
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const to = (h: number, e?: KeyboardEvent) => height.set(withTiming(Math.max(0, h), { duration: e?.duration || 250, easing: KEYBOARD_EASING }));
    const subs =
      Platform.OS === 'ios'
        ? [
            Keyboard.addListener('keyboardWillChangeFrame', (e) => to(Dimensions.get('screen').height - e.endCoordinates.screenY, e)),
            Keyboard.addListener('keyboardWillHide', (e) => to(0, e)),
          ]
        : [Keyboard.addListener('keyboardDidShow', (e) => to(e.endCoordinates.height)), Keyboard.addListener('keyboardDidHide', () => to(0))];
    return () => subs.forEach((sub) => sub.remove());
  }, [height]);
  return height;
}

const OPEN = { duration: 280, easing: Easing.out(Easing.cubic) };
const CLOSE = { duration: 200, easing: Easing.in(Easing.cubic) };

function SheetFrame({
  visible,
  onClose,
  onHidden,
  keyboard,
  title,
  subtitle,
  children,
  maxHeight = 0.88,
  scroll = true,
  tall = false,
  footer,
  testID,
}: FrameProps & { onHidden: () => void }) {
  const { c, scheme } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: screen } = useWindowDimensions();

  const progress = useSharedValue(0);
  const drag = useSharedValue(0);
  const sheetHeight = useSharedValue(screen);
  const headerHeight = useSharedValue(0);
  const scrollY = useSharedValue(0);
  const dragging = useSharedValue(false);

  // Opening again before the close animation ends cancels it, so the sheet stays mounted.
  useEffect(() => {
    if (visible) {
      drag.set(0);
      progress.set(withTiming(1, OPEN));
    } else {
      // Let the keyboard go down with the sheet rather than after its input unmounts.
      Keyboard.dismiss();
      progress.set(
        withTiming(0, CLOSE, (finished) => {
          if (finished) runOnJS(onHidden)();
        }),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onHidden is a fresh closure each render; the one at close time is the right one
  }, [visible, drag, progress]);

  const top = insets.top + 12;
  const cap = Math.min(screen * maxHeight, screen - top);
  const bottomPad = Math.max(insets.bottom, 16);
  const backdrop = scheme === 'dark' ? 0.6 : 0.32;

  const onCloseRef = useRef(onClose);
  useLayoutEffect(() => {
    onCloseRef.current = onClose;
  });

  // Drag down to close: from the handle and header always, from the content when it's
  // scrolled to the top (so a drag inside a long list still scrolls it). Sideways swipes
  // (chip rows) are left alone.
  const { pan, scrollGesture } = useMemo(() => {
    const native = Gesture.Native();
    const gesture = Gesture.Pan().runOnJS(true).activeOffsetY(8).failOffsetX([-12, 12]);
    if (Platform.OS !== 'web') gesture.simultaneousWithExternalGesture(native);
    gesture
      .onBegin((e) => {
        dragging.set(e.y <= headerHeight.value || scrollY.value <= 1);
      })
      .onUpdate((e) => {
        if (dragging.value) drag.set(Math.max(0, e.translationY));
      })
      .onEnd((e) => {
        if (!dragging.value) return;
        dragging.set(false);
        if (drag.value > Math.min(140, sheetHeight.value * 0.3) || (e.velocityY > 900 && drag.value > 10)) onCloseRef.current();
        else drag.set(withSpring(0, { damping: 20, stiffness: 220 }));
      })
      .onFinalize(() => {
        dragging.set(false);
      });
    return { pan: gesture, scrollGesture: native };
  }, [drag, dragging, headerHeight, scrollY, sheetHeight]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: progress.value * backdrop * (1 - Math.min(1, drag.value / Math.max(1, sheetHeight.value))),
  }));
  const positionStyle = useAnimatedStyle(() => ({
    bottom: keyboard.value,
    transform: [{ translateY: drag.value + (1 - progress.value) * (sheetHeight.value + 24) }],
  }));
  const sizeStyle = useAnimatedStyle(() => {
    const limit = Math.min(cap, screen - top - keyboard.value);
    return tall ? { height: limit } : { maxHeight: limit };
  });
  // The home-indicator gap only matters while the keyboard is down.
  const spacerStyle = useAnimatedStyle(() => ({ height: keyboard.value > 0 ? 12 : bottomPad }));

  const header = (
    <View
      onLayout={(e: LayoutChangeEvent) => {
        headerHeight.set(e.nativeEvent.layout.height);
      }}
    >
      <View className="items-center pb-1 pt-2.5" testID="sheet-handle">
        <View style={{ width: 38, height: 5, borderRadius: 3, backgroundColor: scheme === 'dark' ? c.mist : c.hairline }} />
      </View>
      {title ? (
        <View className="flex-row items-start px-5 pb-2 pt-1">
          <View className="flex-1 pr-2">
            <Text variant="heading">{title}</Text>
            {subtitle ? (
              <Text variant="label" weight="regular" tone="graphite" className="mt-1">
                {subtitle}
              </Text>
            ) : null}
          </View>
          <IconButton icon="x" label="Close" onPress={onClose} filled size={32} testID={testID ? `${testID}-close` : undefined} />
        </View>
      ) : null}
    </View>
  );

  const scrollBody = (
    <ScrollView
      style={{ flexGrow: tall ? 1 : 0, flexShrink: 1 }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      bounces={false}
      scrollEventThrottle={16}
      onScroll={(e) => {
        scrollY.set(e.nativeEvent.contentOffset.y);
      }}
    >
      {children}
    </ScrollView>
  );

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents={visible ? 'box-none' : 'none'}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#000' }, backdropStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" testID={testID ? `${testID}-backdrop` : undefined} />
      </Animated.View>
      <Animated.View style={[{ position: 'absolute', left: 0, right: 0, alignItems: 'center' }, positionStyle]} pointerEvents="box-none">
        <GestureDetector gesture={pan}>
          <Animated.View
            accessibilityViewIsModal
            testID={testID}
            onLayout={(e: LayoutChangeEvent) => {
              sheetHeight.set(e.nativeEvent.layout.height);
            }}
            style={[
              {
                width: '100%',
                maxWidth: 600,
                backgroundColor: c.sheet,
                borderTopLeftRadius: 28,
                borderTopRightRadius: 28,
                shadowColor: '#000',
                shadowOpacity: scheme === 'dark' ? 0 : 0.12,
                shadowRadius: 18,
                shadowOffset: { width: 0, height: -2 },
              },
              sizeStyle,
            ]}
          >
            <InSheetContext.Provider value={true}>
              {header}
              {scroll ? Platform.OS === 'web' ? scrollBody : <GestureDetector gesture={scrollGesture}>{scrollBody}</GestureDetector> : <View style={{ flexShrink: 1 }}>{children}</View>}
              {footer ? <View className="px-5 pt-3">{footer}</View> : null}
              <Animated.View style={spacerStyle} />
            </InSheetContext.Provider>
          </Animated.View>
        </GestureDetector>
      </Animated.View>
    </View>
  );
}
