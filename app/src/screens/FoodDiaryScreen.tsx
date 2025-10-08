import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useMutation } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AnalysisCard from '../components/AnalysisCard';
import ThisMealCard from '../components/ThisMealCard';
import { useAnalyzeMeal } from '../hooks/useAnalyzeMeal';
import { useExtractMeal } from '../hooks/useExtractMeal';
import {
  AnalyzeMealResponseData,
  FoodSearchItem,
  backendApiService,
} from '../services/BackendApiService';
import { useAvatarStore } from '../store/avatarStore';
import { useMealStore } from '../store/mealStore';
import { borderRadius, colors, fontSize, spacing } from '../theme';

const FOOD_SEARCH_LIMIT = 5;

export default function FoodDiaryScreen() {
  const [text, setText] = useState('');
  const [image, setImage] = useState<{ uri: string; base64?: string } | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AnalyzeMealResponseData | null>(
    null
  );
  const navigation = useNavigation();
  const analyzeRef = useRef<() => Promise<void>>(null);

  // Global stores
  const setLastAnalysis = useMealStore(s => s.setLastAnalysis);
  const applyEffects = useAvatarStore(s => s.applyEffects);

  // Store methods for meal flow
  const appendFromAnalysis = useMealStore(s => s.appendFromAnalysis);
  const reloadMealItems = useMealStore(s => s.reloadItems);

  const { mutateAsync: extractMealAsync } = useExtractMeal();
  const { mutateAsync: analyzeMealAsync } = useAnalyzeMeal();

  const { mutateAsync: searchFoodsAsync } = useMutation<
    FoodSearchItem[],
    Error,
    string
  >({
    mutationFn: query =>
      backendApiService.searchFoods(query, FOOD_SEARCH_LIMIT),
  });

  // --- Pick image from gallery ---
  async function pickImage() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted)
      return Alert.alert('Permission', 'Photo library permission is required.');
    const r = await ImagePicker.launchImageLibraryAsync({
      base64: true,
      quality: 0.7,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
    });
    if (!r.canceled) {
      const asset = r.assets[0];
      setImage({
        uri: asset.uri,
        base64: asset.base64
          ? `data:image/jpeg;base64,${asset.base64}`
          : undefined,
      });
    }
  }

  function removeImage() {
    setImage(null);
  }
  // const { quickLog } = useMeal();
  // const { mutate: quickLogMutate } = quickLog;

  const analyze = useCallback(async () => {
    const trimmedText = text.trim();
    const imageBase64 = image?.base64;

    if (!trimmedText && !imageBase64) {
      Alert.alert('Input required', 'Enter text or pick an image.');
      return;
    }

    setLoading(true);
    setAnalysis(null);

    try {
      const extraction = await extractMealAsync({
        text: trimmedText || undefined,
        imageBase64: imageBase64 || undefined,
      });

      const hasEntity =
        (extraction?.FOOD_ITEM?.length || 0) +
          (extraction?.DRINK_ITEM?.length || 0) >
        0;

      if (!hasEntity && trimmedText) {
        const results = await searchFoodsAsync(trimmedText);
        const candidate = results?.[0];

        if (candidate?.id && candidate?.name) {
          const canonicalName = candidate.display_name ?? candidate.name;
          Alert.alert(
            'Did you mean…',
            `Did you mean “${canonicalName}” for “${trimmedText}”?`,
            [
              { text: 'No' },
              {
                text: 'Yes',
                onPress: () => {
                  // TODO: this should be stored on device instead
                  // saveUserDictionary(
                  //   {
                  //     phrase: trimmedText.toLowerCase(),
                  //     canonicalId: candidate.id,
                  //     canonicalName,
                  //   },
                  //   {
                  //     onSuccess: () => {
                  //       Alert.alert(
                  //         'Saved',
                  //         'We will remember this next time.'
                  //       );
                  //       setText(canonicalName);
                  //       setTimeout(() => {
                  //         analyzeRef.current?.();
                  //       }, 300);
                  //     },
                  //     onError: error => {
                  //       const message =
                  //         error instanceof Error
                  //           ? error.message
                  //           : 'Unable to save preference.';
                  //       Alert.alert('Error', message);
                  //     },
                  //   }
                  // );
                },
              },
            ],
            { cancelable: true }
          );
          return;
        }

        Alert.alert(
          'Not recognized',
          'No close match found in the food database.'
        );
        return;
      }

      const analysisData = await analyzeMealAsync({
        text: trimmedText || undefined,
        imageBase64: imageBase64 || undefined,
      });

      const totalEnergy = Number(
        analysisData?.nutrients?.total?.energy_kcal ?? 0
      );
      const perItemCount = analysisData?.nutrients?.per_item?.length ?? 0;

      if (
        perItemCount === 0 &&
        (!Number.isFinite(totalEnergy) || totalEnergy <= 0)
      ) {
        Alert.alert(
          'Nothing recognized',
          'Please try clearer names (e.g., “roti canai, teh tarik”) or sharper receipt photos.'
        );
        return;
      }

      setAnalysis(analysisData);
      setLastAnalysis(analysisData);

      const perItems =
        (analysisData.nutrients?.per_item?.length ?? 0) > 0
          ? analysisData.nutrients.per_item
          : (analysisData.canonical ?? []);

      if (perItems.length > 0) {
        await appendFromAnalysis(
          perItems.map(item => ({
            name: item.display_name || item.name || item.id || 'Food',
            energy_kcal: item.energy_kcal,
            source: item.source,
          }))
        );
      }

      if (analysisData.avatar_effects?.length) {
        applyEffects(analysisData.avatar_effects);
      }

      Alert.alert('Done', 'Meal analyzed and applied to Avatar.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Analyze failed';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  }, [
    text,
    image,
    appendFromAnalysis,
    applyEffects,
    searchFoodsAsync,
    analyzeMealAsync,
    extractMealAsync,
    setLastAnalysis,
  ]);

  useEffect(() => {
    analyzeRef.current = analyze;
  }, [analyze]);

  // TODO: this should be done only on the frontend
  // useEffect(() => {
  //   let active = true;
  //
  //   const checkPredictive = async () => {
  //     try {
  //       const response = await fetchPredictiveCandidate();
  //       if (!active || !response?.ok || !response.suggest) {
  //         return;
  //       }
  //
  //       const suggestionName = response.name ?? 'this meal';
  //       Alert.alert(
  //         'Good Morning!',
  //         `Is it still ${suggestionName}?`,
  //         [
  //           { text: 'No' },
  //           {
  //             text: 'Yes',
  //             onPress: () => {
  //               if (response.food_id) {
  //                 quickLogMutate(response.food_id);
  //               }
  //               setText(suggestionName);
  //               analyzeRef.current?.();
  //             },
  //           },
  //         ],
  //         { cancelable: true }
  //       );
  //     } catch (error) {
  //       if (__DEV__) {
  //         console.log('[predictive] error', error);
  //       }
  //     }
  //   };
  //
  //   checkPredictive();
  //
  //   return () => {
  //     active = false;
  //   };
  // }, [fetchPredictiveCandidate, quickLogMutate]);

  // Refresh meal items on focus
  useFocusEffect(
    React.useCallback(() => {
      reloadMealItems?.();
    }, [reloadMealItems])
  );

  // Helpers
  function reset() {
    setText('');
    setImage(null);
    setAnalysis(null);
  }

  const canSubmit = !!text.trim() || !!image?.base64;
  const tagsForCard = analysis?.tags_display?.length
    ? analysis.tags_display
    : (analysis?.tags ?? []);

  return (
    <ScrollView
      contentContainerStyle={{ padding: spacing.md, gap: spacing.sm }}
    >
      <Text style={{ fontSize: fontSize.lg, fontWeight: '600' }}>
        What's on your plate?
      </Text>

      {/* Input */}
      <Text style={{ fontWeight: '500' }}>Input:</Text>
      <TextInput
        placeholder="e.g. Roti canai and teh tarik"
        value={text}
        onChangeText={setText}
        style={{
          borderWidth: 1,
          borderColor: colors.divider,
          borderRadius: borderRadius.md,
          padding: spacing.md,
          backgroundColor: colors.white,
        }}
        multiline
      />

      {/* Actions */}
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <TouchableOpacity
          onPress={pickImage}
          style={{
            flex: 1,
            backgroundColor: colors.white,
            borderColor: colors.primary,
            borderWidth: 1.4,
            paddingVertical: spacing.sm,
            borderRadius: borderRadius.md,
            alignItems: 'center',
          }}
        >
          <Text
            style={{
              fontSize: fontSize.base,
              fontWeight: '600',
              color: colors.primary,
            }}
          >
            {image ? 'Change photo' : 'Add photo'}
          </Text>
        </TouchableOpacity>

        {image && (
          <TouchableOpacity
            onPress={removeImage}
            style={{
              flex: 1,
              backgroundColor: colors.white,
              borderColor: colors.primary,
              borderWidth: 1.4,
              paddingVertical: spacing.sm,
              borderRadius: borderRadius.md,
              alignItems: 'center',
            }}
          >
            <Text
              style={{
                fontSize: fontSize.base,
                fontWeight: '600',
                color: colors.primary,
              }}
            >
              REMOVE IMAGE
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Image preview */}
      {image && (
        <Image
          source={{ uri: image.uri }}
          style={{
            width: '100%',
            height: 220,
            borderRadius: borderRadius.md,
            backgroundColor: colors.neutral[100],
          }}
          resizeMode="cover"
        />
      )}

      {/* Analyze */}
      <TouchableOpacity
        onPress={analyze}
        disabled={!canSubmit || loading}
        style={{
          backgroundColor:
            !canSubmit || loading ? colors.neutral[300] : colors.primary,
          paddingVertical: spacing.md,
          borderRadius: borderRadius.md,
          alignItems: 'center',
          opacity: loading ? 0.8 : 1,
        }}
      >
        <Text
          style={{
            color: colors.white,
            fontWeight: '600',
            fontSize: fontSize.base,
          }}
        >
          {loading ? 'Analyzing...' : 'ANALYZE'}
        </Text>
      </TouchableOpacity>

      {loading && <ActivityIndicator size="large" />}

      <View style={{ marginTop: spacing.md }}>
        <ThisMealCard />
      </View>

      {/* Nutrition summary card */}
      {(analysis?.nutrients?.total?.energy_kcal ?? 0) > 0 && (
        <View style={{ marginTop: spacing.md }}>
          <AnalysisCard
            energyKcal={analysis?.nutrients.total.energy_kcal}
            tags={tagsForCard}
            onPressDetails={() =>
              navigation.navigate('NutritionDetail' as never)
            }
          />
        </View>
      )}

      {/* Reset button */}
      {(text || image || analysis) && (
        <TouchableOpacity
          onPress={reset}
          style={{
            marginTop: spacing.sm,
            backgroundColor: colors.white,
            borderColor: colors.primary,
            borderWidth: 1.4,
            paddingVertical: spacing.sm,
            borderRadius: borderRadius.md,
            alignItems: 'center',
          }}
        >
          <Text
            style={{
              color: colors.primary,
              fontWeight: '600',
              fontSize: fontSize.base,
            }}
          >
            CLEAR
          </Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}
