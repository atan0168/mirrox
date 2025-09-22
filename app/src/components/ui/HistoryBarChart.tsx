import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  LayoutChangeEvent,
  PanResponder,
  GestureResponderEvent,
  Animated,
} from 'react-native';
import Svg, { Rect, Text as SvgText, Line } from 'react-native-svg';
import { colors } from '../../theme';

export interface HistoryBarChartDatum {
  label: string;
  value: number;
}

export interface HistoryBarChartProps {
  data: HistoryBarChartDatum[];
  height?: number;
  barColor?: string;
  axisColor?: string;
  showZeroState?: boolean;
  showValueOnPress?: boolean;
}

// Internal bar representation for rendering
interface ChartBar {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  value: number;
}

const PADDING_X = 12;
const PADDING_TOP = 8;
const PADDING_BOTTOM = 26; // space for x labels
const MIN_LABEL_SPACING = 32; // px reserved per visible label
const MIN_TAP_WIDTH = 24; // minimum interactive width for taps
const EXTRA_RIGHT_PAD = 12; // extra right padding to avoid clipping last label/value

const HistoryBarChart: React.FC<HistoryBarChartProps> = ({
  data,
  height = 160,
  barColor = colors.green[500],
  axisColor = colors.neutral[300],
  showZeroState = true,
  showValueOnPress = true,
}) => {
  const [width, setWidth] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isTouching, setIsTouching] = useState(false);
  const dimAnim = useRef(new Animated.Value(0)).current;
  const [dimT, setDimT] = useState(0); // 0..1 progress for dim animation

  const { bars, gap, innerW, count } = useMemo(() => {
    const max = Math.max(1, ...data.map(d => d.value));
    const PADDING_RIGHT = PADDING_X + EXTRA_RIGHT_PAD;
    const innerW = Math.max(0, width - PADDING_X - PADDING_RIGHT);
    const innerH = Math.max(0, height - PADDING_TOP - PADDING_BOTTOM);
    const count = data.length || 1;
    // bar and gap sizing (slightly tighter gaps when many bars)
    const minGap = count > 20 ? 2 : 4;
    const gap = Math.max(minGap, innerW / (count * 4));
    const barW = Math.max(4, (innerW - gap * (count - 1)) / count);
    let x = PADDING_X;
    const bars: ChartBar[] = data.map(d => {
      const h = max === 0 ? 0 : Math.round((d.value / max) * innerH);
      const y = PADDING_TOP + (innerH - h);
      const thisX = x;
      x += barW + gap;
      return {
        x: thisX,
        y,
        width: barW,
        height: h,
        label: d.label,
        value: d.value,
      };
    });
    return { maxValue: max, bars, gap, innerW, count };
  }, [data, width, height]);

  const onLayout = (e: LayoutChangeEvent) => {
    setWidth(e.nativeEvent.layout.width);
  };

  const zeroState = showZeroState && data.length === 0;

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
    // Limit interaction to the plot area vertically
    if (locationY >= PADDING_TOP && locationY <= height - PADDING_BOTTOM) {
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
          return y >= PADDING_TOP && y <= height - PADDING_BOTTOM;
        },
        onStartShouldSetPanResponderCapture: e => {
          const y = e.nativeEvent.locationY;
          return y >= PADDING_TOP && y <= height - PADDING_BOTTOM;
        },
        onMoveShouldSetPanResponder: (e, gesture) => {
          const y = e.nativeEvent.locationY;
          return (
            (Math.abs(gesture.dx) > 2 || Math.abs(gesture.dy) > 2) &&
            y >= PADDING_TOP &&
            y <= height - PADDING_BOTTOM
          );
        },
        onMoveShouldSetPanResponderCapture: (e, gesture) => {
          const y = e.nativeEvent.locationY;
          return (
            (Math.abs(gesture.dx) > 1 || Math.abs(gesture.dy) > 1) &&
            y >= PADDING_TOP &&
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

  // Keep a numeric copy of the animated value for SVG props
  useEffect(() => {
    const id = dimAnim.addListener(({ value }) => {
      setDimT(typeof value === 'number' ? value : 0);
    });
    return () => {
      dimAnim.removeListener(id);
    };
  }, [dimAnim]);

  return (
    <View style={[styles.container, { height }]} onLayout={onLayout}>
      {zeroState ? (
        <View style={styles.zeroState}>
          <Text style={styles.zeroStateText}>No history available</Text>
        </View>
      ) : (
        <>
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
            {/* Bars + larger invisible tap areas for better hit targets */}
            <BarsWithTapZones
              bars={bars}
              gap={gap}
              height={height}
              innerW={innerW}
              barColor={barColor}
              isTouching={isTouching}
              selectedIndex={selectedIndex}
              dimT={dimT}
            />
            {/* Highlight selected bar with a subtle bright overlay and outline */}
            <SelectedBarOverlay
              bars={bars}
              selectedIndex={isTouching ? selectedIndex : null}
              dimT={dimT}
            />
            {/* Selected value label (smart positioning) */}
            <SelectedValueOnPressLabel
              show={showValueOnPress && isTouching}
              bars={bars}
              selectedIndex={selectedIndex}
              chartWidth={width}
              chartHeight={height}
            />
            {/* X labels (auto-skip from latest to avoid crowding and edge clipping) */}
            <XAxisLabels
              bars={bars}
              innerW={innerW}
              count={count}
              chartHeight={height}
            />
          </Svg>
          {/* Gesture overlay to enable press-and-drag value preview */}
          <View style={styles.gestureOverlay} {...panResponder.panHandlers} />
        </>
      )}
    </View>
  );
};

// Subcomponents

const BarsWithTapZones: React.FC<{
  bars: ChartBar[];
  gap: number;
  height: number;
  innerW: number;
  barColor: string;
  isTouching: boolean;
  selectedIndex: number | null;
  dimT: number;
}> = ({
  bars,
  gap,
  height,
  innerW,
  barColor,
  isTouching,
  selectedIndex,
  dimT,
}) => {
  return (
    <>
      {bars.map((b, i) => {
        const center = b.x + b.width / 2;
        const tapWidth = Math.max(MIN_TAP_WIDTH, b.width + gap);
        let tapX = center - tapWidth / 2;
        tapX = Math.max(
          PADDING_X,
          Math.min(tapX, PADDING_X + innerW - tapWidth)
        );
        const isDimmed =
          isTouching && selectedIndex != null && selectedIndex !== i;
        const barOpacity: number = isDimmed ? 1 - 0.65 * dimT : 1; // 1 -> 0.35
        return (
          <React.Fragment key={`wrap-${i}`}>
            <Rect
              x={b.x}
              y={b.y}
              width={b.width}
              height={b.height}
              fill={barColor}
              rx={4}
              opacity={barOpacity}
            />
            {/* Invisible wider tap zone to improve clickability */}
            <Rect
              x={tapX}
              y={PADDING_TOP}
              width={tapWidth}
              height={height - PADDING_TOP - PADDING_BOTTOM}
              fill={barColor}
              opacity={0.01}
            />
          </React.Fragment>
        );
      })}
    </>
  );
};

const SelectedBarOverlay: React.FC<{
  bars: ChartBar[];
  selectedIndex: number | null;
  dimT: number;
}> = ({ bars, selectedIndex, dimT }) => {
  if (selectedIndex == null || !bars[selectedIndex]) return null;
  const b = bars[selectedIndex];
  return (
    <>
      <Rect
        x={b.x}
        y={b.y}
        width={b.width}
        height={b.height}
        fill={'white'}
        opacity={0.18 * dimT}
        rx={4}
      />
      <Rect
        x={b.x}
        y={b.y}
        width={b.width}
        height={b.height}
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
  show: boolean;
  bars: ChartBar[];
  selectedIndex: number | null;
  chartWidth: number;
  chartHeight: number;
}> = ({ show, bars, selectedIndex, chartWidth }) => {
  if (!show || selectedIndex == null || !bars[selectedIndex]) return null;
  const b = bars[selectedIndex];
  const LABEL_HEIGHT = 18;
  const valueStr = String(b.value);
  const estWidth = Math.max(28, valueStr.length * 7 + 8);
  const xCenter = b.x + b.width / 2;
  let rectX = xCenter - estWidth / 2;
  rectX = Math.max(
    PADDING_X,
    Math.min(
      rectX,
      (chartWidth || 0) - (PADDING_X + EXTRA_RIGHT_PAD) - estWidth
    )
  );
  let rectY = b.y - LABEL_HEIGHT - 6; // try above bar
  if (rectY < PADDING_TOP) {
    rectY = b.y + 6; // place inside/just below top of bar
  }
  const textFill = colors.neutral[900];
  const rectFill = 'transparent';
  const rectStroke = 'transparent';
  return (
    <>
      <Rect
        x={rectX}
        y={rectY}
        width={estWidth}
        height={LABEL_HEIGHT}
        rx={8}
        fill={rectFill}
        stroke={rectStroke}
      />
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

const XAxisLabels: React.FC<{
  bars: ChartBar[];
  innerW: number;
  count: number;
  chartHeight: number;
}> = ({ bars, innerW, count, chartHeight }) => {
  const maxLabels =
    innerW > 0 ? Math.max(2, Math.floor(innerW / MIN_LABEL_SPACING)) : 4;
  const step = Math.max(1, Math.ceil(count / maxLabels));
  const anchorIdx = count - 1; // Anchor from the latest (rightmost) index
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

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  zeroState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zeroStateText: {
    color: colors.neutral[400],
    fontSize: 14,
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

export default HistoryBarChart;
