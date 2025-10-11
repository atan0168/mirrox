// All comments in English as requested.

import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, Pressable, TextInput } from 'react-native';
import dayjs from 'dayjs';
import Constants from 'expo-constants';

// Navigation imports
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '../../App';

// Zustand stores
import { useQuestStore } from '../store/useQuestStore';
import { useHydrationStore } from '../store/hydrationStore';

// Services
import { generateQuests } from '../services/questEngine';
import { apiService } from '../services/ApiService';

// Theme constants
import { colors, spacing, borderRadius, fontSize } from '../theme';

// --- Helpers ---
const TODAY = () => dayjs().format('YYYY-MM-DD');
const keyFor = (id: string) => `${id}::${TODAY()}`;
const API_BASE =
  (Constants.expoConfig?.extra as any)?.apiBase ||
  process.env.EXPO_PUBLIC_API_BASE_URL;

export default function QuestList() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

  // Quest state
  const { setQuests, markDone } = useQuestStore();
  const quests = useQuestStore(s => s.quests);
  const progress = useQuestStore(s => s.progress);

  // ✅ Hydration store: use the correct field names from your store
  const hydrationCurrentRaw = useHydrationStore(s => s.currentHydrationMl);
  const hydrationGoalRaw = useHydrationStore(s => s.dailyGoalMl);

  // Guards to avoid NaN / division by 0
  const hydrationCurrent = Number.isFinite(hydrationCurrentRaw as any)
    ? (hydrationCurrentRaw as number)
    : 0;
  const hydrationGoal = Math.max(1, Number(hydrationGoalRaw) || 2000);

  const [gratitude, setGratitude] = useState('');

  // Generate daily quests (keeps hydration quest and conditionally adds others)
  useEffect(() => {
    (async () => {
      try {
        const airData = await apiService.fetchAQICNAirQuality(3.139, 101.6869);
        const aqi = airData?.aqi ?? 0;
        const qs = generateQuests({
          aqi,
          hydrationDailyTargetMl: hydrationGoal,
        });
        setQuests(qs);
      } catch {
        const qs = generateQuests({ hydrationDailyTargetMl: hydrationGoal });
        setQuests(qs);
      }
    })();
  }, [hydrationGoal, setQuests]);

  // Convenience handlers
  const addIntake = useCallback((amountMl: number) => {
    useHydrationStore
      .getState()
      .logFluidIntake({ amountMl: Math.max(1, Math.floor(amountMl)) });
  }, []);

  const completeHydrationToday = useCallback(() => {
    const remaining = Math.max(0, hydrationGoal - hydrationCurrent);
    if (remaining > 0) {
      useHydrationStore.getState().logFluidIntake({ amountMl: remaining });
    }
    // If your app requires explicit quest completion record, also:
    // useQuestStore.getState().markDone('drink_2l');
    const todayKey = keyFor('drink_2l');
    const alreadyDone = !!useQuestStore.getState().progress[todayKey]?.done;
    if (!alreadyDone) {
      useQuestStore.getState().markDone('drink_2l'); // NEW
    }
  }, [hydrationGoal, hydrationCurrent]);

  return (
    <View style={{ marginTop: spacing.lg, paddingHorizontal: spacing.md }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: spacing.sm,
        }}
      >
        <Text
          style={{
            fontWeight: '700',
            fontSize: fontSize.lg,
            color: colors.neutral[900],
          }}
        >
          Today’s Quests
        </Text>

        <Pressable
          onPress={() => navigation.navigate('QuestHistory')}
          style={{
            paddingVertical: 4,
            paddingHorizontal: 10,
            borderRadius: borderRadius.full,
            backgroundColor: colors.neutral[100],
            borderWidth: 1,
            borderColor: colors.divider,
          }}
        >
          <Text style={{ fontSize: fontSize.sm, color: colors.neutral[700] }}>
            History ›
          </Text>
        </Pressable>
      </View>

      {/* Quests list */}
      <View style={{ gap: spacing.sm }}>
        {quests.map(q => {
          const isHydration = q.id === 'drink_2l';
          const p = progress[keyFor(q.id)];

          // Non-hydration quests: keep original quest progress
          const pctQuest = Math.min(
            100,
            Math.floor(((p?.value ?? 0) / Math.max(1, q.target)) * 100)
          );

          // ✅ Hydration quest: proportional progress from hydration store
          const pctHydration = Math.min(
            100,
            Math.floor((hydrationCurrent / hydrationGoal) * 100)
          );

          const done = isHydration
            ? hydrationCurrent >= hydrationGoal
            : !!p?.done;

          const pct = isHydration ? pctHydration : pctQuest;

          return (
            <View
              key={q.id}
              style={{
                backgroundColor: colors.white,
                borderRadius: borderRadius.lg,
                padding: spacing.md,
                borderWidth: 1,
                borderColor: colors.divider,
              }}
            >
              {/* Title & description */}
              <Text
                style={{
                  fontWeight: '600',
                  fontSize: fontSize.base,
                  color: colors.neutral[900],
                }}
              >
                {q.title}
              </Text>

              {!!q.description && (
                <Text
                  style={{
                    opacity: 0.7,
                    marginTop: spacing.xs,
                    color: colors.neutral[700],
                  }}
                >
                  {q.description}
                </Text>
              )}

              {/* Progress bar */}
              <View
                style={{
                  height: 8,
                  backgroundColor: colors.neutral[200],
                  borderRadius: borderRadius.sm,
                  marginTop: spacing.sm,
                }}
              >
                <View
                  style={{
                    height: 8,
                    width: `${Number.isFinite(pct) ? pct : 0}%`,
                    backgroundColor: done ? colors.green[500] : colors.sky[500],
                    borderRadius: borderRadius.sm,
                  }}
                />
              </View>

              {/* Hydration actions */}
              {!done && isHydration && (
                <View
                  style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    gap: spacing.xs,
                    marginTop: spacing.sm,
                  }}
                >
                  {[200, 300, 500].map(amt => (
                    <Pressable
                      key={amt}
                      onPress={() => addIntake(amt)}
                      style={{
                        paddingVertical: spacing.xs,
                        paddingHorizontal: spacing.sm,
                        backgroundColor: colors.teal[500],
                        borderRadius: borderRadius.full,
                      }}
                    >
                      <Text
                        style={{ color: colors.white, fontSize: fontSize.sm }}
                      >
                        +{amt} mL
                      </Text>
                    </Pressable>
                  ))}

                  {/* Optional: one-tap complete */}
                  <Pressable
                    onPress={completeHydrationToday}
                    style={{
                      paddingVertical: spacing.xs,
                      paddingHorizontal: spacing.sm,
                      backgroundColor: colors.neutral[800],
                      borderRadius: borderRadius.full,
                    }}
                  >
                    <Text
                      style={{ color: colors.white, fontSize: fontSize.sm }}
                    >
                      Complete today
                    </Text>
                  </Pressable>
                </View>
              )}

              {/* Other quests */}
              {!done && q.id === 'haze_mask_today' && (
                <Pressable
                  onPress={() => markDone(q.id)}
                  style={{
                    marginTop: spacing.sm,
                    padding: spacing.sm,
                    backgroundColor: colors.sky[500],
                    borderRadius: borderRadius.md,
                  }}
                >
                  <Text
                    style={{
                      color: colors.white,
                      textAlign: 'center',
                      fontSize: fontSize.base,
                    }}
                  >
                    I wore a mask today
                  </Text>
                </Pressable>
              )}

              {!done && q.id === 'nature_walk_10m' && (
                <Pressable
                  onPress={() => markDone(q.id)}
                  style={{
                    marginTop: spacing.sm,
                    padding: spacing.sm,
                    backgroundColor: colors.green[500],
                    borderRadius: borderRadius.md,
                  }}
                >
                  <Text
                    style={{
                      color: colors.white,
                      textAlign: 'center',
                      fontSize: fontSize.base,
                    }}
                  >
                    Completed 10-min walk
                  </Text>
                </Pressable>
              )}

              {!done && q.id === 'calm_breath_5m' && (
                <Pressable
                  onPress={() => markDone(q.id)}
                  style={{
                    marginTop: spacing.sm,
                    padding: spacing.sm,
                    backgroundColor: colors.neutral[700],
                    borderRadius: borderRadius.md,
                  }}
                >
                  <Text
                    style={{
                      color: colors.white,
                      textAlign: 'center',
                      fontSize: fontSize.base,
                    }}
                  >
                    I did 5-min breathing
                  </Text>
                </Pressable>
              )}

              {!done && q.id === 'gratitude_note' && (
                <View style={{ marginTop: spacing.sm }}>
                  <TextInput
                    placeholder="Write one gratitude sentence..."
                    value={gratitude}
                    onChangeText={setGratitude}
                    placeholderTextColor={colors.neutral[400]}
                    style={{
                      padding: spacing.sm,
                      backgroundColor: colors.neutral[100],
                      borderRadius: borderRadius.md,
                      color: colors.neutral[900],
                      borderWidth: 1,
                      borderColor: colors.divider,
                    }}
                  />
                  <Pressable
                    onPress={() => {
                      if (gratitude.trim()) {
                        markDone(q.id, gratitude.trim());
                        setGratitude('');
                      }
                    }}
                    style={{
                      marginTop: spacing.xs,
                      padding: spacing.sm,
                      backgroundColor: colors.yellow[500],
                      borderRadius: borderRadius.md,
                    }}
                  >
                    <Text
                      style={{
                        color: colors.white,
                        textAlign: 'center',
                        fontSize: fontSize.base,
                      }}
                    >
                      Submit gratitude
                    </Text>
                  </Pressable>
                </View>
              )}

              {/* Progress caption */}
              <Text
                style={{
                  marginTop: spacing.xs,
                  fontSize: fontSize.xs,
                  opacity: 0.75,
                  color: colors.neutral[700],
                }}
              >
                {isHydration
                  ? `${hydrationCurrent} / ${hydrationGoal} mL (${pctHydration}%)${
                      done ? ' — ✅ Completed' : ''
                    }`
                  : !!p?.done
                    ? '✅ Completed'
                    : `${p?.value ?? 0} / ${q.target} (${pctQuest}%)`}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
