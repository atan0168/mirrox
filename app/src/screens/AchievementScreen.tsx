import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  SafeAreaView,
  ScrollView,
  Pressable,
  Platform,
} from 'react-native';
import dayjs from 'dayjs';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { useQuestStore } from '../store/useQuestStore';
import { colors, spacing, fontSize, borderRadius, shadows } from '../theme';
import type { RootStackParamList } from '../../App';
import { resetDailyQuestsIfNewDay } from '../services/QuestService';

function useTwinVisuals() {
  const recentEffects = useQuestStore(s => s.recentEffects);
  const [activeEffect, setActiveEffect] = useState<string | null>(null);

  useEffect(() => {
    const now = Date.now();
    const within10s = recentEffects.find(e => now - e.addedAt <= 10_000);
    if (within10s) {
      setActiveEffect(within10s.tag);
      const t = setTimeout(() => setActiveEffect(null), 4000);
      return () => clearTimeout(t);
    }
  }, [recentEffects]);

  return activeEffect;
}

function useNarrativeFeedback() {
  const history = useQuestStore(s => s.history);
  const last24h = useMemo(() => {
    const cutoff = Date.now() - 24 * 3600 * 1000;
    return history.filter(h => h.completedAt >= cutoff);
  }, [history]);

  const text = useMemo(() => {
    const count = last24h.length;
    if (count >= 3) return 'Your twin looks stronger and more resilient.';
    if (count === 2)
      return 'Your twin grows steadier with your consistent actions.';
    if (count === 1) {
      const tag = last24h[0].rewardTag;
      if (tag === 'skin') return 'Your twin glows with clarity.';
      if (tag === 'lung') return 'Your twin breathes easier.';
      if (tag === 'stress') return 'Your twin feels lighter and calmer.';
      if (tag === 'calm') return 'Your twin settles into a peaceful rhythm.';
      if (tag === 'happiness') return 'Your twin radiates warm happiness.';
    }
    return 'Small steps today shape a stronger twin tomorrow.';
  }, [last24h]);

  return text;
}

/** --- Hook: per-quest current streak up to 7 (consecutive days) --- */
type QuestId =
  | 'drink_2l'
  | 'haze_mask_today'
  | 'nature_walk_10m'
  | 'calm_breath_5m'
  | 'gratitude_note';

function usePerQuestStreaks() {
  const history = useQuestStore(s => s.history);

  // map questId -> sorted unique day timestamps
  const perQuestDays = useMemo(() => {
    const map: Record<QuestId, number[]> = {
      drink_2l: [],
      haze_mask_today: [],
      nature_walk_10m: [],
      calm_breath_5m: [],
      gratitude_note: [],
    };
    history.forEach(h => {
      if (!map[h.questId as QuestId]) return;
      const ts = dayjs(h.completedAt).startOf('day').valueOf();
      if (!map[h.questId as QuestId].includes(ts))
        map[h.questId as QuestId].push(ts);
    });
    (Object.keys(map) as QuestId[]).forEach(k => map[k].sort((a, b) => a - b));
    return map;
  }, [history]);

  // compute "current" streak for each quest counting back from latest completion
  const streaks = useMemo(() => {
    const res: Record<QuestId, number> = {
      drink_2l: 0,
      haze_mask_today: 0,
      nature_walk_10m: 0,
      calm_breath_5m: 0,
      gratitude_note: 0,
    };
    (Object.entries(perQuestDays) as [QuestId, number[]][]).forEach(
      ([qid, days]) => {
        if (days.length === 0) return;
        let streak = 1;
        for (let i = days.length - 1; i > 0; i--) {
          const diffDays = (days[i] - days[i - 1]) / (24 * 3600 * 1000);
          if (diffDays <= 1.1) streak += 1;
          else break; // streak ends
        }
        res[qid] = Math.min(streak, 7);
      }
    );
    return res;
  }, [perQuestDays]);

  return streaks;
}

/** --- Hook: mini achievements (count + latest badge) --- */
type MiniBadge = { name: string; dateEarned: string; questId: string };

function useMiniBadgeSummary() {
  const history = useQuestStore(s => s.history);

  const perQuestDays = useMemo(() => {
    const map: Record<string, number[]> = {};
    history.forEach(h => {
      const dayTs = dayjs(h.completedAt).startOf('day').valueOf();
      map[h.questId] ??= [];
      if (!map[h.questId].includes(dayTs)) map[h.questId].push(dayTs);
    });
    Object.values(map).forEach(arr => arr.sort((a, b) => a - b));
    return map;
  }, [history]);

  const allBadges: MiniBadge[] = useMemo(() => {
    const label = (questId: string) =>
      questId.includes('drink')
        ? 'Hydration Hero 🏅'
        : questId.includes('mask')
          ? 'Health Guardian 😷'
          : questId.includes('walk')
            ? 'Nature Explorer 🚶‍♂️'
            : questId.includes('calm')
              ? 'Calm Master 🌿'
              : questId.includes('gratitude')
                ? 'Gratitude Champion 💖'
                : 'Achievement 🏅';

    const result: MiniBadge[] = [];
    Object.entries(perQuestDays).forEach(([questId, days]) => {
      let streak = 1;
      for (let i = 1; i < days.length; i++) {
        const diffDays = (days[i] - days[i - 1]) / (24 * 3600 * 1000);
        streak = diffDays <= 1.1 ? streak + 1 : 1;
        if (streak >= 7) {
          result.push({
            name: label(questId),
            questId,
            dateEarned: dayjs(days[i]).format('MMM D, YYYY'),
          });
          break; // only first unlock per quest
        }
      }
    });
    return result.sort(
      (a, b) => dayjs(b.dateEarned).valueOf() - dayjs(a.dateEarned).valueOf()
    );
  }, [perQuestDays]);

  const total = allBadges.length;
  const latest = allBadges[0] || null;
  return { total, latest };
}

/** --- UI: Task Progress Grid (5 compact segmented bars) --- */
function TaskProgressGrid() {
  const streaks = usePerQuestStreaks();
  const items: Array<{ id: QuestId; label: string; emoji: string }> = [
    { id: 'drink_2l', label: 'Hydration', emoji: '💧' },
    { id: 'haze_mask_today', label: 'Mask', emoji: '😷' },
    { id: 'nature_walk_10m', label: 'Walk', emoji: '🚶‍♂️' },
    { id: 'calm_breath_5m', label: 'Breathing', emoji: '🌬️' },
    { id: 'gratitude_note', label: 'Gratitude', emoji: '💖' },
  ];

  return (
    <View style={styles.gridCard}>
      <Text style={styles.gridTitle}>Weekly Streak by Quest</Text>

      <View style={styles.gridWrap}>
        {items.map(it => {
          const value = streaks[it.id] ?? 0;
          return (
            <View key={it.id} style={styles.gridItem}>
              <View style={styles.gridHeader}>
                <Text style={styles.gridEmoji}>{it.emoji}</Text>
                <Text style={styles.gridLabel}>{it.label}</Text>
                <Text style={styles.gridValue}>{value}/7</Text>
              </View>

              <View style={styles.segmentsRow}>
                {Array.from({ length: 7 }).map((_, idx) => {
                  const filled = idx < value;
                  return (
                    <View
                      key={idx}
                      style={[
                        styles.segment,
                        filled ? styles.segmentFilled : styles.segmentEmpty,
                      ]}
                    />
                  );
                })}
              </View>
            </View>
          );
        })}
      </View>

      <Text style={styles.gridHint}>
        Unlock trophies per quest when reaching 7/7
      </Text>
    </View>
  );
}

/** --- Main Twin Screen --- */
export default function AchievementScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const effect = useTwinVisuals();
  const narrative = useNarrativeFeedback();
  const { total: badgeCount, latest } = useMiniBadgeSummary();

  // reset daily quests if a new day is detected
  useEffect(() => {
    (async () => {
      try {
        await resetDailyQuestsIfNewDay();
      } catch (e) {
        console.warn('resetDailyQuestsIfNewDay failed:', e);
      }
    })();
  }, []);

  // hero glow animation
  const glowAnim = useState(new Animated.Value(0))[0];
  useEffect(() => {
    if (!effect) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: false,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 900,
          useNativeDriver: false,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [effect, glowAnim]);

  const glowColor =
    effect === 'skin'
      ? colors.yellow[300]
      : effect === 'lung'
        ? colors.sky[300]
        : effect === 'stress'
          ? colors.green[200]
          : effect === 'calm'
            ? colors.teal[300]
            : effect === 'happiness'
              ? colors.orange[200]
              : colors.neutral[300];

  const goHistory = () => navigation.navigate('QuestHistory');

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Animated.View
          style={[
            styles.twinHero,
            {
              shadowColor: glowColor,
              shadowOpacity: effect ? 0.7 : 0.25,
              shadowRadius: glowAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [10, 22],
              }),
            },
          ]}
        >
          <Text style={styles.twinTitle}>
            {effect === 'skin' && '✨ Skin glow'}
            {effect === 'lung' && '🛡️ Lung shield'}
            {effect === 'stress' && '🌿 Stress relief'}
            {effect === 'calm' && '🕊️ Calm ripple'}
            {effect === 'happiness' && '💖 Happiness halo'}
            {!effect && '🌟'}
          </Text>
          <Text style={styles.twinSubtitle}>{narrative}</Text>
          <Text style={styles.metaText}>
            Last sync {dayjs().format('MMM D')}
          </Text>
        </Animated.View>

        <TaskProgressGrid />

        <View style={styles.badgeSummary}>
          <Text style={styles.badgeSummaryTitle}>Achievements</Text>
          <View style={styles.badgeRow}>
            <View style={styles.badgePill}>
              <Text style={styles.badgePillText}>
                🏅 {badgeCount} trophies earned
              </Text>
            </View>
            {latest ? (
              <View style={styles.badgePill}>
                <Text style={styles.badgePillText}>
                  {latest.name} · {latest.dateEarned}
                </Text>
              </View>
            ) : (
              <View style={styles.badgePill}>
                <Text style={styles.badgePillText}>
                  No trophies yet — you got this!
                </Text>
              </View>
            )}
          </View>

          <Pressable
            onPress={goHistory}
            style={({ pressed }) => [
              styles.ctaBtn,
              { transform: [{ scale: pressed ? 0.98 : 1 }] },
            ]}
          >
            <Text style={styles.ctaText}>View Details</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/** --- Styles --- */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral[50],
  },
  content: {
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.lg,
  },
  twinHero: {
    width: '100%',
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    ...shadows.soft,
    ...(Platform.OS === 'android' ? { elevation: 3 } : null),
  },
  twinTitle: {
    color: colors.neutral[900],
    fontSize: fontSize.lg,
    fontWeight: '800',
    marginBottom: spacing.xs,
  },
  twinSubtitle: {
    color: colors.neutral[800],
    fontSize: fontSize.base,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  metaText: {
    color: colors.neutral[500],
    fontSize: fontSize.sm,
  },
  gridCard: {
    width: '100%',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.soft,
    ...(Platform.OS === 'android' ? { elevation: 2 } : null),
  },
  gridTitle: {
    fontSize: fontSize.base,
    fontWeight: '800',
    color: colors.neutral[900],
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  gridWrap: {
    gap: spacing.md,
  },
  gridItem: {
    backgroundColor: colors.neutral[50],
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  gridHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  gridEmoji: {
    fontSize: fontSize.lg,
  },
  gridLabel: {
    flex: 1,
    marginLeft: spacing.sm,
    fontSize: fontSize.base,
    fontWeight: '700',
    color: colors.neutral[900],
  },
  gridValue: {
    fontSize: fontSize.sm,
    color: colors.neutral[700],
    fontWeight: '700',
  },
  segmentsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  segment: {
    height: 10,
    flex: 1,
    borderRadius: borderRadius.full,
  },
  segmentFilled: {
    backgroundColor: colors.green[400],
  },
  segmentEmpty: {
    backgroundColor: colors.neutral[200],
  },
  gridHint: {
    marginTop: spacing.sm,
    color: colors.neutral[600],
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
  badgeSummary: {
    width: '100%',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.soft,
    ...(Platform.OS === 'android' ? { elevation: 2 } : null),
  },
  badgeSummaryTitle: {
    fontSize: fontSize.base,
    fontWeight: '800',
    color: colors.neutral[900],
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  badgeRow: {
    flexDirection: 'column',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  badgePill: {
    alignSelf: 'center',
    backgroundColor: colors.neutral[100],
    borderRadius: borderRadius.full,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  badgePillText: {
    fontSize: fontSize.sm,
    color: colors.neutral[800],
    fontWeight: '600',
  },
  ctaBtn: {
    alignSelf: 'center',
    backgroundColor: colors.black,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.full,
  },
  ctaText: {
    color: colors.white,
    fontWeight: '800',
    letterSpacing: 0.2,
    fontSize: fontSize.base,
  },
});
