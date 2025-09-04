import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Bell } from 'lucide-react-native';
import { colors } from '../theme';

interface NotificationBellProps {
  onPress?: () => void;
}

const NotificationBell: React.FC<NotificationBellProps> = ({ onPress }) => {
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
      </View>
    </Pressable>
  );
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
