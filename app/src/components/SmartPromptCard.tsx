import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import {
  ACCEPT_COOLDOWN_MS,
  PROMPT_COOLDOWN_KEY,
  REJECT_COOLDOWN_MS,
} from '../constants';
import { SmartPromptSuggestion } from '../services/BackendApiService';
import { localStorageService } from '../services/LocalStorageService';
import { borderRadius, colors, fontSize, shadows, spacing } from '../theme';
import { Button } from './ui';

export default function SmartPromptCard() {
  const [suggestion, setSuggestion] = useState<SmartPromptSuggestion | null>(
    null
  );

  // TODO: migrate this functionality to frontend
  // useEffect(() => {
  //   const fetchSuggestion = async () => {
  //     try {
  //       const cooldownRaw =
  //         await localStorageService.getString(PROMPT_COOLDOWN_KEY);
  //       if (cooldownRaw) {
  //         const cooldownUntil = Number.parseInt(cooldownRaw, 10);
  //         if (Number.isFinite(cooldownUntil) && Date.now() < cooldownUntil) {
  //           return;
  //         }
  //       }
  //
  //       const smartPrompt =
  //         await backendApiService.fetchSmartPromptSuggestion();
  //
  //       if (smartPrompt) {
  //         setSuggestion(smartPrompt);
  //       }
  //     } catch (error) {
  //       console.error('Failed to fetch suggestion:', error);
  //     }
  //   };
  //
  //   void fetchSuggestion();
  // }, []);

  if (!suggestion) return null;

  const handleAccept = async () => {
    if (!suggestion) return;

    try {
      // TODO: if we want this we should move it to the mobile app itself
      // await backendApiService.logSmartPromptMealEvent({
      //   food_id: suggestion.key?.startsWith('myfcd:') ? suggestion.key : null,
      //   food_name: suggestion.name,
      //   source: 'predict_yes',
      // });

      await localStorageService.setString(
        PROMPT_COOLDOWN_KEY,
        String(Date.now() + ACCEPT_COOLDOWN_MS)
      );

      setSuggestion(null);
      Alert.alert(
        'Meal logged',
        'Thanks! We have recorded this suggestion for you.'
      );
    } catch (error) {
      console.error('Failed to log meal event:', error);
    }
  };

  const handleReject = async () => {
    try {
      await localStorageService.setString(
        PROMPT_COOLDOWN_KEY,
        String(Date.now() + REJECT_COOLDOWN_MS)
      );
    } catch (error) {
      console.error('Failed to update cooldown after rejection:', error);
    } finally {
      setSuggestion(null);
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>
        Good morning! Same {suggestion.name} today?
      </Text>
      <View style={styles.actions}>
        <Button onPress={handleAccept}>Yes</Button>
        <Button
          variant="outline"
          onPress={handleReject}
          style={styles.actionButtonSpacing}
        >
          No
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    ...shadows.soft,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '500',
    color: colors.neutral[900],
  },
  actions: {
    marginTop: spacing.md,
    flexDirection: 'row',
  },
  actionButtonSpacing: {
    marginLeft: spacing.md,
  },
});
