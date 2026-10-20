import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { Easing, interpolate, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { findOrCreatePayee } from '../../payees/data/payeesRepo';
import type { TxInput } from '../../transactions/types';
import { Button } from '../../shared/components/Button';
import { toast } from '../../shared/components/Feedback';
import { Icon } from '../../shared/components/Icon';
import { haptic } from '../../shared/components/Press';
import { Text } from '../../shared/components/Text';
import { Screen } from '../../shared/layouts/Screen';
import { useTheme } from '../../shared/theme/ThemeProvider';
import { ReviewCard, type CardChoice } from '../components/ReviewCard';
import { confirmItem, dismissItem, restoreItem, useInbox, useSuggestion, type Suggestion } from '../data/inboxRepo';
import { aliasDecisionForInbox } from '../utils/aliasDecision';

/**
 * Detected payments, one at a time, oldest first. Confirm (or swipe right) when the
 * suggestion is right, skip (or swipe left) when it isn't a real expense.
 */
export default function ReviewPage() {
  const { data: pending, loading } = useInbox('pending');
  const queue = useMemo(() => [...(pending ?? [])].sort((a, b) => a.receivedAt - b.receivedAt), [pending]);
  const [skipped, setSkipped] = useState<Set<string>>(new Set());
  const current = queue.find((i) => !skipped.has(i.id)) ?? queue[0] ?? null;
  const { data: suggestion } = useSuggestion(current);
  const ready = suggestion && suggestion.item.id === current?.id ? suggestion : null;
  const remaining = queue.length;

  return (
    <Screen close scroll={false} title={remaining ? `${remaining} to review` : 'Review'} testID="review">
      {loading && !pending ? null : !current ? (
        <AllDone />
      ) : ready ? (
        <Deck key={ready.item.id} s={ready} onLater={() => setSkipped((s) => new Set(s).add(ready.item.id))} hasLater={remaining > 1} />
      ) : (
        <View className="flex-1" />
      )}
    </Screen>
  );
}

function initialChoice(s: Suggestion): CardChoice {
  return {
    categoryId: s.draft.categoryId ?? null,
    payee: s.payee ? { payeeId: s.payee.id, name: s.payee.name } : s.suggestedName ? { payeeId: null, name: s.suggestedName } : null,
    account: s.account,
  };
}

function Deck({ s, onLater, hasLater }: { s: Suggestion; onLater: () => void; hasLater: boolean }) {
  const { width } = useWindowDimensions();
  const { c } = useTheme();
  const [choice, setChoice] = useState<CardChoice>(() => initialChoice(s));
  const [busy, setBusy] = useState(false);
  const x = useSharedValue(0);
  const appear = useSharedValue(0);

  useEffect(() => {
    appear.value = withTiming(1, { duration: 180 });
  }, [appear]);

  const isTransfer = s.draft.type === 'transfer';
  const canConfirm =
    Boolean(choice.account) && (isTransfer ? Boolean(s.toAccount) : Boolean(choice.categoryId)) && !(s.needsPayee && !choice.payee) && !s.unconverted;

  /** Slides the card out while the write happens; springs back if it fails. */
  const fling = async (dir: 1 | -1, write: () => Promise<void>) => {
    x.value = withTiming(dir * width * 1.2, { duration: 220, easing: Easing.in(Easing.quad) });
    try {
      await write();
    } catch (e) {
      x.value = withSpring(0);
      toast(e instanceof Error ? e.message : 'Couldn’t save that');
    }
  };

  const confirm = async () => {
    if (!canConfirm || busy) {
      haptic('warning');
      x.value = withSpring(0);
      toast(
        !choice.account
          ? 'Choose the account first'
          : s.needsPayee && !choice.payee
            ? 'Who did you send it to?'
            : s.unconverted
              ? 'No exchange rate yet. Tap Edit to enter the amount'
              : 'Pick a category first',
      );
      return;
    }
    setBusy(true);
    try {
      let payeeId = choice.payee?.payeeId ?? null;
      if (!payeeId && choice.payee?.name) {
        const kind = s.item.parsed?.kind === 'instapay_in' || s.item.parsed?.kind === 'instapay_out' ? 'person' : 'merchant';
        payeeId = (await findOrCreatePayee(choice.payee.name, kind)).id;
      }
      const alias = await aliasDecisionForInbox(s, payeeId, choice.payee?.name ?? null);
      const account = choice.account!;
      const input: TxInput = {
        ...(s.draft as TxInput),
        accountId: account.id,
        categoryId: isTransfer ? null : choice.categoryId,
        payeeId,
      };
      haptic('success');
      await fling(1, async () => {
        await confirmItem(s.item.id, input, { alias });
      });
    } catch (e) {
      x.value = withSpring(0);
      toast(e instanceof Error ? e.message : 'Couldn’t save');
    } finally {
      setBusy(false);
    }
  };

  const skip = () => {
    haptic('light');
    void fling(-1, async () => {
      await dismissItem(s.item.id, 'Skipped in review');
      toast('Skipped. It won’t count anywhere.', { label: 'Undo', onPress: () => void restoreItem(s.item.id) });
    });
  };

  const pan = Gesture.Pan()
    .runOnJS(true)
    .activeOffsetX([-14, 14])
    .failOffsetY([-16, 16])
    .onUpdate((e) => {
      x.value = e.translationX;
    })
    .onEnd((e) => {
      const far = Math.abs(e.translationX) > width * 0.28 || Math.abs(e.velocityX) > 900;
      if (far && e.translationX > 0) void confirm();
      else if (far && e.translationX < 0) skip();
      else x.value = withSpring(0, { damping: 18 });
    });

  const cardStyle = useAnimatedStyle(() => ({
    opacity: appear.value,
    transform: [{ translateX: x.value }, { rotate: `${interpolate(x.value, [-width, 0, width], [-8, 0, 8])}deg` }],
  }));
  const confirmHint = useAnimatedStyle(() => ({ opacity: interpolate(x.value, [0, 90], [0, 1], 'clamp') }));
  const skipHint = useAnimatedStyle(() => ({ opacity: interpolate(x.value, [-90, 0], [1, 0], 'clamp') }));

  return (
    <View className="flex-1 px-4 pb-2">
      <View className="flex-1">
        <Animated.View style={[{ position: 'absolute', left: 12, top: 16, zIndex: 10, borderRadius: 999, backgroundColor: c.income, paddingHorizontal: 12, paddingVertical: 4 }, confirmHint]} pointerEvents="none">
          <Text variant="label" weight="semibold" tone="paper">
            Confirm
          </Text>
        </Animated.View>
        <Animated.View style={[{ position: 'absolute', right: 12, top: 16, zIndex: 10, borderRadius: 999, backgroundColor: c.graphite, paddingHorizontal: 12, paddingVertical: 4 }, skipHint]} pointerEvents="none">
          <Text variant="label" weight="semibold" tone="paper">
            Skip
          </Text>
        </Animated.View>
        <GestureDetector gesture={pan}>
          <Animated.View style={[{ flex: 1 }, cardStyle]}>
            <ReviewCard s={s} choice={choice} onChange={setChoice} />
          </Animated.View>
        </GestureDetector>
      </View>
      <View className="flex-row items-center gap-2.5 pt-3">
        <View className="flex-1">
          <Button label="Skip" variant="secondary" size="lg" full onPress={skip} testID="review-skip" haptic="none" />
        </View>
        <View className="flex-1">
          <Button
            label="Edit"
            variant="secondary"
            size="lg"
            full
            onPress={() => router.push({ pathname: '/add', params: { inboxId: s.item.id } })}
            testID="review-edit"
          />
        </View>
        <View className="flex-[1.4]">
          <Button label="Confirm" size="lg" full onPress={() => void confirm()} disabled={busy} testID="review-confirm" haptic="none" />
        </View>
      </View>
      {hasLater ? (
        <View className="items-center pt-1">
          <Button label="Decide later" variant="ghost" size="sm" onPress={onLater} testID="review-later" />
        </View>
      ) : null}
    </View>
  );
}

function AllDone() {
  return (
    <View className="flex-1 items-center justify-center px-10" testID="review-done">
      <View className="mb-5 h-16 w-16 items-center justify-center rounded-full bg-sunk">
        <Icon name="check" size={28} tone="income" strokeWidth={2.25} />
      </View>
      <Text variant="title" className="text-center">
        All caught up
      </Text>
      <Text variant="body" tone="graphite" className="mt-2 text-center">
        Every payment your bank reported is accounted for. Cash spending still needs adding by hand.
      </Text>
      <View className="mt-6">
        <Button label="Add cash spending" icon="plus" variant="secondary" onPress={() => router.replace('/add')} testID="review-add-cash" />
      </View>
    </View>
  );
}
