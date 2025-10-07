import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { CommonActions } from '@react-navigation/native';
import { BarChart3, Home, Settings, Utensils } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { borderRadius, colors, fontSize, shadows, spacing } from '../theme';

const { width: screenWidth } = Dimensions.get('window');
const HORIZONTAL_PADDING = spacing.md;

interface TabConfig {
  name: string;
  icon: React.ComponentType<{ size: number; color: string }>;
  label: string;
}

const tabConfigs: Record<string, TabConfig> = {
  Home: { name: 'Home', icon: Home, label: 'Home' },
  Stats: { name: 'Stats', icon: BarChart3, label: 'Stats' },
  FoodDiary: { name: 'FoodDiary', icon: Utensils, label: 'Food' },
  Settings: { name: 'Settings', icon: Settings, label: 'Settings' },
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

  // Adjust text width array when route count changes
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

  const currentRoute = state.routes[state.index];
  if (currentRoute?.name === 'Alerts') {
    return null;
  }

  const pillWidths = textWidths.map(textWidth =>
    textWidth > 0 ? textWidth + 56 : 60
  );
  const innerWidth = (tabBarWidth ?? screenWidth) - HORIZONTAL_PADDING * 2;

  const visibleRouteIndices = state.routes
    .map((r, i) => ({ r, i }))
    .filter(({ r }) => !!tabConfigs[r.name])
    .map(({ i }) => i);

  const visibleCount = visibleRouteIndices.length || 1;
  const tabWidth = innerWidth / visibleCount;

  const translateXOutputRange: number[] = new Array(routeCount).fill(0);
  const pillWidthsFull: number[] = new Array(routeCount).fill(60);

  visibleRouteIndices.forEach((routeIdx, visIdx) => {
    const w = pillWidths[routeIdx] ?? 60;
    const x = HORIZONTAL_PADDING + visIdx * tabWidth + (tabWidth - w) / 2;
    translateXOutputRange[routeIdx] = x;
    pillWidthsFull[routeIdx] = w;
  });

  for (let i = 0; i < routeCount; i++) {
    if (translateXOutputRange[i] === 0 && !visibleRouteIndices.includes(i)) {
      const prevVisible = [...visibleRouteIndices]
        .filter(idx => idx <= i)
        .pop();
      const fallbackIndex = prevVisible ?? visibleRouteIndices[0] ?? 0;
      translateXOutputRange[i] = translateXOutputRange[fallbackIndex];
      pillWidthsFull[i] = pillWidthsFull[fallbackIndex];
    }
  }

  const routeIndices = state.routes.map((_, i) => i);
  const translateX = animatedValue.interpolate({
    inputRange: routeIndices,
    outputRange: translateXOutputRange,
    extrapolate: 'clamp',
  });

  const pillWidth = animatedValue.interpolate({
    inputRange: routeIndices,
    outputRange: pillWidthsFull,
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.container}>
      {/* Hidden text measurement */}
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

      {/* Tab bar container */}
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
              navigation.dispatch(CommonActions.navigate({ name: route.name }));
            }
          };

          const IconComponent = tabConfig.icon;

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              onPress={onPress}
              style={styles.tab}
              activeOpacity={0.7}
            >
              <View style={styles.tabContent}>
                <IconComponent
                  size={24}
                  color={isFocused ? colors.white : colors.neutral[400]}
                />
                {isFocused && (
                  <Animated.Text style={styles.tabLabel}>
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
    top: -1000,
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
    backgroundColor: colors.primary,
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
