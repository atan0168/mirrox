import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, fontSize } from '../../theme';
import SceneSwitcher, { SceneOption } from './SceneSwitcher';
import RainIntensityControls from './RainIntensityControls';
import SandboxControls from './SandboxControls';
import { FacialExpressionControls } from './FacialExpressionControls';
import EyeBagsControls from './EyeBagsControls';
import { SkinToneButton } from './SkinToneButton';
import QuestStreakControls from './QuestStreakControls';
import type { QuestId } from '../../models/quest';

interface DeveloperControlsProps {
  scene: SceneOption;
  setScene: (value: SceneOption) => void;
  setSceneManuallyOverridden: (value: boolean) => void;
  autoScene: SceneOption;
  manualSkinToneAdjustment: number;
  setManualSkinToneAdjustment: (value: number) => void;
  rainIntensity: number;
  setRainIntensity: (value: number) => void;
  rainDirection: 'vertical' | 'angled';
  setRainDirection: (value: 'vertical' | 'angled') => void;
  manualExpression: string | null;
  setManualExpression: (value: string) => void;
  clearManualExpression: () => void;
  resetOnboarding: () => void;
  seed7DayHistory: (id: QuestId) => void;
  seed6ThenCompleteToday: (id: QuestId) => void | Promise<void>;
  clearHistoryForRetest: () => void | Promise<void>;
  userProfile?: {
    location?: {
      latitude: number;
      longitude: number;
    };
  };
}

const DeveloperControls: React.FC<DeveloperControlsProps> = ({
  scene,
  setScene,
  setSceneManuallyOverridden,
  autoScene,
  manualSkinToneAdjustment,
  setManualSkinToneAdjustment,
  rainIntensity,
  setRainIntensity,
  rainDirection,
  setRainDirection,
  manualExpression,
  setManualExpression,
  clearManualExpression,
  resetOnboarding,
  seed7DayHistory,
  seed6ThenCompleteToday,
  clearHistoryForRetest,
  userProfile,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Developer Controls</Text>
      <SceneSwitcher
        value={scene}
        onChange={value => {
          setScene(value);
          setSceneManuallyOverridden(value !== autoScene);
        }}
      />
      <SkinToneButton
        skinToneAdjustment={manualSkinToneAdjustment}
        onSkinToneChange={setManualSkinToneAdjustment}
      />
      <SandboxControls location={userProfile?.location} />
      <RainIntensityControls
        value={rainIntensity}
        onChange={setRainIntensity}
        direction={rainDirection}
        onChangeDirection={setRainDirection}
      />

      {/* Eye Bags (Dark Circles) Developer Controls */}
      <EyeBagsControls />

      {/* Developer utility: compact dev utilities */}
      <QuestStreakControls
        onResetOnboarding={resetOnboarding}
        seed7DayHistory={seed7DayHistory}
        seed6ThenCompleteToday={seed6ThenCompleteToday}
        clearHistoryForRetest={clearHistoryForRetest}
      />

      {/* Facial Expressions (dev only) */}
      <FacialExpressionControls
        currentExpression={manualExpression}
        onExpressionChange={setManualExpression}
        onReset={clearManualExpression}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
    gap: 20,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.neutral[800],
    marginBottom: spacing.md,
  },
});

export default DeveloperControls;
