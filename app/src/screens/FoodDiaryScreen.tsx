// app/src/screens/FoodDiaryScreen.tsx
import { useNavigation, useFocusEffect } from '@react-navigation/native'; // [STEP4-ADD] useFocusEffect for refresh on focus
import React, { useState, useEffect } from 'react';
import {
  View,
  TextInput,
  Text,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import { useMealStore } from '../store/mealStore';
import { useAvatarStore } from '../store/avatarStore';
// Use the new pretty summary card (replaces the old NutritionCard preview)
import AnalysisCard from '../components/AnalysisCard';
import ThisMealCard from '../components/ThisMealCard';

// Personalization helpers
import { expandUserPhrases } from '../utils/expandUserPhrases';
import { confirmAsync } from '../utils/confirmAsync';

const API_BASE = process.env.EXPO_PUBLIC_API_BASE!;
const USER_ID = 'local-user-001'; // TODO: replace with your real user id when auth is ready

// --- Types for local rendering ---
type NutrientsTotal = {
  energy_kcal: number;
  carb_g: number;
  sugar_g: number;
  fat_g: number;
  fiber_g: number;
  sodium_mg: number;
};
type AnalyzeSource = { key: string; label: string; url?: string };
type AnalyzePerItem = {
  id?: string;
  name?: string;
  display_name?: string;
  source?: string;
  confidence?: number;
  energy_kcal?: number | null;
};
type AnalyzeData = {
  nutrients?: { total: NutrientsTotal; per_item?: AnalyzePerItem[] };
  sources?: AnalyzeSource[];
  per_item?: AnalyzePerItem[];
  tags?: string[];
  tags_display?: string[];
  avatar_effects?: { meter: 'fiber' | 'sugar' | 'fat' | 'sodium'; delta: number; reason?: string }[];
  tips?: string[];
};

export default function FoodDiaryScreen() {
  const [text, setText] = useState('');
  const [image, setImage] = useState<{ uri: string; base64?: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AnalyzeData | null>(null);
  const navigation = useNavigation<any>();

  // Global stores
  const setLastAnalysis = useMealStore(s => s.setLastAnalysis);
  const applyEffects = useAvatarStore(s => s.applyEffects);

  // New store methods for step 4
  const appendFromAnalysis = useMealStore(s => s.appendFromAnalysis); // [STEP4-ADD]
  const reloadMealItems   = useMealStore(s => s.reloadItems);         // [STEP4-ADD]
  const finishMeal        = useMealStore(s => s.finishMeal);          // [STEP4-ADD]

  // --- Image picker (keeps base64 for MVP payload) ---
  async function pickImage() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return Alert.alert('Permission', 'Photo library permission is required.');
    const r = await ImagePicker.launchImageLibraryAsync({
      base64: true,
      quality: 0.7,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
    });
    if (!r.canceled) {
      const asset = r.assets[0];
      setImage({
        uri: asset.uri,
        base64: asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : undefined,
      });
    }
  }

  function removeImage() {
    setImage(null);
  }

  // Quick-log: create a meal event immediately when user taps "Yes"
  async function quickLog(food_id: string) {
    await fetch(`${API_BASE}/personalization/meal-event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: USER_ID,
        food_id,
        ts_ms: Date.now(),
        source: 'predict',
      }),
    });
  }

  /**
   * Main analyze flow:
   * 1) Expand colloquial phrases on the client (using user dictionary from backend)
   * 2) Call /ai/extract first (entity extraction only, with user_id)
   * 3) If nothing recognized → search candidate via /food/search → confirm → save to /personalization/user-dict → re-run
   * 4) Call /food/analyze to get nutrition + avatar effects for final rendering
   * 5) Append recognized per_item into "This meal" (appendable list)
   */
  async function analyze() {
    try {
      if (!text.trim() && !image?.base64) {
        return Alert.alert('Input required', 'Enter text or pick an image.');
      }
      setLoading(true);
      setAnalysis(null);

      // 1) Local expansion by user dictionary
      const expanded = await expandUserPhrases(text.trim(), USER_ID);

      // 2) Entity extraction (user_id enables personalization on backend)
      const extractRes = await fetch(`${API_BASE}/ai/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: expanded || undefined,
          imageBase64: image?.base64 || undefined,
          user_id: USER_ID,
        }),
      });
      const extractJson = await extractRes.json();
      if (!extractJson.ok) throw new Error(extractJson.error || 'Extract failed');

      const ai = extractJson.data;
      const hasEntity =
        ((ai?.FOOD_ITEM?.length || 0) + (ai?.DRINK_ITEM?.length || 0)) > 0;

      // Debug logs
      console.log('[debug] extractJson:', extractJson);
      console.log('[debug] hasEntity:', hasEntity);

      // 3) Fallback when nothing recognized
      if (!hasEntity && text.trim()) {
        const q = encodeURIComponent(text.trim());
        const searchRes = await fetch(`${API_BASE}/food/search?q=${q}&limit=5`);
        const search = await searchRes.json();
        console.log('[debug] search response:', search);

        // Normalize possible return shapes
        const list: any[] = Array.isArray(search) ? search : (search?.data || search?.results || []);
        console.log('[debug] candidate list:', list);

        const candidate = list[0]; // Top-1 candidate for minimal UI

        if (candidate?.id && candidate?.name) {
          const ok = await confirmAsync(`你说的“${text.trim()}”是指“${candidate.name}”吗？`);
          if (ok) {
            // Save mapping
            await fetch(`${API_BASE}/personalization/user-dict`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                user_id: USER_ID,
                phrase: text.trim().toLowerCase(),
                canonical_food_id: candidate.id,
                canonical_food_name: candidate.name,
              }),
            });
            Alert.alert('已记住', '下次会自动识别。');
            // Re-run
            return analyze();
          }
        } else {
          Alert.alert('Not recognized', 'No close match found in the food database.');
        }
      }

      // 4) Nutrition + avatar effects
      const res = await fetch(`${API_BASE}/food/analyze?ui_lang=en`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text.trim() || undefined,
          imageBase64: image?.base64 || undefined,
        }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || `Request failed with status ${res.status}`);

      const data: AnalyzeData = json.data;

      // Guard: if nothing meaningful was recognized, inform the user and stop
      const totalEnergy = Number(data?.nutrients?.total?.energy_kcal);
      const perItemA = Array.isArray((data as any)?.per_item) ? (data as any).per_item : [];
      const perItemB = Array.isArray((data?.nutrients as any)?.per_item)
        ? (data?.nutrients as any).per_item
        : [];
      const itemsCount = (perItemA?.length || 0) + (perItemB?.length || 0);
      const nothingRecognized =
        itemsCount === 0 && (!Number.isFinite(totalEnergy) || totalEnergy <= 0);

      if (nothingRecognized) {
        setLoading(false);
        Alert.alert(
          'Nothing recognized',
          'We could not read any food from your input. Please try:\n• Use clear names (e.g., “roti canai, teh tarik”).\n• For photos, use a sharp paper receipt or printed menu with readable text.'
        );
        return;
      }

      // Ensure a formal data source label exists (for downstream screens)
      if (!data.sources || data.sources.length === 0) {
        data.sources = [
          { key: 'myfcd', label: 'Malaysia Food Composition Database (MyFCD)', url: 'https://myfcd.moh.gov.my' },
        ];
      }

      // Backfill per_item into nutrients.per_item when server returns it separately
      if (data.per_item && !data.nutrients?.per_item) {
        data.nutrients = data.nutrients ?? ({} as any);
        (data.nutrients as any).per_item = data.per_item;
      }

      // Local preview on this screen
      setAnalysis(data);

      // Persist to global store (for other screens)
      setLastAnalysis(data);

      // ===== Append recognized per_item into "This meal" =====
      const perMerged: AnalyzePerItem[] = (data.nutrients?.per_item ?? data.per_item ?? []) as AnalyzePerItem[];
      if (perMerged.length > 0) {
        await appendFromAnalysis(
          perMerged.map(p => ({
            name: p.display_name || p.name || p.id || 'Food',
            energy_kcal: p.energy_kcal,
            source: p.source,
          }))
        );
        // appendFromAnalysis will reload items for us
      }

      // Apply avatar meter changes
      if (data.avatar_effects?.length) {
        applyEffects(data.avatar_effects);
      }

      Alert.alert('Done', 'Meal analyzed and applied to Avatar.');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Analyze failed');
    } finally {
      setLoading(false);
    }
  }

  // Predictive suggestion on mount
  useEffect(() => {
    let mounted = true;

    async function checkPredictive() {
      try {
        const r = await fetch(
          `${API_BASE}/personalization/predictive-candidate?user_id=${USER_ID}&hour=7&days=35`
        ).then(x => x.json());

        if (!mounted) return;
        if (r?.ok && r.suggest) {
          Alert.alert(
            'Good Morning!',
            `Is it still ${r.name} ?`,
            [
              { text: 'NO' },
              {
                text: 'YES',
                onPress: async () => {
                  // 1) quick log
                  await quickLog(r.food_id);
                  // 2) reflect in UI and run analysis
                  setText(r.name);
                  await analyze();
                },
              },
            ],
            { cancelable: true }
          );
        }
      } catch (err) {
        console.log('[predictive] error', err);
      }
    }

    checkPredictive();
    return () => {
      mounted = false;
    };
  }, []);

  // [STEP4-ADD] Refresh "This meal" items whenever this screen is focused
  useFocusEffect(
    React.useCallback(() => {
      reloadMealItems?.(); // Safe no-op if there is no current meal
    }, [reloadMealItems])
  );

  // Helpers
  function reset() {
    setText('');
    setImage(null);
    setAnalysis(null);
    // If you also want CLEAR to end current meal, uncomment next line:
    // finishMeal(); // [STEP4-ADD - optional]
  }

  const canSubmit = !!text.trim() || !!image?.base64;

  // Tags priority: use display form if present, otherwise raw keys
  const tagsForCard =
    analysis?.tags_display && analysis.tags_display.length > 0
      ? analysis.tags_display
      : (analysis?.tags ?? []);

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 20, fontWeight: '700' }}>What's on your plate?</Text>

      {/* Input */}
      <Text style={{ fontWeight: '600' }}>Input:</Text>
      <TextInput
        placeholder="e.g. Mamak run - roti canai and teh tarik (kurang manis)"
        value={text}
        onChangeText={setText}
        style={{
          borderWidth: 1,
          borderColor: '#ccc',
          borderRadius: 8,
          padding: 12,
          backgroundColor: '#fff',
        }}
        multiline
      />

      {/* Actions */}
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <TouchableOpacity
          onPress={pickImage}
          style={{
            flex: 1,
            backgroundColor: '#fff',
            borderColor: '#34C759',
            borderWidth: 1.4,
            paddingVertical: 10,
            borderRadius: 8,
            alignItems: 'center',
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#34C759' }}>
            {image ? 'Change photo' : 'Add photo'}
          </Text>
        </TouchableOpacity>

        {image && (
          <TouchableOpacity
            onPress={removeImage}
            style={{
              flex: 1,
              backgroundColor: '#fff',
              borderColor: '#34C759',
              borderWidth: 1.4,
              paddingVertical: 10,
              borderRadius: 8,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: '#34C759', fontWeight: '700' }}>REMOVE IMAGE</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Tiny capability hint under actions */}
      <View style={{ marginTop: 4 }}>
        <Text style={{ fontSize: 12, color: '#6B7280' }}>
          Only receipt or menu photos are supported for image analysis.
        </Text>
      </View>

      {/* Image preview */}
      {image && (
        <Image
          source={{ uri: image.uri }}
          style={{ width: '100%', height: 220, borderRadius: 8, backgroundColor: '#f4f4f5' }}
          resizeMode="cover"
        />
      )}

      {/* Analyze */}
      <TouchableOpacity
        onPress={analyze}
        disabled={!canSubmit || loading}
        style={{
          backgroundColor: !canSubmit || loading ? '#A7F3D0' : '#34C759',
          paddingVertical: 12,
          borderRadius: 8,
          alignItems: 'center',
          opacity: loading ? 0.8 : 1,
        }}
      >
        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>
          {loading ? 'Analyzing...' : 'ANALYZE'}
        </Text>
      </TouchableOpacity>

      {loading && <ActivityIndicator size="large" />}

      {/* This meal list (append/delete UI) */}
      <View style={{ marginTop: 12 }}>
        <ThisMealCard />
      </View>

      {/* Finish meal action (close & clear current meal) */}
      <View style={{ marginTop: 8 }}>
        <TouchableOpacity
          onPress={() => {
            Alert.alert(
              'Finish this meal?',
              'This will close and clear the current meal items.',
              [
                { text: 'Cancel' },
                {
                  text: 'Finish',
                  style: 'destructive',
                  onPress: async () => {
                    await finishMeal();
                    setAnalysis(null); // Keep the screen clean after finishing
                  },
                },
              ]
            );
          }}
          style={{
            alignSelf: 'flex-start',
            paddingVertical: 10,
            paddingHorizontal: 12,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: '#E5E7EB',
            backgroundColor: '#FFFFFF',
          }}
        >
          <Text style={{ fontWeight: '700', color: '#111827' }}>Finish meal</Text>
        </TouchableOpacity>
      </View>

      {/* Local analysis preview (render only when energy > 0 to avoid "0 kcal" cards) */}
      {analysis?.nutrients?.total?.energy_kcal > 0 && (
        <View style={{ marginTop: 16 }}>
          <AnalysisCard
            energyKcal={analysis.nutrients.total.energy_kcal}
            tags={tagsForCard}
            onPressDetails={() => navigation.navigate('NutritionDetail' as never)}
          />
        </View>
      )}

      {/* Clear */}
      {(text || image || analysis) && (
        <TouchableOpacity
          onPress={reset}
          style={{
            marginTop: 12,
            backgroundColor: '#fff',
            borderColor: '#34C759',
            borderWidth: 1.4,
            paddingVertical: 10,
            borderRadius: 8,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: '#34C759', fontWeight: '700', fontSize: 16 }}>CLEAR</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}
