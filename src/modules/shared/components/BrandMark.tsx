import { useId } from 'react';
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

/** The app icon as a small tile (same geometry as assets/brand/mark.svg). */
export function BrandMark({ size = 56 }: { size?: number }) {
  // Gradient ids are document-wide on the web; keep each instance's own.
  const gradient = `mula-mark-${useId().replace(/[^a-zA-Z0-9-]/g, '')}`;
  return (
    <Svg width={size} height={size} viewBox="0 0 1024 1024" accessibilityLabel="Mula">
      <Defs>
        <LinearGradient id={gradient} x1="0" y1="0" x2="0.36" y2="1">
          <Stop offset="0" stopColor="#3B56EA" />
          <Stop offset="1" stopColor="#2235B4" />
        </LinearGradient>
      </Defs>
      <Rect x={0} y={0} width={1024} height={1024} rx={230} fill={`url(#${gradient})`} />
      <Path
        d="M 248 736 V 512 A 120 120 0 0 1 488 512 V 736 M 488 512 A 120 120 0 0 1 728 512 V 736"
        fill="none"
        stroke="#F5F5F1"
        strokeWidth={92}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx={782} cy={280} r={46} fill="#F5F5F1" />
    </Svg>
  );
}
