import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Home, BarChart3, Settings } from 'lucide-react-native';

const { width: screenWidth } = Dimensions.get('window');
const TAB_WIDTH = screenWidth / 3;

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
  const animatedValue = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.spring(animatedValue, {
      toValue: state.index,
      useNativeDriver: false,
      tension: 100,
      friction: 8,
    }).start();
  }, [state.index, animatedValue]);

  const translateX = animatedValue.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [
      (TAB_WIDTH - 80) / 2, // Center Home pill
      TAB_WIDTH + (TAB_WIDTH - 90) / 2, // Center Stats pill
      TAB_WIDTH * 2 + (TAB_WIDTH - 110) / 2, // Center Settings pill
    ],
    extrapolate: 'clamp',
  });

  const pillWidth = animatedValue.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [
      80, // Home pill width (icon + text)
      90, // Stats pill width (icon + text)
      110, // Settings pill width (icon + text)
    ],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
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
              testID={options.tabBarTestID}
              onPress={onPress}
              onLongPress={onLongPress}
              style={styles.tab}
              activeOpacity={0.7}
            >
              <View style={styles.tabContent}>
                <IconComponent
                  size={24}
                  color={isFocused ? '#FFFFFF' : '#9CA3AF'}
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
    backgroundColor: '#FFFFFF',
    paddingBottom: 34, // Safe area padding for iPhone
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  tabBar: {
    flexDirection: 'row',
    height: 56,
    position: 'relative',
    paddingHorizontal: 16,
  },
  pill: {
    position: 'absolute',
    height: 40,
    backgroundColor: '#374151', // Dark neutral color
    borderRadius: 20,
    top: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
    paddingHorizontal: 12,
    height: 40,
  },
  tabLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default CustomTabBar;
