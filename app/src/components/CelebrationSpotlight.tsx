import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  GestureResponderEvent,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import { Button } from './ui';
import { colors, spacing, borderRadius, fontSize } from '../theme';
import { BADGE_DEFS, type BadgeId } from '../constants/badges';

type Props = {
  badgeId: BadgeId | null;
  visible: boolean;
  onClose: () => void;
};

const SCREEN = Dimensions.get('window');

export function CelebrationSpotlight({ badgeId, visible, onClose }: Props) {
  const confettiRef = useRef<ConfettiCannon>(null);
  const fade = useRef(new Animated.Value(0)).current;
  const translate = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    confettiRef.current?.start();
  }, []);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(translate, {
        toValue: 0,
        damping: 14,
        stiffness: 160,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fade, translate]);

  if (!badgeId) return null;

  const badge = BADGE_DEFS[badgeId];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: fade }]} />
        <Pressable style={styles.overlay} onPress={onClose}>
          <Pressable
            style={styles.cardWrapper}
            onPress={(event: GestureResponderEvent) => event.stopPropagation()}
          >
            <Animated.View
              style={[
                styles.card,
                {
                  opacity: fade,
                  transform: [{ translateY: translate }],
                },
              ]}
            >
              <Text style={styles.eyebrow}>Streak Unlocked</Text>
              <Text style={styles.title}>
                {badge.icon} {badge.title}
              </Text>
              <Text style={styles.desc}>{badge.desc}</Text>
              <Text style={styles.encouragement}>{badge.encouragement}</Text>
              <Button
                onPress={onClose}
                variant="secondary"
                fullWidth
                style={styles.button}
              >
                Keep it up! ✨
              </Button>
            </Animated.View>
          </Pressable>
        </Pressable>
        <ConfettiCannon
          ref={confettiRef}
          count={180}
          origin={{ x: SCREEN.width / 2, y: 0 }}
          fadeOut
          autoStart={false}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  card: {
    width: SCREEN.width,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg + spacing.sm,
    backgroundColor: colors.white,
    alignItems: 'flex-start',
  },
  eyebrow: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.primary[500],
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  title: {
    marginTop: spacing.xs,
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.neutral[900],
  },
  cardWrapper: {
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  desc: {
    marginTop: spacing.sm,
    fontSize: fontSize.base,
    color: colors.neutral[700],
  },
  encouragement: {
    marginTop: spacing.md,
    fontSize: fontSize.base,
    color: colors.neutral[800],
    fontWeight: '500',
  },
  button: {
    marginTop: spacing.lg,
    alignSelf: 'stretch',
  },
});
