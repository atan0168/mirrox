import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  LayoutChangeEvent,
  Text,
  PanResponder,
  Animated,
  GestureResponderEvent,
} from 'react-native';
import Svg, { Rect, Text as SvgText, Line } from 'react-native-svg';
import { colors } from '../../theme';

export interface SleepStackDatum {
  label: string; // X-axis label like MM/dd
  totalMinutes: number; // Total sleep minutes for the night
  lightMinutes?: number | null;
  remMinutes?: number | null;
  deepMinutes?: number | null;
}

export interface SleepStackedBarChartProps {
  data: SleepStackDatum[];
  height?: number;
  axisColor?: string;
  // Optional custom colors
  colorLight?: string;
  colorREM?: string;
  colorDeep?: string;
  colorFallback?: string; // when no breakdown is available
  showValueOnPress?: boolean;
}

interface ChartBarStack {
  x: number;
  y: number; // top of bar
  width: number;
  height: number; // total height
  segments: Array<{ h: number; fill: string }>;
  label: string;
  totalMinutes: number;
}

const PADDING_X = 12;
const PADDING_TOP = 8;
const LEGEND_RESERVED_PX = 24; // extra headroom so legend won't overlap
const PADDING_BOTTOM = 26;
const EXTRA_RIGHT_PAD = 12;

const SleepStackedBarChart: React.FC<SleepStackedBarChartProps> = ({
  data,
  height = 180,
  axisColor = colors.neutral[300],
  colorLight = colors.sky[400],
  colorREM = colors.teal[500],
  colorDeep = colors.green[600],
  colorFallback = colors.sky[600],
  showValueOnPress = true,
}) => {
  const [width, setWidth] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isTouching, setIsTouching] = useState(false);
  const dimAnim = useRef(new Animated.Value(0)).current;
  const [dimT, setDimT] = useState(0);

  const { bars, innerW, hasFallback, topPad } = useMemo(() => {
    const totals = data.map(d => Math.max(0, d.totalMinutes));
    const maxTotal = Math.max(1, ...totals);
    const innerW = Math.max(
      0,
      width - PADDING_X - (PADDING_X + EXTRA_RIGHT_PAD)
    );
    const topPad = PADDING_TOP + LEGEND_RESERVED_PX;
    const innerH = Math.max(0, height - topPad - PADDING_BOTTOM);
    const count = Math.max(1, data.length);
    const minGap = count > 20 ? 2 : 4;
    const gap = Math.max(minGap, innerW / (count * 4));
    const barW = Math.max(6, (innerW - gap * (count - 1)) / count);
    let x = PADDING_X;
    let fallbackDetected = false;
    const bars: ChartBarStack[] = data.map(d => {
      const total = Math.max(0, d.totalMinutes);
      const totalH = Math.round((total / maxTotal) * innerH);
      const y = topPad + (innerH - totalH);
      const segs: Array<{ h: number; fill: string }> = [];
      const light = Math.max(0, d.lightMinutes ?? 0);
      const rem = Math.max(0, d.remMinutes ?? 0);
      const deep = Math.max(0, d.deepMinutes ?? 0);
      const hasBreakdown = light + rem + deep > 0;
      if (hasBreakdown) {
        const toH = (m: number) => Math.round((m / maxTotal) * innerH);
        if (light > 0) segs.push({ h: toH(light), fill: colorLight });
        if (rem > 0) segs.push({ h: toH(rem), fill: colorREM });
        if (deep > 0) segs.push({ h: toH(deep), fill: colorDeep });
        // If breakdown total < total, add remainder as fallback segment
        const remainder = Math.max(0, total - (light + rem + deep));
        if (remainder > 0) {
          segs.push({ h: toH(remainder), fill: colorFallback });
          fallbackDetected = true;
        }
      } else {
        segs.push({ h: totalH, fill: colorFallback });
        if (totalH > 0) fallbackDetected = true;
      }
      const thisX = x;
      x += barW + gap;
      return {
        x: thisX,
        y,
        width: barW,
        height: totalH,
        segments: segs,
        label: d.label,
        totalMinutes: total,
      };
    });
    return { bars, innerW, hasFallback: fallbackDetected, topPad, innerH };
  }, [data, width, height, colorLight, colorREM, colorDeep, colorFallback]);

  const onLayout = (e: LayoutChangeEvent) =>
    setWidth(e.nativeEvent.layout.width);

  // Interaction helpers
  const pickIndexFromX = (px: number) => {
    if (!bars.length) return null;
    const clampedX = Math.max(PADDING_X, Math.min(px, PADDING_X + innerW));
    let closestIdx = 0;
    let closestDist = Number.POSITIVE_INFINITY;
    for (let i = 0; i < bars.length; i++) {
      const b = bars[i];
      const center = b.x + b.width / 2;
      const d = Math.abs(center - clampedX);
      if (d < closestDist) {
        closestDist = d;
        closestIdx = i;
      }
    }
    return closestIdx;
  };

  const handleTouch = (evt: GestureResponderEvent) => {
    const { locationX, locationY } = evt.nativeEvent;
    if (
      locationY >= PADDING_TOP + LEGEND_RESERVED_PX &&
      locationY <= height - PADDING_BOTTOM
    ) {
      const idx = pickIndexFromX(locationX);
      if (idx != null) setSelectedIndex(idx);
      setIsTouching(true);
    }
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
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
        onPanResponderTerminationRequest: () => false,
        onPanResponderRelease: () => {
          setIsTouching(false);
          setSelectedIndex(null);
        },
        onPanResponderTerminate: () => {
          setIsTouching(false);
          setSelectedIndex(null);
        },
      }),
    [bars, innerW, height]
  );

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
        {/* X axis */}
        <Line
          x1={PADDING_X}
          y1={height - PADDING_BOTTOM + 0.5}
          x2={Math.max(PADDING_X, width - (PADDING_X + EXTRA_RIGHT_PAD))}
          y2={height - PADDING_BOTTOM + 0.5}
          stroke={axisColor}
          strokeWidth={1}
        />
        {/* Bars */}
        {bars.map((b, i) => {
          let yCursor = b.y + b.height; // start from bottom
          const isDimmed =
            isTouching && selectedIndex != null && selectedIndex !== i;
          const barOpacity: number = isDimmed ? 1 - 0.65 * dimT : 1; // 1 -> 0.35
          return (
            <React.Fragment key={`stack-${i}`}>
              {b.segments.map((seg, j) => {
                const h = seg.h;
                const yTop = yCursor - h;
                yCursor = yTop;
                return (
                  <Rect
                    key={`seg-${i}-${j}`}
                    x={b.x}
                    y={yTop}
                    width={b.width}
                    height={h}
                    rx={4}
                    fill={seg.fill}
                    opacity={barOpacity}
                  />
                );
              })}
              {/* Invisible wider tap zone */}
              <Rect
                x={b.x}
                y={topPad}
                width={Math.max(24, b.width)}
                height={height - topPad - PADDING_BOTTOM}
                fill={colorFallback}
                opacity={0.01}
              />
            </React.Fragment>
          );
        })}
        {/* Selected overlay */}
        {isTouching && selectedIndex != null && bars[selectedIndex] && (
          <SelectedBarOverlay bar={bars[selectedIndex]} dimT={dimT} />
        )}
        {/* Selected value label */}
        {showValueOnPress &&
          isTouching &&
          selectedIndex != null &&
          bars[selectedIndex] && (
            <SelectedValueOnPressLabel
              bar={bars[selectedIndex]}
              chartWidth={width}
              topPad={topPad}
            />
          )}
        {/* X labels */}
        <XAxisLabels bars={bars} innerW={innerW} chartHeight={height} />
      </Svg>
      {/* Legend (top-right overlay) */}
      <View style={styles.legendOverlay} pointerEvents="none">
        <LegendSwatch color={colorDeep} label="Deep" />
        <LegendSwatch color={colorREM} label="REM" />
        <LegendSwatch color={colorLight} label="Light" />
        {hasFallback && <LegendSwatch color={colorFallback} label="Total" />}
      </View>
      {/* Gesture overlay to enable press-and-drag */}
      <View style={styles.gestureOverlay} {...panResponder.panHandlers} />
    </View>
  );
};

const LegendSwatch: React.FC<{ color: string; label: string }> = ({
  color,
  label,
}) => (
  <View style={styles.legendItem}>
    <View style={[styles.swatch, { backgroundColor: color }]} />
    <View style={{ width: 4 }} />
    <Text style={{ fontSize: 10, color: colors.neutral[600] }}>{label}</Text>
  </View>
);

const XAxisLabels: React.FC<{
  bars: ChartBarStack[];
  innerW: number;
  chartHeight: number;
}> = ({ bars, innerW, chartHeight }) => {
  const MIN_LABEL_SPACING = 32;
  const maxLabels =
    innerW > 0 ? Math.max(2, Math.floor(innerW / MIN_LABEL_SPACING)) : 4;
  const count = bars.length;
  const step = Math.max(1, Math.ceil(count / maxLabels));
  const anchorIdx = count - 1;
  return (
    <>
      {bars.map((b, i) => {
        const isLast = i === anchorIdx;
        const show = isLast || (anchorIdx - i) % step === 0;
        if (!show) return null;
        const xCenter = b.x + b.width / 2;
        return (
          <SvgText
            key={`label-${i}`}
            x={xCenter}
            y={chartHeight - 8}
            fontSize={10}
            fill={colors.neutral[500]}
            textAnchor="middle"
          >
            {b.label}
          </SvgText>
        );
      })}
    </>
  );
};

const SelectedBarOverlay: React.FC<{ bar: ChartBarStack; dimT: number }> = ({
  bar,
  dimT,
}) => {
  return (
    <>
      <Rect
        x={bar.x}
        y={bar.y}
        width={bar.width}
        height={bar.height}
        fill={'white'}
        opacity={0.18 * dimT}
        rx={4}
      />
      <Rect
        x={bar.x}
        y={bar.y}
        width={bar.width}
        height={bar.height}
        fill={'transparent'}
        stroke={'white'}
        strokeOpacity={0.5 * dimT}
        strokeWidth={1.5}
        rx={4}
      />
    </>
  );
};

const SelectedValueOnPressLabel: React.FC<{
  bar: ChartBarStack;
  chartWidth: number;
  topPad: number;
}> = ({ bar, chartWidth, topPad }) => {
  const LABEL_HEIGHT = 18;
  const hours = Math.round((bar.totalMinutes / 60) * 10) / 10;
  const valueStr = `${hours}h`;
  const estWidth = Math.max(28, valueStr.length * 7 + 8);
  const xCenter = bar.x + bar.width / 2;
  let rectX = xCenter - estWidth / 2;
  rectX = Math.max(
    PADDING_X,
    Math.min(
      rectX,
      (chartWidth || 0) - (PADDING_X + EXTRA_RIGHT_PAD) - estWidth
    )
  );
  let rectY = bar.y - LABEL_HEIGHT - 6;
  if (rectY < topPad) {
    rectY = bar.y + 6;
  }
  const textFill = colors.neutral[900];
  return (
    <>
      <SvgText
        x={rectX + estWidth / 2}
        y={rectY + LABEL_HEIGHT / 2}
        fontSize={12}
        fontWeight="bold"
        fill={textFill}
        textAnchor="middle"
        alignmentBaseline="middle"
      >
        {valueStr}
      </SvgText>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  legendRow: {
    flexDirection: 'row',
    alignSelf: 'flex-end',
    marginTop: 8,
  },
  legendOverlay: {
    position: 'absolute',
    top: 6,
    right: 6,
    flexDirection: 'row',
    backgroundColor: 'transparent',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  swatch: {
    width: 10,
    height: 10,
    borderRadius: 2,
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

export default SleepStackedBarChart;
