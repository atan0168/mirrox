import React from 'react';
import { View, Pressable, StyleSheet, Text } from 'react-native';
import { Bell } from 'lucide-react-native';
import { colors } from '../theme';

interface NotificationBellProps {
  onPress?: () => void;
  badgeCount?: number;
}

const NotificationBell: React.FC<NotificationBellProps> = ({ onPress, badgeCount }) => {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={12}
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel="Notifications"
      testID="notification-bell"
    >
      <View style={styles.iconWrapper}>
        <Bell size={22} color={colors.neutral[900]} />
        {typeof badgeCount === 'number' && badgeCount > 0 && (
          <View style={styles.badge}>
            {/* Show 9+ when over 9 */}
            <BellBadgeText count={badgeCount} />
          </View>
        )}
      </View>
    </Pressable>
  );
};

const BellBadgeText = ({ count }: { count: number }) => {
  const text = count > 9 ? '9+' : String(count);
  return <Text style={styles.badgeText}>{text}</Text>;
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  pressed: {
    opacity: 0.6,
  },
  iconWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 3,
    backgroundColor: colors.red[600],
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.white,
  },
  badgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 12,
  },
});

export default NotificationBell;
