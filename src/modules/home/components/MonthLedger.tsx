import { useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import Svg, { Line, Rect } from 'react-native-svg';

import { useTheme } from '../../shared/theme/ThemeProvider';

type Props = {
  /** Spending per day for the whole month (future days are 0). */
  days: number[];
  /** Index of today within `days`. */
  today: number;
  height?: number;
};

/**
 * The month as a ledger line: one thin bar per day, today's bar in ink, past days in
 * graphite, the rest of the month as faint ticks so you can see how much month is left.
 */
export function MonthLedger({ days, today, height = 44 }: Props) {
  const { c } = useTheme();
  const [width, setWidth] = useState(0);
  const max = Math.max(1, ...days);
  const gap = 3;
  const barW = width > 0 ? Math.max(2, (width - gap * (days.length - 1)) / days.length) : 0;

  return (
    <View onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)} style={{ height }} accessibilityLabel="Daily spending this month">
      {width > 0 ? (
        <Svg width={width} height={height}>
          <Line x1={0} x2={width} y1={height - 0.5} y2={height - 0.5} stroke={c.hairline} strokeWidth={1} />
          {days.map((v, i) => {
            const x = i * (barW + gap);
            if (i > today) {
              return <Rect key={i} x={x} y={height - 3} width={barW} height={2} rx={1} fill={c.hairline} />;
            }
            const h = v > 0 ? Math.max(3, Math.round((v / max) * (height - 4))) : 2;
            return <Rect key={i} x={x} y={height - h} width={barW} height={h} rx={Math.min(1.5, barW / 2)} fill={i === today ? c.accent : v > 0 ? c.ink : c.hairline} opacity={i === today || v === 0 ? 1 : 0.82} />;
          })}
        </Svg>
      ) : null}
    </View>
  );
}
