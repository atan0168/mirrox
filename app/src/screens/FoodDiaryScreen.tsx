import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useMutation } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AnalysisCard from '../components/AnalysisCard';
import FoodItemSelectionModal from '../components/FoodItemSelectionModal';
import ThisMealCard from '../components/ThisMealCard';
import { useMeal } from '../hooks/useMeal';
import { useAnalyzeFood } from '../hooks/useAnalyzeMeal';
import { useExtractMeal } from '../hooks/useExtractMeal';
import {
  AnalyzeFoodRequestPayload,
  ItemNutrient,
  FoodSearchItem,
  backendApiService,
} from '../services/BackendApiService';
import { borderRadius, colors, fontSize, spacing } from '../theme';
import { getMealItemNutrientTotal } from '../utils/nutritionUtils';

const FOOD_SEARCH_LIMIT = 10;

interface AnalyzeOptions {
  textOverride?: string;
  skipExtraction?: boolean;
  selectedFoodId?: string;
}

type ExtractedItemType = 'food' | 'drink';

interface ItemDecision {
  original: string;
  portion?: string | null;
  modifiers?: string[];
  type: ExtractedItemType;
  selectedFood?: FoodSearchItem;
  skipped?: boolean;
}

export default function FoodDiaryScreen() {
  const [text, setText] = useState('');
  const [image, setImage] = useState<{ uri: string; base64?: string } | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [preparingMeal, setPreparingMeal] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [selectionVisible, setSelectionVisible] = useState(false);
  const [itemDecisions, setItemDecisions] = useState<ItemDecision[]>([]);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [currentItemSuggestions, setCurrentItemSuggestions] = useState<
    FoodSearchItem[]
  >([]);
  const [isSuggestionLoading, setIsSuggestionLoading] = useState(false);
  const navigation = useNavigation();
  const analyzeRef = useRef<
    ((options?: AnalyzeOptions) => Promise<void>) | null
  >(null);
  const suggestionCacheRef = useRef<Map<number, FoodSearchItem[]>>(new Map());
  const fetchingSuggestionsRef = useRef<Set<number>>(new Set());
  const itemDecisionsRef = useRef<ItemDecision[]>([]);
  const currentItemIndexRef = useRef(0);
  const analysisContextRef = useRef<{
    text: string;
    imageBase64?: string;
  } | null>(null);
  const statusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateStatusMessage = useCallback(
    (message: string | null, autoClearMs?: number) => {
      if (statusTimeoutRef.current) {
        clearTimeout(statusTimeoutRef.current);
        statusTimeoutRef.current = null;
      }
      setStatusMessage(message);
      if (message && autoClearMs) {
        statusTimeoutRef.current = setTimeout(() => {
          setStatusMessage(null);
          statusTimeoutRef.current = null;
        }, autoClearMs);
      }
    },
    []
  );

  const {
    data: mealItems = [],
    appendFromAnalysis: appendFromAnalysisMutation,
    refetch: refetchMealItems,
  } = useMeal();

  const appendFromAnalysis = appendFromAnalysisMutation.mutateAsync;

  // Store methods for meal flow
  const { mutateAsync: extractMealAsync } = useExtractMeal();
  const { mutateAsync: analyzeMealAsync } = useAnalyzeFood();

  const { mutateAsync: searchFoodsAsync } = useMutation<
    FoodSearchItem[],
    Error,
    string
  >({
    mutationFn: query =>
      backendApiService.searchFoods(query, FOOD_SEARCH_LIMIT),
  });

  const executeAnalysisRequest = useCallback(
    async (payload: AnalyzeFoodRequestPayload) => {
      const analysisData = await analyzeMealAsync(payload);

      const totalEnergy = Number(
        analysisData?.nutrients?.total?.energy_kcal ?? 0
      );
      const perItems = analysisData?.nutrients?.per_item ?? [];
      const perItemCount = perItems.length;

      if (
        perItemCount === 0 &&
        (!Number.isFinite(totalEnergy) || totalEnergy <= 0)
      ) {
        throw new Error(
          'Please try clearer names (e.g., “roti canai, teh tarik”) or sharper receipt photos.'
        );
      }

      if (perItems.length > 0) {
        await appendFromAnalysis(perItems);
      } else {
        await refetchMealItems({
          throwOnError: true,
        });
      }

      Alert.alert('Done', 'Food successfully analyzed');
    },
    [analyzeMealAsync, appendFromAnalysis, refetchMealItems]
  );

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

  const updateCurrentItemIndex = useCallback((index: number) => {
    currentItemIndexRef.current = index;
    setCurrentItemIndex(index);
  }, []);

  const fetchSuggestions = useCallback(
    async (index: number, prefetch: boolean = false) => {
      const items = itemDecisionsRef.current;
      if (index < 0 || index >= items.length) return;

      if (
        suggestionCacheRef.current.has(index) ||
        fetchingSuggestionsRef.current.has(index)
      ) {
        if (!prefetch && index === currentItemIndexRef.current) {
          const cached = suggestionCacheRef.current.get(index) ?? [];
          setCurrentItemSuggestions(cached);
          setIsSuggestionLoading(false);
        }
        return;
      }

      const query = items[index]?.original?.trim();
      if (!query) {
        suggestionCacheRef.current.set(index, []);
        if (!prefetch && index === currentItemIndexRef.current) {
          setCurrentItemSuggestions([]);
          setIsSuggestionLoading(false);
        }
        return;
      }

      fetchingSuggestionsRef.current.add(index);
      if (!prefetch && index === currentItemIndexRef.current) {
        setIsSuggestionLoading(true);
      }

      try {
        const results = await searchFoodsAsync(query);
        suggestionCacheRef.current.set(index, results);
        if (index === currentItemIndexRef.current) {
          setCurrentItemSuggestions(results);
        }
      } catch (error) {
        console.error('Failed to fetch suggestions', error);
        suggestionCacheRef.current.set(index, []);
        if (!prefetch && index === currentItemIndexRef.current) {
          setCurrentItemSuggestions([]);
        }
      } finally {
        fetchingSuggestionsRef.current.delete(index);
        if (!prefetch && index === currentItemIndexRef.current) {
          setIsSuggestionLoading(false);
        }
      }
    },
    [searchFoodsAsync]
  );

  const completeSelectionAndAnalyze = useCallback(async () => {
    setSelectionVisible(false);
    const context = analysisContextRef.current;
    if (!context) {
      setLoading(false);
      return;
    }

    const decisions = itemDecisionsRef.current;
    if (!decisions.length) {
      setLoading(false);
      return;
    }

    const analyzableDecisions = decisions.filter(decision => !decision.skipped);
    if (analyzableDecisions.length === 0) {
      updateStatusMessage(
        'Analyzing your diary entry... please stay on this page.'
      );
      try {
        await executeAnalysisRequest({
          ...(context.text ? { text: context.text } : {}),
          ...(context.imageBase64 ? { imageBase64: context.imageBase64 } : {}),
        });
        updateStatusMessage('Analysis complete!', 4000);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Analyze failed';
        Alert.alert('Error', message);
        updateStatusMessage(null);
      } finally {
        setLoading(false);
      }
      return;
    }

    const aggregatedPerItems: ItemNutrient[] = [];

    try {
      for (let index = 0; index < analyzableDecisions.length; index += 1) {
        const decision = analyzableDecisions[index];
        const payload: AnalyzeFoodRequestPayload = {
          text: decision.original,
        };

        if (decision.selectedFood) {
          payload.selectedFoodId = decision.selectedFood.id;
          payload.skipExtraction = true;
        }

        updateStatusMessage(
          `Analyzing item ${index + 1} of ${analyzableDecisions.length}...`
        );

        const response = await analyzeMealAsync(payload);
        const perItems = response?.nutrients?.per_item ?? [];
        aggregatedPerItems.push(...perItems);
      }

      if (aggregatedPerItems.length === 0) {
        throw new Error('No recognizable meal items were returned.');
      }

      updateStatusMessage(
        'LLM is finalizing your meal... please stay on this page.'
      );

      await appendFromAnalysis(aggregatedPerItems);
      updateStatusMessage('Analysis complete!', 4000);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Analyze failed';
      Alert.alert('Error', message);
      updateStatusMessage(null);
    } finally {
      setLoading(false);
    }
  }, [analyzeMealAsync, appendFromAnalysis, updateStatusMessage]);

  const showItemAtIndex = useCallback(
    (index: number) => {
      const total = itemDecisionsRef.current.length;
      if (index < 0 || index >= total) return;

      setSelectionVisible(true);
      updateCurrentItemIndex(index);

      const cached = suggestionCacheRef.current.get(index);
      if (cached) {
        setCurrentItemSuggestions(cached);
        setIsSuggestionLoading(false);
      } else {
        setCurrentItemSuggestions([]);
        setIsSuggestionLoading(true);
      }

      if (total > 0) {
        updateStatusMessage(
          `Review item ${index + 1} of ${total}. Please stay on this page.`
        );
      }

      void fetchSuggestions(index, false);
      void fetchSuggestions(index + 1, true);
    },
    [fetchSuggestions, updateCurrentItemIndex, updateStatusMessage]
  );

  const beginSelectionFlow = useCallback(
    (
      items: ItemDecision[],
      context: { text: string; imageBase64?: string | undefined }
    ) => {
      suggestionCacheRef.current.clear();
      fetchingSuggestionsRef.current.clear();
      itemDecisionsRef.current = items;
      analysisContextRef.current = context;
      setItemDecisions(items);
      updateCurrentItemIndex(0);
      showItemAtIndex(0);
    },
    [showItemAtIndex, updateCurrentItemIndex]
  );

  const advanceToNextItem = useCallback(() => {
    const total = itemDecisionsRef.current.length;
    const nextIndex = currentItemIndexRef.current + 1;

    if (nextIndex >= total) {
      void completeSelectionAndAnalyze();
    } else {
      showItemAtIndex(nextIndex);
    }
  }, [completeSelectionAndAnalyze, showItemAtIndex]);

  const handleSelectCurrentSuggestion = useCallback(
    (item: FoodSearchItem) => {
      setItemDecisions(prev => {
        const next = [...prev];
        const currentIndex = currentItemIndexRef.current;
        if (next[currentIndex]) {
          next[currentIndex] = {
            ...next[currentIndex],
            selectedFood: item,
            skipped: false,
          };
        }
        itemDecisionsRef.current = next;
        return next;
      });
      advanceToNextItem();
    },
    [advanceToNextItem]
  );

  const handleSkipCurrentItem = useCallback(() => {
    setItemDecisions(prev => {
      const next = [...prev];
      const currentIndex = currentItemIndexRef.current;
      if (next[currentIndex]) {
        next[currentIndex] = {
          ...next[currentIndex],
          selectedFood: undefined,
          skipped: true,
        };
      }
      itemDecisionsRef.current = next;
      return next;
    });
    advanceToNextItem();
  }, [advanceToNextItem]);

  const analyze = useCallback(
    async (options: AnalyzeOptions = {}) => {
      const { textOverride, skipExtraction = false, selectedFoodId } = options;
      const baseText = textOverride ?? text;
      const trimmedText = baseText.trim();
      const imageBase64 = image?.base64;

      if (!trimmedText && !imageBase64) {
        Alert.alert('Input required', 'Enter text or pick an image.');
        return;
      }

      setLoading(true);

      if (skipExtraction || selectedFoodId) {
        updateStatusMessage(
          'Sending your diary for analysis... please stay on this page.'
        );
        try {
          const payload: AnalyzeFoodRequestPayload = {
            ...(trimmedText ? { text: trimmedText } : {}),
            ...(imageBase64 ? { imageBase64 } : {}),
          };

          if (selectedFoodId) {
            payload.selectedFoodId = selectedFoodId;
          }

          if (skipExtraction) {
            payload.skipExtraction = true;
          }

          await executeAnalysisRequest(payload);
          updateStatusMessage('Analysis complete!', 4000);
        } catch (error) {
          const message =
            error instanceof Error ? error.message : 'Analyze failed';
          Alert.alert('Error', message);
          updateStatusMessage(null);
        } finally {
          setLoading(false);
        }
        return;
      }

      updateStatusMessage(
        'Extracting meal items... please stay on this page while we work on it.'
      );

      try {
        const extraction = await extractMealAsync({
          text: trimmedText || undefined,
          imageBase64: imageBase64 || undefined,
        });

        const combinedItems: ItemDecision[] = [
          ...(extraction?.FOOD_ITEM ?? []).map(item => ({
            original: item.name,
            portion: item.portion ?? null,
            modifiers: item.modifiers ?? [],
            type: 'food' as const,
          })),
          ...(extraction?.DRINK_ITEM ?? []).map(item => ({
            original: item.name,
            portion: item.portion ?? null,
            modifiers: item.modifiers ?? [],
            type: 'drink' as const,
          })),
        ].filter(entry => entry.original.trim().length > 0);

        if (combinedItems.length === 0) {
          if (trimmedText) {
            updateStatusMessage(
              'Analyzing diary text... please stay on this page.'
            );
            try {
              await executeAnalysisRequest({
                ...(trimmedText ? { text: trimmedText } : {}),
                ...(imageBase64 ? { imageBase64 } : {}),
              });
              updateStatusMessage('Analysis complete!', 4000);
            } catch (error) {
              const message =
                error instanceof Error ? error.message : 'Analyze failed';
              Alert.alert('Error', message);
              updateStatusMessage(null);
            } finally {
              setLoading(false);
            }
          } else {
            Alert.alert(
              'Not recognized',
              'No close match found in the food database.'
            );
            updateStatusMessage(null);
            setLoading(false);
          }
          return;
        }

        const context = {
          text: trimmedText,
          imageBase64,
        };

        updateStatusMessage(
          `We found ${combinedItems.length} item${
            combinedItems.length > 1 ? 's' : ''
          }. Please review them one by one.`
        );

        beginSelectionFlow(combinedItems, context);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Analyze failed';
        Alert.alert('Error', message);
        updateStatusMessage(null);
        setLoading(false);
      }
    },
    [
      text,
      image,
      extractMealAsync,
      executeAnalysisRequest,
      beginSelectionFlow,
      updateStatusMessage,
    ]
  );

  useEffect(() => {
    analyzeRef.current = analyze;
  }, [analyze]);

  useEffect(() => {
    return () => {
      if (statusTimeoutRef.current) {
        clearTimeout(statusTimeoutRef.current);
      }
    };
  }, []);

  // Refresh meal items on focus and ensure a fresh meal each day
  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      setPreparingMeal(true);

      const run = async () => {
        try {
          const result = await refetchMealItems({ throwOnError: false });
          if (result.error) {
            console.error('Failed to refresh meal items', result.error);
            Alert.alert(
              'Meal update failed',
              "We could not refresh today's meal. Please try again."
            );
          }
        } catch (error) {
          console.error('Failed to refresh meal items', error);
          Alert.alert(
            'Meal update failed',
            "We could not refresh today's meal. Please try again."
          );
        } finally {
          if (isActive) {
            setPreparingMeal(false);
          }
        }
      };

      void run();

      return () => {
        isActive = false;
      };
    }, [refetchMealItems])
  );

  // Helpers
  function reset() {
    setText('');
    setImage(null);
    updateStatusMessage(null);
    setSelectionVisible(false);
    setItemDecisions([]);
    itemDecisionsRef.current = [];
    suggestionCacheRef.current.clear();
    fetchingSuggestionsRef.current.clear();
    currentItemIndexRef.current = 0;
    setCurrentItemSuggestions([]);
    setIsSuggestionLoading(false);
    analysisContextRef.current = null;
  }

  const canSubmit = !!text.trim() || !!image?.base64;
  const totalMealEnergyKcal = useMemo(
    () =>
      mealItems.reduce((sum, item) => {
        const total = getMealItemNutrientTotal(item, 'energy_kcal');
        return sum + (total ?? 0);
      }, 0),
    [mealItems]
  );

  const cardEnergyKcal = totalMealEnergyKcal;
  const tagsForCard: string[] = [];
  const shouldShowAnalysisCard = cardEnergyKcal > 0;
  const showClearButton = Boolean(text || image);
  const totalItems = itemDecisions.length;
  const currentItem =
    totalItems > 0
      ? itemDecisions[Math.min(currentItemIndex, totalItems - 1)]
      : null;

  return (
    <View style={styles.container}>
      {preparingMeal ? (
        <View style={styles.preparingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.preparingText}>
            Preparing today&apos;s meal...
          </Text>
        </View>
      ) : null}
      {statusMessage ? (
        <View style={styles.toastContainer}>
          <Text style={styles.toastText}>{statusMessage}</Text>
        </View>
      ) : null}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headingRow}>
          <Text style={styles.headingText}>
            Hello, what did you have today?
          </Text>
          <TouchableOpacity
            style={[
              styles.historyButton,
              (preparingMeal || loading) && styles.historyButtonDisabled,
            ]}
            disabled={preparingMeal || loading}
            onPress={() => navigation.navigate('FoodDiaryHistory' as never)}
          >
            <Text style={styles.historyButtonText}>History</Text>
          </TouchableOpacity>
        </View>

        <TextInput
          placeholder="e.g. I had some Roti canai and a cup of teh tarik"
          value={text}
          onChangeText={setText}
          style={styles.diaryInput}
          multiline
          placeholderTextColor={colors.neutral[500]}
        />

        <View style={styles.actionsRow}>
          <TouchableOpacity onPress={pickImage} style={styles.actionButton}>
            <Text style={styles.actionButtonText}>
              {image ? 'Change photo' : 'Add photo'}
            </Text>
          </TouchableOpacity>

          {image ? (
            <TouchableOpacity onPress={removeImage} style={styles.actionButton}>
              <Text style={styles.actionButtonText}>REMOVE IMAGE</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {image ? (
          <Image
            source={{ uri: image.uri }}
            style={styles.imagePreview}
            resizeMode="cover"
          />
        ) : null}

        <TouchableOpacity
          onPress={() => analyze()}
          disabled={!canSubmit || loading}
          style={[
            styles.analyzeButton,
            {
              backgroundColor:
                !canSubmit || loading ? colors.neutral[300] : colors.primary,
              opacity: loading ? 0.85 : 1,
            },
          ]}
        >
          <Text style={styles.analyzeButtonText}>
            {loading ? 'ANALYZING...' : 'ANALYZE'}
          </Text>
        </TouchableOpacity>

        {loading ? (
          <ActivityIndicator size="large" style={styles.loadingIndicator} />
        ) : null}

        <View style={{ marginTop: spacing.md }}>
          <ThisMealCard />
        </View>

        {shouldShowAnalysisCard ? (
          <View style={{ marginTop: spacing.md }}>
            <AnalysisCard
              energyKcal={cardEnergyKcal}
              tags={tagsForCard}
              onPressDetails={() =>
                navigation.navigate('NutritionDetail' as never)
              }
            />
          </View>
        ) : null}

        {showClearButton ? (
          <TouchableOpacity onPress={reset} style={styles.clearButton}>
            <Text style={styles.clearButtonText}>CLEAR</Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>

      <FoodItemSelectionModal
        visible={selectionVisible}
        totalItems={totalItems}
        currentIndex={currentItemIndex}
        itemType={currentItem?.type ?? null}
        itemName={currentItem?.original ?? null}
        suggestions={currentItemSuggestions}
        loading={isSuggestionLoading}
        onSelectSuggestion={handleSelectCurrentSuggestion}
        onSkip={handleSkipCurrentItem}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral[50],
    position: 'relative',
  },
  preparingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  preparingText: {
    marginTop: spacing.sm,
    color: colors.neutral[700],
    fontWeight: '600',
    fontSize: fontSize.base,
  },
  toastContainer: {
    position: 'absolute',
    top: spacing.lg,
    left: spacing.md,
    right: spacing.md,
    backgroundColor: colors.neutral[900],
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    zIndex: 999,
    elevation: 4,
    opacity: 0.95,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },
  toastText: {
    color: colors.white,
    fontWeight: '600',
    textAlign: 'center',
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  headingText: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    flex: 1,
  },
  historyButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    backgroundColor: colors.neutral[800],
  },
  historyButtonDisabled: {
    backgroundColor: colors.neutral[300],
  },
  historyButtonText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  diaryInput: {
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    backgroundColor: colors.white,
    minHeight: 160,
    textAlignVertical: 'top',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
    backgroundColor: colors.white,
    borderColor: colors.primary,
    borderWidth: 1.4,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: colors.primary,
  },
  imagePreview: {
    width: '100%',
    height: 220,
    borderRadius: borderRadius.md,
    backgroundColor: colors.neutral[100],
  },
  analyzeButton: {
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  analyzeButtonText: {
    color: colors.white,
    fontWeight: '600',
    fontSize: fontSize.base,
  },
  loadingIndicator: {
    marginTop: spacing.sm,
  },
  clearButton: {
    marginTop: spacing.sm,
    backgroundColor: colors.white,
    borderColor: colors.primary,
    borderWidth: 1.4,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  clearButtonText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: fontSize.base,
  },
});
