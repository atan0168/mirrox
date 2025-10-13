import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, Pressable, TextInput } from 'react-native';

import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '../../App';

import { useQuestProgress, useQuestComplete } from '../hooks/useQuests';
import { useHydrationStore } from '../store/hydrationStore';
import { generateQuests } from '../services/questEngine';
import { useUserProfile } from '../hooks/useUserProfile';
import { useAQICNAirQuality } from '../hooks/useAirQuality';
import { localDayKeyUtc } from '../utils/datetimeUtils';

import { colors, spacing, borderRadius, fontSize } from '../theme';
import QuestCard from './quests/QuestCard';

export default function QuestList() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

  const { progress } = useQuestProgress();
  const completeMutation = useQuestComplete();

  const { data: userProfile } = useUserProfile();
  const { data: airQualityData } = useAQICNAirQuality(
    userProfile?.location.latitude ?? 0,
    userProfile?.location.longitude ?? 0,
    !!userProfile
  );

  const hydrationCurrentRaw = useHydrationStore(s => s.currentHydrationMl);
  const hydrationGoalRaw = useHydrationStore(s => s.dailyGoalMl);

  const hydrationCurrent = Number.isFinite(hydrationCurrentRaw)
    ? (hydrationCurrentRaw as number)
    : 0;
  const hydrationGoal = Math.max(1, Number(hydrationGoalRaw) || 2000);

  const quests = useMemo(
    () =>
      generateQuests({
        aqi: airQualityData?.aqi,
        hydrationDailyTargetMl: hydrationGoal,
      }),
    [airQualityData?.aqi, hydrationGoal]
  );

  const [gratitude, setGratitude] = useState('');
  const todayKey = useMemo(() => localDayKeyUtc(), []);

  const markDone = useCallback(
    async (questId: string, note?: string) => {
      const quest = quests.find(q => q.id === questId);
      if (!quest) return;
      await completeMutation.mutateAsync({ questDef: quest, note });
    },
    [quests, completeMutation]
  );

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
          const p = progress[`${q.id}::${todayKey}`];

          // Non-hydration quests: keep original quest progress
          const pctQuest = Math.min(
            100,
            Math.floor(((p?.value ?? 0) / Math.max(1, q.target)) * 100)
          );

          const pctHydration = Math.min(
            100,
            Math.floor((hydrationCurrent / hydrationGoal) * 100)
          );

          const done = isHydration
            ? hydrationCurrent >= hydrationGoal
            : !!p?.done;

          const pct = isHydration ? pctHydration : pctQuest;

          const badgeLabel = `+${q.rewardPoints} pts`;
          const progressLabel = done
            ? isHydration
              ? `Hydration goal met (${hydrationGoal} mL)`
              : '✅ Completed'
            : isHydration
              ? `${hydrationCurrent} / ${hydrationGoal} mL (${pctHydration}%)`
              : `${p?.value ?? 0} / ${q.target} (${pctQuest}%)`;
          const statusLabel = done
            ? isHydration
              ? 'Goal Met'
              : 'Completed'
            : undefined;
          const accentOverride = isHydration ? colors.teal[400] : undefined;

          const actionBlocks: React.ReactNode[] = [];

          if (!done && q.id === 'haze_mask_today') {
            actionBlocks.push(
              <Pressable
                key="mask"
                onPress={() => markDone(q.id)}
                style={{
                  padding: spacing.md,
                  backgroundColor: colors.sky[600],
                  borderRadius: borderRadius.full,
                }}
              >
                <Text
                  style={{
                    color: colors.white,
                    textAlign: 'center',
                    fontSize: fontSize.base,
                    fontWeight: '600',
                  }}
                >
                  Claim
                </Text>
              </Pressable>
            );
          }

          if (!done && q.id === 'nature_walk_10m') {
            actionBlocks.push(
              <Pressable
                key="nature"
                onPress={() => markDone(q.id)}
                style={{
                  padding: spacing.md,
                  backgroundColor: colors.green[600],
                  borderRadius: borderRadius.full,
                }}
              >
                <Text
                  style={{
                    color: colors.white,
                    textAlign: 'center',
                    fontSize: fontSize.base,
                    fontWeight: '600',
                  }}
                >
                  Claim
                </Text>
              </Pressable>
            );
          }

          if (!done && q.id === 'calm_breath_5m') {
            actionBlocks.push(
              <Pressable
                key="breath"
                onPress={() => markDone(q.id)}
                style={{
                  padding: spacing.md,
                  backgroundColor: colors.neutral[700],
                  borderRadius: borderRadius.full,
                }}
              >
                <Text
                  style={{
                    color: colors.white,
                    textAlign: 'center',
                    fontSize: fontSize.base,
                    fontWeight: '600',
                  }}
                >
                  Claim
                </Text>
              </Pressable>
            );
          }

          if (!done && q.id === 'gratitude_note') {
            actionBlocks.push(
              <View key="gratitude" style={{ gap: spacing.sm }}>
                <TextInput
                  placeholder="What are you grateful for today?"
                  value={gratitude}
                  onChangeText={setGratitude}
                  placeholderTextColor={colors.neutral[400]}
                  style={{
                    padding: spacing.md,
                    backgroundColor: colors.white,
                    borderRadius: borderRadius.full,
                    color: colors.neutral[900],
                    borderWidth: 1,
                    borderColor: colors.neutral[200],
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
                    padding: spacing.md,
                    backgroundColor: colors.yellow[500],
                    borderRadius: borderRadius.full,
                  }}
                >
                  <Text
                    style={{
                      color: colors.white,
                      textAlign: 'center',
                      fontSize: fontSize.base,
                      fontWeight: '600',
                    }}
                  >
                    Claim
                  </Text>
                </Pressable>
              </View>
            );
          }

          const actionContent =
            actionBlocks.length > 0 ? actionBlocks : undefined;

          return (
            <QuestCard
              key={q.id}
              title={q.title}
              description={q.description}
              rewardTag={q.rewardTag}
              badgeLabel={badgeLabel}
              progressPercent={Number.isFinite(pct) ? pct : 0}
              progressLabel={progressLabel}
              statusLabel={statusLabel}
              completed={done}
              accentColorOverride={accentOverride}
            >
              {actionContent}
            </QuestCard>
          );
        })}
      </View>
    </View>
  );
}
