// app/src/screens/FoodDiaryScreen.tsx
import { useNavigation, useFocusEffect } from '@react-navigation/native'; 
import React, { useState, useEffect } from 'react';
import { useMeal } from '../hooks/useMeal';
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

import AnalysisCard from '../components/AnalysisCard';
import ThisMealCard from '../components/ThisMealCard';

// Helpers
import { expandUserPhrases } from '../utils/expandUserPhrases';
import { confirmAsync } from '../utils/confirmAsync';


import { colors, spacing, borderRadius, fontSize } from '../theme';

const API_BASE = process.env.EXPO_PUBLIC_API_BASE!;

// --- Local types ---
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
  avatar_effects?: {
    meter: 'fiber' | 'sugar' | 'fat' | 'sodium';
    delta: number;
    reason?: string;
  }[];
  tips?: string[];
};

export default function FoodDiaryScreen() {
  const [text, setText] = useState('');
  const [image, setImage] = useState<{ uri: string; base64?: string } | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AnalyzeData | null>(null);
  const navigation = useNavigation<any>();

  // Global stores
  const setLastAnalysis = useMealStore(s => s.setLastAnalysis);
  const applyEffects = useAvatarStore(s => s.applyEffects);

  // Store methods for meal flow
  const appendFromAnalysis = useMealStore(s => s.appendFromAnalysis);
  const reloadMealItems = useMealStore(s => s.reloadItems);
  const finishMeal = useMealStore(s => s.finishMeal);

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
  const { quickLog } = useMeal(); 


  /**
   * Main analyze flow:
   * 1) Expand colloquial phrases on client
   * 2) Call /ai/extract
   * 3) If nothing recognized → search candidate → confirm → save to dict → re-run
   * 4) Call /food/analyze for nutrition + avatar effects
   * 5) Append recognized items to "This meal"
   */
  async function analyze() {
    try {
      if (!text.trim() && !image?.base64) {
        return Alert.alert('Input required', 'Enter text or pick an image.');
      }
      setLoading(true);
      setAnalysis(null);

      // 1) Expand user phrases
      const expanded = await expandUserPhrases(text.trim());

      // 2) Entity extraction
      const extractRes = await fetch(`${API_BASE}/ai/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: expanded || undefined,
          imageBase64: image?.base64 || undefined,
        }),
      });
      const extractJson = await extractRes.json();
      if (!extractJson.ok)
        throw new Error(extractJson.error || 'Extract failed');

      const ai = extractJson.data;
      const hasEntity =
        (ai?.FOOD_ITEM?.length || 0) + (ai?.DRINK_ITEM?.length || 0) > 0;

      // 3) Fallback → confirm candidate food
      if (!hasEntity && text.trim()) {
        const q = encodeURIComponent(text.trim());
        const searchRes = await fetch(`${API_BASE}/food/search?q=${q}&limit=5`);
        const search = await searchRes.json();

        const list: any[] = Array.isArray(search)
          ? search
          : search?.data || search?.results || [];
        const candidate = list[0];

        if (candidate?.id && candidate?.name) {
          const ok = await confirmAsync(
            `Did you mean “${candidate.name}” for “${text.trim()}”?`
          );
          if (ok) {
            await fetch(`${API_BASE}/personalization/user-dict`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                phrase: text.trim().toLowerCase(),
                canonical_food_id: candidate.id,
                canonical_food_name: candidate.name,
              }),
            });
            Alert.alert('Saved', 'We will remember this next time.');
            return analyze();
          }
        } else {
          Alert.alert(
            'Not recognized',
            'No close match found in the food database.'
          );
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
      if (!json.ok)
        throw new Error(json.error || `Request failed with status ${res.status}`);

      const data: AnalyzeData = json.data;

      // Guard: stop if nothing recognized
      const totalEnergy = Number(data?.nutrients?.total?.energy_kcal);
      const perItemCount =
        (data?.per_item?.length || 0) +
        ((data?.nutrients as any)?.per_item?.length || 0);
      if (perItemCount === 0 && (!Number.isFinite(totalEnergy) || totalEnergy <= 0)) {
        setLoading(false);
        Alert.alert(
          'Nothing recognized',
          'Please try clearer names (e.g., “roti canai, teh tarik”) or sharper receipt photos.'
        );
        return;
      }

      // Ensure source label exists
      if (!data.sources || data.sources.length === 0) {
        data.sources = [
          {
            key: 'myfcd',
            label: 'Malaysia Food Composition Database (MyFCD)',
            url: 'https://myfcd.moh.gov.my',
          },
        ];
      }

      // Backfill per_item
      if (data.per_item && !data.nutrients?.per_item) {
        data.nutrients = data.nutrients ?? ({} as any);
        (data.nutrients as any).per_item = data.per_item;
      }

      setAnalysis(data);
      setLastAnalysis(data);

      // Append recognized items into store
      const perMerged: AnalyzePerItem[] =
        (data.nutrients?.per_item ?? data.per_item ?? []) as AnalyzePerItem[];
      if (perMerged.length > 0) {
        await appendFromAnalysis(
          perMerged.map(p => ({
            name: p.display_name || p.name || p.id || 'Food',
            energy_kcal: p.energy_kcal,
            source: p.source,
          }))
        );
      }

      // Apply avatar effects
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

  
  useEffect(() => {
    let mounted = true;
    async function checkPredictive() {
      try {
        const r = await fetch(
          `${API_BASE}/personalization/predictive-candidate?hour=7&days=35`
        ).then(x => x.json());

        if (!mounted) return;
        if (r?.ok && r.suggest) {
          Alert.alert(
            'Good Morning!',
            `Is it still ${r.name}?`,
            [
              { text: 'NO' },
              {
                text: 'YES',
                onPress: async () => {
                  quickLog.mutate(r.food_id);
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
  const tagsForCard =
    analysis?.tags_display?.length ? analysis.tags_display : (analysis?.tags ?? []);

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.md, gap: spacing.sm }}>
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
          <Text style={{ fontSize: fontSize.md, fontWeight: '600', color: colors.primary }}>
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
            <Text style={{ fontSize: fontSize.md, fontWeight: '600', color: colors.primary }}>
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
          backgroundColor: !canSubmit || loading ? colors.neutral[300] : colors.primary,
          paddingVertical: spacing.md,
          borderRadius: borderRadius.md,
          alignItems: 'center',
          opacity: loading ? 0.8 : 1,
        }}
      >
        <Text style={{ color: colors.white, fontWeight: '600', fontSize: fontSize.md }}>
          {loading ? 'Analyzing...' : 'ANALYZE'}
        </Text>
      </TouchableOpacity>

      {loading && <ActivityIndicator size="large" />}

      <View style={{ marginTop: spacing.md }}>
        <ThisMealCard />
      </View>

      {/* Nutrition summary card */}
      {analysis?.nutrients?.total?.energy_kcal > 0 && (
        <View style={{ marginTop: spacing.md }}>
          <AnalysisCard
            energyKcal={analysis.nutrients.total.energy_kcal}
            tags={tagsForCard}
            onPressDetails={() => navigation.navigate('NutritionDetail' as never)}
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
          <Text style={{ color: colors.primary, fontWeight: '600', fontSize: fontSize.md }}>
            CLEAR
          </Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}
