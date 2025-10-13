import React from 'react';
import { View, Text, StyleSheet, ViewProps } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, {
  Polygon,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
} from 'react-native-svg';
import type { LucideIcon } from 'lucide-react-native';
import { Sparkles, Wind, Flower2, Sun, Bird } from 'lucide-react-native';

import { RewardTag } from '../../models/quest';
import { colors, spacing, borderRadius, fontSize, shadows } from '../../theme';

type QuestCardProps = ViewProps & {
  title: string;
  description?: string;
  rewardTag: RewardTag;
  badgeLabel?: string;
  progressPercent: number;
  progressLabel?: string;
  statusLabel?: string;
  completed?: boolean;
  accentColorOverride?: string;
  children?: React.ReactNode;
};

type RewardVisual = {
  accent: string;
  Icon: LucideIcon;
};

const rewardVisualMap: Record<RewardTag, RewardVisual> = {
  skin: { accent: colors.orange[400], Icon: Sparkles },
  lung: { accent: colors.teal[500], Icon: Wind },
  stress: { accent: colors.green[500], Icon: Flower2 },
  calm: { accent: colors.sky[500], Icon: Bird },
  happiness: { accent: colors.yellow[500], Icon: Sun },
};

const HEX_SIZE = 76;
const HEX_HEIGHT = (Math.sqrt(3) / 2) * HEX_SIZE;

export const QuestCard: React.FC<QuestCardProps> = ({
  title,
  description,
  rewardTag,
  badgeLabel = 'Daily Quest',
  progressPercent,
  progressLabel,
  statusLabel,
  completed = false,
  accentColorOverride,
  children,
  style,
  ...viewProps
}) => {
  const visual = rewardVisualMap[rewardTag] ?? rewardVisualMap.skin;
  const accent = accentColorOverride ?? visual.accent;
  const Icon = visual.Icon;

  const clampedPercent = Number.isFinite(progressPercent)
    ? Math.max(0, Math.min(100, progressPercent))
    : 0;

  const gradientColors = [
    shadeHex(accent, -120),
    shadeHex(accent, -40),
  ] as const;

  const progressTrackColor = withOpacity(colors.white, 0.15);
  const progressFillColor = completed ? colors.green[400] : accent;
  const borderTint = withOpacity(accent, completed ? 0.4 : 0.75);
  const badgeBackground = withOpacity(accent, 0.18);
  const badgeTextColor = shadeHex(accent, completed ? -40 : 0);
  const statusTextColor = completed
    ? colors.green[200]
    : withOpacity(colors.white, 0.85);
  const containerOverlay = completed
    ? withOpacity(colors.neutral[900], 0.35)
    : withOpacity(colors.neutral[900], 0.15);

  return (
    <View style={[styles.wrapper, style]} {...viewProps}>
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={styles.gradient}
      />
      <View
        style={[
          styles.inner,
          {
            borderColor: borderTint,
            backgroundColor: containerOverlay,
          },
        ]}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <View
              style={[
                styles.badge,
                {
                  backgroundColor: badgeBackground,
                  borderColor: withOpacity(accent, 0.3),
                },
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  {
                    color: badgeTextColor,
                  },
                ]}
              >
                {badgeLabel}
              </Text>
            </View>

            <Text style={styles.title}>{title}</Text>

            {!!description && (
              <Text style={styles.description}>{description}</Text>
            )}
          </View>

          <HexagonBadge
            accentColor={accent}
            Icon={Icon}
            completed={completed}
          />
        </View>

        <View style={styles.progressSection}>
          <View
            style={[
              styles.progressTrack,
              {
                backgroundColor: progressTrackColor,
              },
            ]}
          >
            <View
              style={[
                styles.progressFill,
                {
                  width: `${clampedPercent}%`,
                  backgroundColor: progressFillColor,
                },
              ]}
            />
          </View>

          <View style={styles.metaRow}>
            {!!progressLabel && (
              <Text style={styles.metaText}>{progressLabel}</Text>
            )}
            {!!(statusLabel || completed) && (
              <View
                style={[
                  styles.statusPill,
                  {
                    backgroundColor: withOpacity(
                      accent,
                      completed ? 0.15 : 0.25
                    ),
                  },
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    {
                      color: statusTextColor,
                    },
                  ]}
                >
                  {statusLabel ?? 'Completed'}
                </Text>
              </View>
            )}
          </View>
        </View>

        {!!children && <View style={styles.childrenContainer}>{children}</View>}
      </View>
    </View>
  );
};

type HexagonBadgeProps = {
  accentColor: string;
  Icon: LucideIcon;
  completed?: boolean;
};

const HexagonBadge: React.FC<HexagonBadgeProps> = ({
  accentColor,
  Icon,
  completed,
}) => {
  const darker = shadeHex(accentColor, -40);
  const lighter = shadeHex(accentColor, 40);
  const stroke = withOpacity(accentColor, completed ? 0.45 : 0.9);

  return (
    <View style={styles.hexWrapper}>
      <Svg width={HEX_SIZE} height={HEX_HEIGHT}>
        <Defs>
          <SvgLinearGradient id="quest-card-hex" x1="0" y1="0" x2="1" y2="1">
            <Stop
              offset="0%"
              stopColor={lighter}
              stopOpacity={completed ? 0.45 : 0.95}
            />
            <Stop
              offset="100%"
              stopColor={darker}
              stopOpacity={completed ? 0.6 : 1}
            />
          </SvgLinearGradient>
        </Defs>

        <Polygon
          points={getHexagonPoints(HEX_SIZE, HEX_HEIGHT)}
          fill="url(#quest-card-hex)"
          stroke={stroke}
          strokeWidth={2}
        />
      </Svg>

      <View style={styles.hexIconContainer} pointerEvents="none">
        <Icon size={28} color={colors.white} />
      </View>
    </View>
  );
};

const getHexagonPoints = (width: number, height: number) => {
  const radius = width / 2;
  const centerX = radius;
  const centerY = height / 2;

  const angles = [0, 60, 120, 180, 240, 300];
  const points = angles.map(angle => {
    const radians = (Math.PI / 180) * angle;
    const x = centerX + radius * Math.cos(radians);
    const y = centerY + radius * Math.sin(radians);
    return `${x},${y}`;
  });

  return points.join(' ');
};

const clampColorChannel = (value: number) => Math.max(0, Math.min(255, value));

const hexToRgb = (hex: string): [number, number, number] | null => {
  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) {
    return null;
  }

  const value = parseInt(normalized, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;

  return [r, g, b];
};

const shadeHex = (hex: string, amount: number) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  const [r, g, b] = rgb;
  const nextR = clampColorChannel(r + amount);
  const nextG = clampColorChannel(g + amount);
  const nextB = clampColorChannel(b + amount);

  const result = (1 << 24) + (nextR << 16) + (nextG << 8) + nextB;
  return `#${result.toString(16).slice(1)}`;
};

const withOpacity = (hex: string, alpha: number) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const [r, g, b] = rgb;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    ...shadows.medium,
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  inner: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    padding: spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  headerText: {
    flex: 1,
    gap: spacing.sm,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.white,
  },
  description: {
    color: withOpacity(colors.white, 0.75),
    fontSize: fontSize.base,
    lineHeight: 20,
  },
  progressSection: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  progressTrack: {
    height: 10,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaText: {
    color: withOpacity(colors.white, 0.75),
    fontSize: fontSize.sm,
  },
  statusPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  statusText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  childrenContainer: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  hexWrapper: {
    width: HEX_SIZE,
    height: HEX_HEIGHT,
  },
  hexIconContainer: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: HEX_SIZE,
    height: HEX_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default QuestCard;
