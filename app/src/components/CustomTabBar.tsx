import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Home, BarChart3, Settings } from 'lucide-react-native';
import { colors, spacing, borderRadius, fontSize, shadows } from '../theme';

const { width: screenWidth } = Dimensions.get('window');
// Measure actual tab bar width (inside horizontal padding) for accurate centering.
const HORIZONTAL_PADDING = spacing.md; // matches styles.tabBar paddingHorizontal

interface TabConfig {
  name: string;
  icon: React.ComponentType<{ size: number; color: string }>;
  label: string;
}

const tabConfigs: Record<string, TabConfig> = {
  Home: {
    name: 'Home',
    icon: Home,
    label: 'Home',
  },
  Stats: {
    name: 'Stats',
    icon: BarChart3,
    label: 'Stats',
  },
  Settings: {
    name: 'Settings',
    icon: Settings,
    label: 'Settings',
  },
};

const CustomTabBar: React.FC<BottomTabBarProps> = ({
  state,
  descriptors,
  navigation,
}) => {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const routeCount = state.routes.length;
  const [textWidths, setTextWidths] = useState<number[]>(
    Array(routeCount).fill(0)
  );
  const [tabBarWidth, setTabBarWidth] = useState<number | null>(null);

  // Ensure textWidths array length matches route count (in case of dynamic tabs)
  useEffect(() => {
    setTextWidths(prev => {
      if (prev.length === routeCount) return prev;
      const next = Array(routeCount).fill(0);
      prev.forEach((w, i) => {
        if (i < next.length) next[i] = w;
      });
      return next;
    });
  }, [routeCount]);

  useEffect(() => {
    Animated.spring(animatedValue, {
      toValue: state.index,
      useNativeDriver: false,
      tension: 100,
      friction: 50,
    }).start();
  }, [state.index, animatedValue]);

  // Calculate pill widths based on text measurements
  const pillWidths = textWidths.map(textWidth =>
    textWidth > 0 ? textWidth + 56 : 60
  );

  const innerWidth = (tabBarWidth ?? screenWidth) - HORIZONTAL_PADDING * 2;
  const tabWidth = innerWidth / routeCount;

  // Compute centered X for each tab within innerWidth, offset by horizontal padding.
  const translateXOutputRange = pillWidths.map(
    (w, i) => HORIZONTAL_PADDING + i * tabWidth + (tabWidth - w) / 2
  );

  const translateX = animatedValue.interpolate({
    inputRange: state.routes.map((_, i) => i),
    outputRange: translateXOutputRange,
    extrapolate: 'clamp',
  });

  const pillWidth = animatedValue.interpolate({
    inputRange: [0, 1, 2],
    outputRange: pillWidths,
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.container}>
      {/* Hidden text elements for measuring */}
      <View style={styles.hiddenMeasureContainer}>
        {state.routes.map((route, index) => {
          const tabConfig = tabConfigs[route.name];
          if (!tabConfig) return null;
          return (
            <Text
              key={`measure-${route.key}`}
              style={styles.measureText}
              onLayout={event => {
                const { width } = event.nativeEvent.layout;
                setTextWidths(prev => {
                  const newWidths = [...prev];
                  newWidths[index] = width;
                  return newWidths;
                });
              }}
            >
              {tabConfig.label}
            </Text>
          );
        })}
      </View>

      <View
        style={styles.tabBar}
        onLayout={e => {
          const { width } = e.nativeEvent.layout;
          if (width !== tabBarWidth) setTabBarWidth(width);
        }}
      >
        {/* Animated pill background */}
        <Animated.View
          style={[
            styles.pill,
            {
              transform: [{ translateX }],
              width: pillWidth,
            },
          ]}
        />

        {/* Tab buttons */}
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;
          const tabConfig = tabConfigs[route.name];

          if (!tabConfig) return null;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          const IconComponent = tabConfig.icon;

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              testID={`tab-${route.name.toLowerCase()}`}
              onPress={onPress}
              onLongPress={onLongPress}
              style={styles.tab}
              activeOpacity={0.7}
            >
              <View style={styles.tabContent}>
                <IconComponent
                  size={24}
                  color={isFocused ? colors.white : colors.neutral[400]}
                />
                {isFocused && (
                  <Animated.Text
                    style={[
                      styles.tabLabel,
                      {
                        opacity: animatedValue.interpolate({
                          inputRange: [index - 0.5, index, index + 0.5],
                          outputRange: [0, 1, 0],
                          extrapolate: 'clamp',
                        }),
                      },
                    ]}
                  >
                    {tabConfig.label}
                  </Animated.Text>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    paddingBottom: spacing.lg,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  hiddenMeasureContainer: {
    position: 'absolute',
    opacity: 0,
    pointerEvents: 'none',
    top: -1000, // Move far off screen
  },
  measureText: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: 'transparent',
  },
  tabBar: {
    flexDirection: 'row',
    height: 56,
    position: 'relative',
    paddingHorizontal: HORIZONTAL_PADDING,
  },
  pill: {
    position: 'absolute',
    height: 40,
    backgroundColor: colors.primary, // Dark neutral color
    borderRadius: borderRadius.full,
    top: 8,
    ...shadows.medium,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    zIndex: 1,
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    height: 40,
  },
  tabLabel: {
    color: colors.white,
    fontSize: fontSize.base,
    fontWeight: '600',
    marginLeft: spacing.sm,
  },
});

export default CustomTabBar;
