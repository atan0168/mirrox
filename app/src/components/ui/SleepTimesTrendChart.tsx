import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  LayoutChangeEvent,
  Text,
  PanResponder,
  Animated,
} from 'react-native';
import Svg, { Line, Circle, Text as SvgText, Rect } from 'react-native-svg';
import { colors } from '../../theme';
import { parseISO } from 'date-fns';

export interface SleepTimesDatum {
  label: string; // X-axis label like MM/dd
  sleepStart?: string | null; // ISO bedtime
  sleepEnd?: string | null; // ISO wake time
}

export interface SleepTimesTrendChartProps {
  data: SleepTimesDatum[];
  height?: number;
  axisColor?: string;
  bedColor?: string;
  wakeColor?: string;
  linkColor?: string;
}

interface PointBar {
  x: number;
  label: string;
  bedMin?: number | null; // minutes-of-day 0..1440
  wakeMin?: number | null;
}

const PADDING_X = 12;
const PADDING_TOP = 12;
const LEGEND_RESERVED_PX = 24;
const PADDING_BOTTOM = 26;
const EXTRA_RIGHT_PAD = 12;

function minutesOfDay(iso?: string | null): number | null {
  if (!iso) return null;
  try {
    const d = parseISO(iso);
    const m = d.getHours() * 60 + d.getMinutes();
    return Math.max(0, Math.min(1439, m));
  } catch {
    return null;
  }
}

const SleepTimesTrendChart: React.FC<SleepTimesTrendChartProps> = ({
  data,
  height = 180,
  axisColor = colors.neutral[300],
  bedColor = colors.sky[700],
  wakeColor = colors.orange[500],
  linkColor = colors.neutral[400],
}) => {
  const [width, setWidth] = useState(0);

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isTouching, setIsTouching] = useState(false);
  const dimAnim = useRef(new Animated.Value(0)).current;
  const [dimT, setDimT] = useState(0);

  const { points, innerW, topPad, innerH } = useMemo(() => {
    const innerW = Math.max(
      0,
      width - PADDING_X - (PADDING_X + EXTRA_RIGHT_PAD)
    );
    const topPad = PADDING_TOP + LEGEND_RESERVED_PX;
    const count = Math.max(1, data.length);
    // Make dense series fit without clipping by allowing tighter gaps
    // and smaller point widths when needed.
    let minGap = 8;
    if (count > 24) minGap = 2.5;
    else if (count > 14) minGap = 4;

    // Start with a conservative gap, then adjust to ensure we fit.
    let gap = Math.min(minGap, innerW / Math.max(1, count + 1));
    let pointW = (innerW - gap * (count - 1)) / count;
    const MIN_POINT_W = 2; // allow small but visible
    if (pointW < MIN_POINT_W) {
      // Reduce gap if needed to keep point width readable and still fit.
      gap = Math.max(1, (innerW - count * MIN_POINT_W) / Math.max(1, count - 1));
      pointW = Math.max(MIN_POINT_W, (innerW - gap * (count - 1)) / count);
    }

    const innerH = Math.max(0, height - topPad - PADDING_BOTTOM);
    let x = PADDING_X + pointW / 2; // center points
    const pts: PointBar[] = data.map(d => {
      const bedMin = minutesOfDay(d.sleepStart ?? null);
      const wakeMin = minutesOfDay(d.sleepEnd ?? null);
      const px = x;
      x += pointW + gap;
      return { x: px, label: d.label, bedMin, wakeMin };
    });
    return { points: pts, innerW, topPad, innerH };
  }, [data, width, height]);

  const onLayout = (e: LayoutChangeEvent) =>
    setWidth(e.nativeEvent.layout.width);

  // Y mapping: 0 = top (00:00), 1440 = bottom (24:00)
  const yForMin = (m: number) => {
    const y = topPad + (m / 1440) * innerH;
    return y;
  };

  // Interaction helpers
  const pickIndexFromX = (px: number) => {
    if (!points.length) return null;
    const clampedX = Math.max(PADDING_X, Math.min(px, PADDING_X + innerW));
    let closestIdx = 0;
    let closestDist = Number.POSITIVE_INFINITY;
    for (let i = 0; i < points.length; i++) {
      const center = points[i].x;
      const d = Math.abs(center - clampedX);
      if (d < closestDist) {
        closestDist = d;
        closestIdx = i;
      }
    }
    return closestIdx;
  };

  const handleTouch = (evt: any) => {
    const { locationX, locationY } = evt.nativeEvent;
    if (locationY >= topPad && locationY <= height - PADDING_BOTTOM) {
      const idx = pickIndexFromX(locationX);
      if (idx != null) setSelectedIndex(idx);
      setIsTouching(true);
    }
  };

  // Animate dim overlay when interacting
  useEffect(() => {
    Animated.timing(dimAnim, {
      toValue: isTouching ? 1 : 0,
      duration: 180,
      useNativeDriver: false,
    }).start();
  }, [isTouching, dimAnim]);

  useEffect(() => {
    const id = dimAnim.addListener(({ value }) =>
      setDimT(typeof value === 'number' ? value : 0)
    );
    return () => dimAnim.removeListener(id);
  }, [dimAnim]);

  return (
    <View style={[styles.container, { height }]} onLayout={onLayout}>
      <Svg width={width} height={height}>
        {/* X axis baseline */}
        <Line
          x1={PADDING_X}
          y1={height - PADDING_BOTTOM + 0.5}
          x2={Math.max(PADDING_X, width - (PADDING_X + EXTRA_RIGHT_PAD))}
          y2={height - PADDING_BOTTOM + 0.5}
          stroke={axisColor}
          strokeWidth={1}
        />
        {/* Horizontal reference lines at 0, 6, 12, 18, 24h */}
        {[0, 360, 720, 1080, 1440].map((min, i) => (
          <Line
            key={`ref-${i}`}
            x1={PADDING_X}
            y1={yForMin(min) + 0.5}
            x2={Math.max(PADDING_X, width - (PADDING_X + EXTRA_RIGHT_PAD))}
            y2={yForMin(min) + 0.5}
            stroke={i === 2 ? colors.neutral[300] : colors.neutral[200]}
            strokeWidth={i === 2 ? 1 : 0.5}
          />
        ))}
        {/* Points and links */}
        {points.map((p, i) => {
          // Scale point radius a bit when dense to reduce overlap
          const stepX = i === 0 ? (points[1]?.x ?? p.x) - p.x : p.x - points[i - 1].x;
          const r = Math.max(1.5, Math.min(3, stepX * 0.35));
          const hasBed = typeof p.bedMin === 'number';
          const hasWake = typeof p.wakeMin === 'number';
          const bedY = hasBed ? yForMin(p.bedMin as number) : null;
          const wakeY = hasWake ? yForMin(p.wakeMin as number) : null;
          const isDimmed =
            isTouching && selectedIndex != null && selectedIndex !== i;
          const opacity = isDimmed ? 1 - 0.65 * dimT : 1;
          return (
            <React.Fragment key={`pt-${i}`}>
              {hasBed && hasWake && (
                <Line
                  x1={p.x}
                  y1={bedY!}
                  x2={p.x}
                  y2={wakeY!}
                  stroke={linkColor}
                  strokeWidth={1}
                  opacity={opacity}
                />
              )}
              {hasBed && (
                <Circle
                  cx={p.x}
                  cy={bedY!}
                  r={r}
                  fill={bedColor}
                  opacity={opacity}
                />
              )}
              {hasWake && (
                <Circle
                  cx={p.x}
                  cy={wakeY!}
                  r={r}
                  fill={wakeColor}
                  opacity={opacity}
                />
              )}
              {/* Invisible tap zone */}
              <Rect
                x={p.x - 12}
                y={topPad}
                width={24}
                height={height - topPad - PADDING_BOTTOM}
                fill={bedColor}
                opacity={0.01}
              />
            </React.Fragment>
          );
        })}
        {/* X labels */}
        <XAxisLabels points={points} innerW={innerW} chartHeight={height} />
        {/* Y labels */}
        <YAxisLabels height={height} topPad={topPad} />
        {/* Selected value label */}
        {isTouching && selectedIndex != null && points[selectedIndex] && (
          <SelectedValueOnPressLabel
            point={points[selectedIndex]}
            chartWidth={width}
            chartHeight={height}
            topPad={topPad}
          />
        )}
      </Svg>
      {/* Legend (top-right overlay) */}
      <View style={styles.legendOverlay} pointerEvents="none">
        <LegendSwatch color={bedColor} label="Bedtime" />
        <LegendSwatch color={wakeColor} label="Wake time" />
      </View>
      {/* Gesture overlay */}
      <View
        style={styles.gestureOverlay}
        {...PanResponder.create({
          onStartShouldSetPanResponder: e => {
            const y = e.nativeEvent.locationY;
            return (
              y >= PADDING_TOP + LEGEND_RESERVED_PX &&
              y <= height - PADDING_BOTTOM
            );
          },
          onMoveShouldSetPanResponder: (e, gesture) => {
            const y = e.nativeEvent.locationY;
            return (
              (Math.abs(gesture.dx) > 1 || Math.abs(gesture.dy) > 1) &&
              y >= PADDING_TOP + LEGEND_RESERVED_PX &&
              y <= height - PADDING_BOTTOM
            );
          },
          onPanResponderGrant: handleTouch,
          onPanResponderMove: handleTouch,
          onPanResponderRelease: () => {
            setIsTouching(false);
            setSelectedIndex(null);
          },
          onPanResponderTerminate: () => {
            setIsTouching(false);
            setSelectedIndex(null);
          },
          onPanResponderTerminationRequest: () => false,
        }).panHandlers}
      />
    </View>
  );
};

const XAxisLabels: React.FC<{
  points: PointBar[];
  innerW: number;
  chartHeight: number;
}> = ({ points, innerW, chartHeight }) => {
  const MIN_LABEL_SPACING = 32;
  const maxLabels =
    innerW > 0 ? Math.max(2, Math.floor(innerW / MIN_LABEL_SPACING)) : 4;
  const count = points.length;
  const step = Math.max(1, Math.ceil(count / maxLabels));
  const anchorIdx = count - 1;
  return (
    <>
      {points.map((p, i) => {
        const isLast = i === anchorIdx;
        const show = isLast || (anchorIdx - i) % step === 0;
        if (!show) return null;
        return (
          <SvgText
            key={`xlabel-${i}`}
            x={p.x}
            y={chartHeight - 8}
            fontSize={10}
            fill={colors.neutral[500]}
            textAnchor="middle"
          >
            {p.label}
          </SvgText>
        );
      })}
    </>
  );
};

const YAxisLabels: React.FC<{ height: number; topPad: number }> = ({
  height,
  topPad,
}) => {
  const PADDING_X_LABEL = 4;
  const labels = [
    { min: 0, txt: '00:00' },
    { min: 360, txt: '06:00' },
    { min: 720, txt: '12:00' },
    { min: 1080, txt: '18:00' },
    { min: 1440, txt: '24:00' },
  ];
  const yForMin = (m: number) =>
    topPad + (m / 1440) * Math.max(0, height - topPad - PADDING_BOTTOM);
  return (
    <>
      {labels.map((l, i) => (
        <SvgText
          key={`ylabel-${i}`}
          x={PADDING_X_LABEL}
          y={yForMin(l.min) - 2}
          fontSize={9}
          fill={colors.neutral[400]}
          textAnchor="start"
        >
          {l.txt}
        </SvgText>
      ))}
    </>
  );
};

const styles = StyleSheet.create({
  container: { position: 'relative' },
  legendOverlay: {
    position: 'absolute',
    top: 6,
    right: 6,
    flexDirection: 'row',
    backgroundColor: 'transparent',
  },
  gestureOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
  },
});

const LegendSwatch: React.FC<{ color: string; label: string }> = ({
  color,
  label,
}) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 12 }}>
    <View
      style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: color }}
    />
    <Text style={{ marginLeft: 4, fontSize: 10, color: colors.neutral[600] }}>
      {label}
    </Text>
  </View>
);

// Interaction helpers and selected label
function minutesToHHmm(min: number | null | undefined): string | null {
  if (typeof min !== 'number') return null;
  const h = Math.floor(min / 60);
  const m = Math.floor(min % 60);
  const hh = String(h).padStart(2, '0');
  const mm = String(m).padStart(2, '0');
  return `${hh}:${mm}`;
}

const SelectedValueOnPressLabel: React.FC<{
  point: PointBar;
  chartWidth: number;
  chartHeight: number;
  topPad: number;
}> = ({ point, chartWidth, chartHeight, topPad }) => {
  const LABEL_HEIGHT = 18;
  const bed = minutesToHHmm(point.bedMin as number);
  const wake = minutesToHHmm(point.wakeMin as number);
  const valueStr = bed && wake ? `${bed}–${wake}` : bed || wake || '';
  const estWidth = Math.max(36, valueStr.length * 7 + 8);
  let rectX = point.x - estWidth / 2;
  rectX = Math.max(
    PADDING_X,
    Math.min(
      rectX,
      (chartWidth || 0) - (PADDING_X + EXTRA_RIGHT_PAD) - estWidth
    )
  );
  // Place label mid between bed and wake if both exist; else near available point
  let anchorY: number = topPad + 4;
  if (typeof point.bedMin === 'number' && typeof point.wakeMin === 'number') {
    anchorY =
      topPad +
      ((point.bedMin + point.wakeMin) / 2 / 1440) *
        (chartHeight - topPad - PADDING_BOTTOM);
  } else if (typeof point.bedMin === 'number') {
    anchorY =
      topPad + (point.bedMin / 1440) * (chartHeight - topPad - PADDING_BOTTOM);
  } else if (typeof point.wakeMin === 'number') {
    anchorY =
      topPad + (point.wakeMin / 1440) * (chartHeight - topPad - PADDING_BOTTOM);
  }
  let rectY = anchorY - LABEL_HEIGHT - 6;
  if (rectY < topPad) rectY = anchorY + 6;
  return (
    <>
      <SvgText
        x={rectX + estWidth / 2}
        y={rectY + LABEL_HEIGHT / 2}
        fontSize={12}
        fontWeight="bold"
        fill={colors.neutral[900]}
        textAnchor="middle"
        alignmentBaseline="middle"
      >
        {valueStr}
      </SvgText>
    </>
  );
};

export default SleepTimesTrendChart;
