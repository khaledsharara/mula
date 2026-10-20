import { View } from 'react-native';

import { Icon } from './Icon';
import { Press } from './Press';
import { Text } from './Text';

export type NumpadKey = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '.' | 'back' | '+' | '−' | '×' | '÷' | '=';

type Props = {
  onKey: (k: NumpadKey) => void;
  /** Show the operator column for quick sums (e.g. splitting a bill). */
  operators?: boolean;
};

const rows: NumpadKey[][] = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['.', '0', 'back'],
];
const ops: NumpadKey[] = ['÷', '×', '−', '+'];

export function Numpad({ onKey, operators = true }: Props) {
  return (
    <View className="flex-row px-3" testID="numpad">
      <View className="flex-1">
        {rows.map((row, i) => (
          <View key={i} className="flex-row">
            {row.map((k) => (
              <Press
                key={k}
                testID={`key-${k === '.' ? 'dot' : k}`}
                onPress={() => onKey(k)}
                onLongPress={k === 'back' ? () => onKey('=') : undefined}
                haptic="light"
                dim={0.4}
                accessibilityLabel={k === 'back' ? 'Delete' : k}
                className="h-[58px] flex-1 items-center justify-center"
              >
                {k === 'back' ? (
                  <Icon name="delete" size={24} tone="ink" />
                ) : (
                  <Text variant="title" weight="regular" tabular>
                    {k}
                  </Text>
                )}
              </Press>
            ))}
          </View>
        ))}
      </View>
      {operators ? (
        <View className="w-16">
          {ops.map((k) => (
            <Press
              key={k}
              testID={`key-op-${k}`}
              onPress={() => onKey(k)}
              haptic="light"
              dim={0.4}
              accessibilityLabel={k}
              className="h-[58px] items-center justify-center"
            >
              <Text variant="title" weight="light" tone="graphite">
                {k}
              </Text>
            </Press>
          ))}
        </View>
      ) : null}
    </View>
  );
}

/** Applies a key to a calculator expression like "120+35.5". Returns the new expression. */
export function applyNumpadKey(expr: string, key: NumpadKey): string {
  const isOp = (ch: string) => ['+', '−', '×', '÷'].includes(ch);
  if (key === 'back') return expr.slice(0, -1);
  if (key === '=') return evaluateExpression(expr)?.toString() ?? expr;
  if (isOp(key)) {
    if (!expr) return expr;
    return isOp(expr.slice(-1)) ? expr.slice(0, -1) + key : expr + key;
  }
  const lastNumber = expr.split(/[+−×÷]/).pop() ?? '';
  if (key === '.') {
    if (lastNumber.includes('.')) return expr;
    return expr + (lastNumber === '' ? '0.' : '.');
  }
  const [, decimals] = lastNumber.split('.');
  if (decimals !== undefined && decimals.length >= 2) return expr;
  if (lastNumber === '0') return expr.slice(0, -1) + key;
  if (lastNumber.replace('.', '').length >= 9) return expr;
  return expr + key;
}

/** Evaluates "120+35.5×2" with normal precedence; null when incomplete. */
export function evaluateExpression(expr: string): number | null {
  if (!expr) return null;
  const tokens = expr.match(/\d+\.?\d*|[+−×÷]/g);
  if (!tokens) return null;
  const nums: number[] = [];
  const opsStack: string[] = [];
  const prec = (o: string) => (o === '×' || o === '÷' ? 2 : 1);
  const apply = () => {
    const b = nums.pop()!;
    const a = nums.pop()!;
    const o = opsStack.pop()!;
    nums.push(o === '+' ? a + b : o === '−' ? a - b : o === '×' ? a * b : b === 0 ? NaN : a / b);
  };
  for (const t of tokens) {
    if (/\d/.test(t)) nums.push(parseFloat(t));
    else {
      while (opsStack.length && prec(opsStack[opsStack.length - 1]) >= prec(t)) apply();
      opsStack.push(t);
    }
  }
  if (nums.length <= opsStack.length) opsStack.pop();
  while (opsStack.length && nums.length >= 2) apply();
  const v = nums[0];
  return Number.isFinite(v) ? Math.round(v * 100) / 100 : null;
}
