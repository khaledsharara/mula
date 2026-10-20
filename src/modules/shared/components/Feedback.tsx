import { useEffect } from 'react';
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { FadeInUp, FadeOutUp, runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';

import { useTheme } from '../theme/ThemeProvider';
import { BottomSheet } from './BottomSheet';
import { Button } from './Button';
import { Press } from './Press';
import { Text } from './Text';

/* ---------- Toast ---------- */

type ToastAction = { label: string; onPress: () => void };
type ToastState = { id: number; message: string | null; action: ToastAction | null };

const useToastStore = create<ToastState>(() => ({ id: 0, message: null, action: null }));

export function toast(message: string, action?: ToastAction): void {
  useToastStore.setState((s) => ({ id: s.id + 1, message, action: action ?? null }));
}

const dismissToast = () => useToastStore.setState({ message: null, action: null });

export function ToastHost() {
  const { id, message, action } = useToastStore();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const y = useSharedValue(0);

  useEffect(() => {
    if (!message) return;
    y.value = 0;
    const t = setTimeout(dismissToast, action ? 5000 : 2600);
    return () => clearTimeout(t);
  }, [id, message, action, y]);

  // Swipe up to dismiss; a short pull down just springs back.
  const swipe = Gesture.Pan()
    .activeOffsetY([-6, 6])
    .onUpdate((e) => {
      y.set(e.translationY < 0 ? e.translationY : e.translationY * 0.25);
    })
    .onEnd((e) => {
      if (e.translationY < -24 || e.velocityY < -500) y.set(withTiming(-160, { duration: 160 }, () => runOnJS(dismissToast)()));
      else y.set(withSpring(0, { damping: 18 }));
    });
  const dragStyle = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));

  if (!message) return null;
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, top: insets.top + 8, alignItems: 'center', paddingHorizontal: 20 }}>
      <GestureDetector gesture={swipe}>
        <Animated.View key={id} entering={FadeInUp.duration(220)} exiting={FadeOutUp.duration(180)} style={[{ width: '100%', maxWidth: 520 }, dragStyle]}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              borderRadius: 14,
              backgroundColor: c.ink,
              shadowColor: '#000',
              shadowOpacity: 0.18,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 4 },
            }}
            accessibilityLiveRegion="polite"
            testID="toast"
          >
            <Press onPress={dismissToast} dim={0.85} accessibilityLabel={`${message}. Tap to dismiss`} className="flex-1 px-4 py-3" testID="toast-dismiss">
              <Text variant="label" weight="medium" tone="paper">
                {message}
              </Text>
            </Press>
            {action ? (
              <Press
                onPress={() => {
                  action.onPress();
                  dismissToast();
                }}
                hitSlop={10}
                className="py-3 pl-1 pr-4"
                testID="toast-action"
              >
                <Text variant="label" weight="semibold" tone="paper" style={{ textDecorationLine: 'underline' }}>
                  {action.label}
                </Text>
              </Press>
            ) : null}
          </View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

/* ---------- Confirm ---------- */

type ConfirmOptions = {
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
};

type ConfirmState = { options: ConfirmOptions | null; resolve: ((v: boolean) => void) | null };

const useConfirmStore = create<ConfirmState>(() => ({ options: null, resolve: null }));

/** In-app confirmation sheet (never a browser/OS alert, which blocks automation and looks foreign). */
export function confirm(options: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => useConfirmStore.setState({ options, resolve }));
}

export function ConfirmHost() {
  const { options, resolve } = useConfirmStore();
  const close = (v: boolean) => {
    resolve?.(v);
    useConfirmStore.setState({ options: null, resolve: null });
  };
  return (
    <BottomSheet visible={Boolean(options)} onClose={() => close(false)} title={options?.title} subtitle={options?.message} scroll={false} testID="confirm-sheet">
      <View className="gap-2.5 px-5 pb-2 pt-3">
        <Button
          label={options?.confirmLabel ?? 'Confirm'}
          variant={options?.destructive ? 'danger' : 'primary'}
          size="lg"
          full
          onPress={() => close(true)}
          testID="confirm-yes"
        />
        <Button label={options?.cancelLabel ?? 'Cancel'} variant="secondary" size="lg" full onPress={() => close(false)} testID="confirm-no" />
      </View>
    </BottomSheet>
  );
}
