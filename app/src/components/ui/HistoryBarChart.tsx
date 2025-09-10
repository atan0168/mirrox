import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, LayoutChangeEvent } from 'react-native';
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

const PADDING_X = 12;
const PADDING_TOP = 8;
const PADDING_BOTTOM = 26; // space for x labels

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

  const { bars } = useMemo(() => {
    const max = Math.max(1, ...data.map(d => d.value));
    const innerW = Math.max(0, width - PADDING_X * 2);
    const innerH = Math.max(0, height - PADDING_TOP - PADDING_BOTTOM);
    const count = data.length || 1;
    // bar and gap sizing
    const gap = Math.max(4, innerW / (count * 4));
    const barW = Math.max(4, (innerW - gap * (count - 1)) / count);
    let x = PADDING_X;
    const bars = data.map(d => {
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
    return { maxValue: max, bars };
  }, [data, width, height]);

  const onLayout = (e: LayoutChangeEvent) => {
    setWidth(e.nativeEvent.layout.width);
  };

  const zeroState = showZeroState && data.length === 0;

  const handleBarPress = (index: number) => {
    setSelectedIndex(prev => (prev === index ? null : index));
  };

  return (
    <View style={{ height }} onLayout={onLayout}>
      {zeroState ? (
        <View style={styles.zeroState}>
          <Text style={styles.zeroStateText}>No history available</Text>
        </View>
      ) : (
        <Svg width={width} height={height}>
          {/* X axis */}
          <Line
            x1={PADDING_X}
            y1={height - PADDING_BOTTOM + 0.5}
            x2={Math.max(PADDING_X, width - PADDING_X)}
            y2={height - PADDING_BOTTOM + 0.5}
            stroke={axisColor}
            strokeWidth={1}
          />
          {/* Bars */}
          {bars.map((b, i) => (
            <Rect
              key={`bar-${i}`}
              x={b.x}
              y={b.y}
              width={b.width}
              height={b.height}
              fill={barColor}
              rx={4}
              onPress={() => handleBarPress(i)}
            />
          ))}
          {/* Selected value label (smart positioning) */}
          {showValueOnPress &&
            selectedIndex != null &&
            bars[selectedIndex] &&
            (() => {
              const b = bars[selectedIndex];
              const LABEL_HEIGHT = 18;
              const valueStr = String(b.value);
              const estWidth = Math.max(28, valueStr.length * 7 + 8);
              const xCenter = b.x + b.width / 2;
              let rectX = xCenter - estWidth / 2;
              rectX = Math.max(
                PADDING_X,
                Math.min(rectX, (width || 0) - PADDING_X - estWidth)
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
            })()}
          {/* X labels */}
          {bars.map((b, i) => (
            <SvgText
              key={`label-${i}`}
              x={b.x + b.width / 2}
              y={height - 8}
              fontSize={10}
              fill={colors.neutral[500]}
              textAnchor="middle"
            >
              {b.label}
            </SvgText>
          ))}
        </Svg>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  zeroState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zeroStateText: {
    color: colors.neutral[400],
    fontSize: 14,
  },
});

export default HistoryBarChart;
