import { addDays, format } from 'date-fns';
import { scaleLinear } from 'd3-scale';
import { curveMonotoneX, line } from 'd3-shape';
import { useState, type ReactNode } from 'react';
import { View, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';

import { IconTile } from '../../shared/components/Misc';
import { Press } from '../../shared/components/Press';
import { Text } from '../../shared/components/Text';
import { useTheme } from '../../shared/theme/ThemeProvider';
import { withAlpha } from '../../shared/theme/tokens';
import { formatMoney } from '../../shared/utils/money';
import type { MonthBucket } from '../utils/aggregations';

const compact = (minor: number) => formatMoney(minor, { compact: true, sign: 'never' });

function useWidth(): [number, (e: LayoutChangeEvent) => void] {
  const [w, setW] = useState(0);
  return [w, (e) => setW(Math.round(e.nativeEvent.layout.width))];
}

/** One line of text above a chart: the summary, or the value under your finger. */
export function Readout({ children }: { children: ReactNode }) {
  return (
    <View className="mb-2 min-h-[20px]">
      <Text variant="label" weight="regular" tone="graphite" tabular>
        {children}
      </Text>
    </View>
  );
}

/** Taps and drags across a chart report an x position (the SVG inside ignores touches, see below). */
function scrubHandlers(onX: (x: number) => void) {
  const pick = (e: GestureResponderEvent) => onX(e.nativeEvent.locationX);
  return {
    onStartShouldSetResponder: () => true,
    onMoveShouldSetResponder: () => true,
    onResponderTerminationRequest: () => true,
    onResponderGrant: pick,
    onResponderMove: pick,
  };
}

/* ---------- Cumulative spend: this period vs the previous one ---------- */

type CumulativeProps = {
  /** Running total per day so far (index 0 = day 1). */
  current: number[];
  /** Running total per day of the comparison period. */
  previous: number[];
  /** Number of days on the x axis. */
  days: number;
  /** Start of the current period, for date labels. */
  start: number;
  currentLabel: string;
  previousLabel: string;
};

export function CumulativeChart({ current, previous, days, start, currentLabel, previousLabel }: CumulativeProps) {
  const { c } = useTheme();
  const [width, onLayout] = useWidth();
  const [sel, setSel] = useState<number | null>(null);
  const height = 168;
  const pad = { top: 10, right: 4, bottom: 22, left: 40 };
  const max = Math.max(1, ...current, ...previous);
  const x = scaleLinear().domain([0, Math.max(1, days - 1)]).range([pad.left, Math.max(pad.left + 1, width - pad.right)]);
  const y = scaleLinear().domain([0, max]).nice(3).range([height - pad.bottom, pad.top]);
  const ticks = y.ticks(3);
  const path = line<number>().x((_, i) => x(i)).y((v) => y(v)).curve(curveMonotoneX);
  const last = current.length - 1;
  const i = sel ?? last;
  const dayTs = addDays(start, Math.max(0, i)).getTime();

  return (
    <View>
      <Readout>
        {i >= 0 && current[i] != null
          ? `${format(dayTs, 'd MMM')}: ${formatMoney(current[i])} so far${previous[i] != null ? `, ${previousLabel.toLowerCase()} ${formatMoney(previous[i])}` : ''}`
          : 'No spending yet'}
      </Readout>
      <View onLayout={onLayout} style={{ height }} {...scrubHandlers((px) => setSel(Math.max(0, Math.min(last, Math.round(x.invert(px))))))} accessibilityLabel={`${currentLabel} compared with ${previousLabel}`}>
        {width > 0 ? (
          <View pointerEvents="none">
            <Svg width={width} height={height}>
              {ticks.map((t) => (
                <G key={t}>
                  <Line x1={pad.left} x2={width - pad.right} y1={y(t)} y2={y(t)} stroke={c.hairline} strokeWidth={1} />
                  <SvgText x={pad.left - 8} y={y(t) + 4} fontSize={10.5} fill={c.mist} textAnchor="end" fontFamily="HostGrotesk_400Regular">
                    {t === 0 ? '0' : compact(t)}
                  </SvgText>
                </G>
              ))}
              {[0, Math.round((days - 1) / 2), days - 1].map((d) => (
                <SvgText key={d} x={x(d)} y={height - 5} fontSize={10.5} fill={c.mist} textAnchor={d === 0 ? 'start' : d === days - 1 ? 'end' : 'middle'} fontFamily="HostGrotesk_400Regular">
                  {format(addDays(start, d), 'd MMM')}
                </SvgText>
              ))}
              {previous.length > 1 ? <Path d={path(previous) ?? ''} stroke={c.mist} strokeWidth={1.5} strokeDasharray="4 4" fill="none" /> : null}
              {current.length > 1 ? <Path d={path(current) ?? ''} stroke={c.accent} strokeWidth={2} fill="none" strokeLinecap="round" /> : null}
              {i >= 0 && current[i] != null ? (
                <>
                  <Line x1={x(i)} x2={x(i)} y1={pad.top} y2={height - pad.bottom} stroke={c.graphite} strokeWidth={1} opacity={sel == null ? 0 : 0.5} />
                  <Circle cx={x(i)} cy={y(current[i])} r={4.5} fill={c.accent} stroke={c.paper} strokeWidth={2} />
                </>
              ) : null}
            </Svg>
          </View>
        ) : null}
      </View>
      <View className="mt-2 flex-row gap-4">
        <Legend color={c.accent} label={currentLabel} />
        <Legend color={c.mist} label={previousLabel} dashed />
      </View>
    </View>
  );
}

export function Legend({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <View className="flex-row items-center">
      {dashed ? (
        <View className="mr-1.5 flex-row gap-0.5">
          <View className="h-0.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
          <View className="h-0.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
        </View>
      ) : (
        <View className="mr-1.5 h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      )}
      <Text variant="caption" tone="graphite">
        {label}
      </Text>
    </View>
  );
}

/* ---------- Needs / wants / savings per month ---------- */

export function NatureColumns({ months }: { months: MonthBucket[] }) {
  const { c, nature } = useTheme();
  const [width, onLayout] = useWidth();
  const [sel, setSel] = useState<number | null>(null);
  const height = 150;
  const bottom = 20;
  const totals = months.map((m) => m.nature.need + m.nature.want + m.nature.saving);
  const max = Math.max(1, ...totals);
  const slot = width / Math.max(1, months.length);
  const barW = Math.min(30, slot * 0.56);
  const y = scaleLinear().domain([0, max]).range([0, height - bottom - 6]);
  const i = sel ?? months.length - 1;
  const m = months[i];
  const t = totals[i] ?? 0;
  const pct = (v: number) => (t ? Math.round((v / t) * 100) : 0);

  return (
    <View>
      <Readout>
        {m && t ? `${format(m.month, 'MMMM')}: needs ${pct(m.nature.need)}%, wants ${pct(m.nature.want)}%, savings ${pct(m.nature.saving)}%` : 'No classified spending yet'}
      </Readout>
      <View onLayout={onLayout} style={{ height }} {...scrubHandlers((px) => setSel(Math.max(0, Math.min(months.length - 1, Math.floor(px / Math.max(1, slot))))))}>
        {width > 0 ? (
          <View pointerEvents="none">
            <Svg width={width} height={height}>
              <Line x1={0} x2={width} y1={height - bottom + 0.5} y2={height - bottom + 0.5} stroke={c.hairline} strokeWidth={1} />
              {months.map((mo, idx) => {
                const cx = slot * idx + slot / 2;
                const segs = [
                  { v: mo.nature.need, color: nature.need },
                  { v: mo.nature.want, color: nature.want },
                  { v: mo.nature.saving, color: nature.saving },
                ].filter((s) => s.v > 0);
                let base = height - bottom;
                return (
                  <G key={mo.month} opacity={sel == null || sel === idx ? 1 : 0.4}>
                    {segs.map((s, si) => {
                      const h = Math.max(2, y(s.v) - (si > 0 ? 2 : 0));
                      base -= h + (si > 0 ? 2 : 0);
                      const isTop = si === segs.length - 1;
                      return <Rect key={si} x={cx - barW / 2} y={base} width={barW} height={h} rx={isTop ? 4 : 1} fill={s.color} />;
                    })}
                    <SvgText x={cx} y={height - 5} fontSize={10.5} fill={idx === i ? c.ink : c.mist} textAnchor="middle" fontFamily="HostGrotesk_500Medium">
                      {format(mo.month, 'MMM')}
                    </SvgText>
                  </G>
                );
              })}
            </Svg>
          </View>
        ) : null}
      </View>
      <View className="mt-2 flex-row flex-wrap gap-4">
        <Legend color={nature.need} label="Needs" />
        <Legend color={nature.want} label="Wants" />
        <Legend color={nature.saving} label="Savings" />
      </View>
    </View>
  );
}

/* ---------- Ranked bars (categories, payees) ---------- */

export type BarItem = { id: string; label: string; value: number; icon?: string; color?: string; sub?: string };

export function BarList({ items, total, onPress, max = 8 }: { items: BarItem[]; total: number; onPress?: (item: BarItem) => void; max?: number }) {
  const { c } = useTheme();
  const top = items.slice(0, max);
  const rest = items.slice(max);
  const restValue = rest.reduce((s, r) => s + r.value, 0);
  const rows = restValue > 0 ? [...top, { id: '__other', label: `Other (${rest.length})`, value: restValue, icon: 'shapes' }] : top;
  const peak = Math.max(1, ...rows.map((r) => r.value));

  return (
    <View>
      {rows.map((r) => {
        const tappable = Boolean(onPress) && r.id !== '__other';
        const row = (
          <View className="flex-row items-center py-2">
            {r.icon ? (
              <View className="mr-3">
                <IconTile icon={r.icon} color={r.color} muted={!r.color} size={32} />
              </View>
            ) : null}
            <View className="flex-1">
              <View className="flex-row items-baseline justify-between">
                <Text variant="label" numberOfLines={1} className="flex-1 pr-2">
                  {r.label}
                </Text>
                <Text variant="label" tabular>
                  {formatMoney(r.value)}
                </Text>
              </View>
              <View className="mt-1.5 flex-row items-center">
                <View className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ backgroundColor: c.sunk }}>
                  <View className="h-full rounded-full" style={{ width: `${(r.value / peak) * 100}%`, backgroundColor: r.id === '__other' ? c.mist : c.ink }} />
                </View>
                <Text variant="caption" tone="mist" tabular numberOfLines={1} className="ml-2 w-12 text-right">
                  {total ? `${Math.round((r.value / total) * 100)}%` : ''}
                </Text>
              </View>
              {r.sub ? (
                <Text variant="caption" tone="graphite" className="mt-0.5">
                  {r.sub}
                </Text>
              ) : null}
            </View>
          </View>
        );
        return tappable ? (
          <Press key={r.id} onPress={() => onPress!(r)} dim={0.6} testID={`bar-${r.label}`}>
            {row}
          </Press>
        ) : (
          <View key={r.id} testID={`bar-${r.label}`}>
            {row}
          </View>
        );
      })}
    </View>
  );
}

/* ---------- Calendar heatmap (one month) ---------- */

export function CalendarHeat({ month, values }: { month: number; values: { day: number; amount: number }[] }) {
  const { c } = useTheme();
  const [width, onLayout] = useWidth();
  const [sel, setSel] = useState<number | null>(null);
  const first = new Date(month);
  const lead = (first.getDay() + 6) % 7;
  const gap = 4;
  const cell = width > 0 ? (width - gap * 6) / 7 : 0;
  const nonZero = values.map((v) => v.amount).filter((v) => v > 0).sort((a, b) => a - b);
  // Quantile steps so one big rent day doesn't wash out every other day.
  const q = (p: number) => nonZero[Math.min(nonZero.length - 1, Math.floor(p * nonZero.length))] ?? 0;
  const steps = [q(0.25), q(0.5), q(0.75)];
  const level = (v: number) => (v <= 0 ? 0 : v <= steps[0] ? 1 : v <= steps[1] ? 2 : v <= steps[2] ? 3 : 4);
  const alpha = [0, 0.16, 0.34, 0.58, 0.9];
  const selected = sel != null ? values[sel] : null;
  const today = new Date().toDateString();

  return (
    <View>
      <Readout>
        {selected ? `${format(selected.day, 'EEEE d MMM')}: ${selected.amount ? formatMoney(selected.amount) : 'nothing spent'}` : 'Tap a day to see what you spent'}
      </Readout>
      <View className="mb-1 flex-row" style={{ gap }}>
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
          <Text key={i} variant="caption" tone="mist" className="text-center" style={{ width: cell }}>
            {d}
          </Text>
        ))}
      </View>
      <View onLayout={onLayout} className="flex-row flex-wrap" style={{ gap }}>
        {Array.from({ length: lead }).map((_, i) => (
          <View key={`l${i}`} style={{ width: cell, height: cell }} />
        ))}
        {values.map((v, i) => {
          const lv = level(v.amount);
          const isToday = new Date(v.day).toDateString() === today;
          return (
            <Press key={v.day} onPress={() => setSel(sel === i ? null : i)} dim={0.7} accessibilityLabel={`${format(v.day, 'd MMMM')}, ${formatMoney(v.amount)}`}>
              <View
                className="items-center justify-center rounded-tile"
                style={{
                  width: cell,
                  height: cell,
                  backgroundColor: lv ? withAlpha(c.accent, alpha[lv]) : c.sunk,
                  borderWidth: sel === i || isToday ? 1.5 : 0,
                  borderColor: sel === i ? c.ink : c.accent,
                }}
              >
                <Text variant="caption" tone={lv >= 3 ? 'on-accent' : 'graphite'} tabular>
                  {new Date(v.day).getDate()}
                </Text>
              </View>
            </Press>
          );
        })}
      </View>
      <View className="mt-3 flex-row items-center">
        <Text variant="caption" tone="mist" className="mr-2">
          Less
        </Text>
        {alpha.map((a, i) => (
          <View key={i} className="mr-1 h-3 w-3 rounded-[3px]" style={{ backgroundColor: i ? withAlpha(c.accent, a) : c.sunk }} />
        ))}
        <Text variant="caption" tone="mist" className="ml-1">
          More
        </Text>
      </View>
    </View>
  );
}

/* ---------- When you spend: weekday × time of day ---------- */

// `short` fits a column on the narrowest phones; the readout uses the full label.
const BLOCKS: { label: string; short: string; from: number; to: number }[] = [
  { label: 'Night', short: 'Night', from: 0, to: 6 },
  { label: 'Morning', short: 'Morn', from: 6, to: 11 },
  { label: 'Midday', short: 'Noon', from: 11, to: 14 },
  { label: 'Afternoon', short: 'Aft', from: 14, to: 18 },
  { label: 'Evening', short: 'Eve', from: 18, to: 22 },
  { label: 'Late', short: 'Late', from: 22, to: 24 },
];
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function WeekGrid({ grid }: { grid: number[][] }) {
  const { c } = useTheme();
  const [sel, setSel] = useState<[number, number] | null>(null);
  const cells = grid.map((row) => BLOCKS.map((b) => row.slice(b.from, b.to).reduce((s, v) => s + v, 0)));
  const max = Math.max(1, ...cells.flat());
  let peak: [number, number] = [0, 0];
  cells.forEach((row, r) => row.forEach((v, k) => v > cells[peak[0]][peak[1]] && (peak = [r, k])));
  const shown = sel ?? (cells[peak[0]][peak[1]] > 0 ? peak : null);

  return (
    <View>
      <Readout>
        {shown
          ? `${sel ? '' : 'Busiest: '}${WEEKDAYS[shown[0]]} ${BLOCKS[shown[1]].label.toLowerCase()}, ${formatMoney(cells[shown[0]][shown[1]])}`
          : 'Not enough records yet'}
      </Readout>
      <View className="flex-row">
        <View className="w-10" />
        {BLOCKS.map((b) => (
          <Text key={b.label} variant="caption" tone="mist" className="flex-1 text-center" numberOfLines={1} style={{ fontSize: 10.5 }} accessibilityLabel={b.label}>
            {b.short}
          </Text>
        ))}
      </View>
      {cells.map((row, r) => (
        <View key={r} className="mt-1 flex-row items-center">
          <Text variant="caption" tone="graphite" className="w-10">
            {WEEKDAYS[r]}
          </Text>
          {row.map((v, k) => (
            <Press key={k} onPress={() => setSel(sel && sel[0] === r && sel[1] === k ? null : [r, k])} dim={0.7} className="flex-1 px-0.5" accessibilityLabel={`${WEEKDAYS[r]} ${BLOCKS[k].label}, ${formatMoney(v)}`}>
              <View
                className="h-7 rounded-md"
                style={{
                  backgroundColor: v > 0 ? withAlpha(c.accent, 0.12 + 0.78 * Math.sqrt(v / max)) : c.sunk,
                  borderWidth: shown && shown[0] === r && shown[1] === k ? 1.5 : 0,
                  borderColor: c.ink,
                }}
              />
            </Press>
          ))}
        </View>
      ))}
    </View>
  );
}

/* ---------- Income and spending per month ---------- */

export function IncomeSpendBars({ months }: { months: MonthBucket[] }) {
  const { c } = useTheme();
  const [width, onLayout] = useWidth();
  const [sel, setSel] = useState<number | null>(null);
  const height = 140;
  const bottom = 20;
  const max = Math.max(1, ...months.flatMap((m) => [m.spent, m.earned]));
  const slot = width / Math.max(1, months.length);
  const barW = Math.min(12, slot * 0.26);
  const y = scaleLinear().domain([0, max]).range([0, height - bottom - 6]);
  const i = sel ?? months.length - 1;
  const m = months[i];

  return (
    <View>
      <Readout>{m ? `${format(m.month, 'MMMM')}: in ${formatMoney(m.earned)}, out ${formatMoney(m.spent)}, ${m.earned - m.spent >= 0 ? 'kept' : 'short'} ${formatMoney(Math.abs(m.earned - m.spent))}` : ''}</Readout>
      <View onLayout={onLayout} style={{ height }} {...scrubHandlers((px) => setSel(Math.max(0, Math.min(months.length - 1, Math.floor(px / Math.max(1, slot))))))}>
        {width > 0 ? (
          <View pointerEvents="none">
            <Svg width={width} height={height}>
              <Line x1={0} x2={width} y1={height - bottom + 0.5} y2={height - bottom + 0.5} stroke={c.hairline} strokeWidth={1} />
              {months.map((mo, idx) => {
                const cx = slot * idx + slot / 2;
                const hIn = Math.max(mo.earned ? 2 : 0, y(mo.earned));
                const hOut = Math.max(mo.spent ? 2 : 0, y(mo.spent));
                return (
                  <G key={mo.month} opacity={sel == null || sel === idx ? 1 : 0.4}>
                    <Rect x={cx - barW - 1} y={height - bottom - hIn} width={barW} height={hIn} rx={Math.min(4, barW / 2)} fill={c.income} />
                    <Rect x={cx + 1} y={height - bottom - hOut} width={barW} height={hOut} rx={Math.min(4, barW / 2)} fill={c.ink} />
                    <SvgText x={cx} y={height - 5} fontSize={10.5} fill={idx === i ? c.ink : c.mist} textAnchor="middle" fontFamily="HostGrotesk_500Medium">
                      {format(mo.month, 'MMM')}
                    </SvgText>
                  </G>
                );
              })}
            </Svg>
          </View>
        ) : null}
      </View>
      <View className="mt-2 flex-row gap-4">
        <Legend color={c.income} label="Income" />
        <Legend color={c.ink} label="Spending" />
      </View>
    </View>
  );
}
