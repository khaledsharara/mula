import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  setHours,
  setMinutes,
  startOfMonth,
  startOfWeek,
  subDays,
} from 'date-fns';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { BottomSheet } from './BottomSheet';
import { Button, IconButton } from './Button';
import { Chip } from './Chip';
import { Stepper } from './Fields';
import { Press } from './Press';
import { Text } from './Text';

type Props = {
  visible: boolean;
  value: number;
  onClose: () => void;
  onChange: (ts: number) => void;
  /** Hide the time row for date-only fields such as due dates. */
  withTime?: boolean;
  title?: string;
};

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

export function DateTimeSheet({ visible, value, onClose, onChange, withTime = true, title = 'Date' }: Props) {
  const [draft, setDraft] = useState(value);
  const [month, setMonth] = useState(startOfMonth(value).getTime());

  useEffect(() => {
    if (visible) {
      setDraft(value);
      setMonth(startOfMonth(value).getTime());
    }
  }, [visible, value]);

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }),
  });
  const d = new Date(draft);

  const pickDay = (day: Date) => {
    const next = new Date(day);
    next.setHours(d.getHours(), d.getMinutes(), 0, 0);
    setDraft(next.getTime());
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={title}
      testID="date-sheet"
      footer={
        <Button
          label="Done"
          size="lg"
          full
          onPress={() => {
            onChange(draft);
            onClose();
          }}
          testID="date-done"
        />
      }
    >
      <View className="flex-row gap-2 px-5 pb-3">
        <Chip label="Today" selected={isSameDay(draft, Date.now())} onPress={() => pickDay(new Date())} />
        <Chip label="Yesterday" selected={isSameDay(draft, subDays(Date.now(), 1))} onPress={() => pickDay(subDays(new Date(), 1))} />
      </View>
      <View className="flex-row items-center justify-between px-3">
        <IconButton icon="chevron-left" label="Previous month" onPress={() => setMonth(addMonths(month, -1).getTime())} />
        <Text variant="body" weight="semibold">
          {format(month, 'MMMM yyyy')}
        </Text>
        <IconButton icon="chevron-right" label="Next month" onPress={() => setMonth(addMonths(month, 1).getTime())} />
      </View>
      <View className="px-4 pt-1">
        <View className="flex-row">
          {WEEKDAYS.map((w) => (
            <View key={w} className="flex-1 items-center py-1.5">
              <Text variant="caption" tone="mist">
                {w}
              </Text>
            </View>
          ))}
        </View>
        <View className="flex-row flex-wrap">
          {days.map((day) => {
            const selected = isSameDay(day, draft);
            const inMonth = isSameMonth(day, month);
            const today = isSameDay(day, Date.now());
            return (
              <Press
                key={day.toISOString()}
                onPress={() => pickDay(day)}
                haptic="select"
                className="items-center justify-center py-0.5"
                style={{ width: `${100 / 7}%` }}
                accessibilityLabel={format(day, 'd MMMM')}
              >
                <View className={`h-10 w-10 items-center justify-center rounded-full ${selected ? 'bg-ink' : ''}`}>
                  <Text
                    variant="label"
                    weight={today || selected ? 'semibold' : 'regular'}
                    tone={selected ? 'paper' : today ? 'accent' : inMonth ? 'ink' : 'mist'}
                    tabular
                  >
                    {format(day, 'd')}
                  </Text>
                </View>
              </Press>
            );
          })}
        </View>
      </View>
      {withTime ? (
        <View className="mt-3 flex-row items-center justify-between px-5 py-2">
          <Text variant="body">Time</Text>
          <View className="flex-row items-center gap-2">
            <Stepper value={d.getHours()} min={0} max={23} format={(v) => String(v).padStart(2, '0')} onChange={(h) => setDraft(setHours(draft, h).getTime())} />
            <Text variant="body" tone="graphite">
              :
            </Text>
            <Stepper
              value={Math.floor(d.getMinutes() / 5)}
              min={0}
              max={11}
              format={(v) => String(v * 5).padStart(2, '0')}
              onChange={(m) => setDraft(setMinutes(draft, m * 5).getTime())}
            />
          </View>
        </View>
      ) : null}
    </BottomSheet>
  );
}
