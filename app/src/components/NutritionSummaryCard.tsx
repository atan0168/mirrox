import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useMealStore } from '../store/mealStore';
import { TAG_LABEL } from '../constants';

import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { colors } from '../theme/colors';
import { spacing, borderRadius, fontSize } from '../theme/layout';

export function NutritionSummaryCard() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const last = useMealStore(s => s.lastAnalysis);

  const energyNum = Math.round(last?.nutrients?.total?.energy_kcal ?? 0);
  const energy = energyNum > 0 ? `${energyNum} kcal` : 'N/A';
  const tags = (last?.tags ?? []).slice(0, 2);
  const onPress = () => {
    if (last) {
      navigation.navigate('NutritionDetail');
    } else {
      navigation.navigate('MainTabs', { screen: 'FoodDiary' });
    }
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
      <View style={styles.rowBetween}>
        <Text style={styles.title}>Nutrition</Text>

        <Text style={styles.link}>{last ? 'View' : 'Analyze'}</Text>
      </View>

      {last ? (
        <>
          <Text style={styles.energy}>{energy}</Text>

          <View style={styles.tagWrap}>
            {tags.length === 0 ? (
              <Text style={styles.muted}>No tags</Text>
            ) : (
              tags.map(t => (
                <View key={t} style={styles.chip}>
                  <Text style={styles.chipText}>{TAG_LABEL[t] || t}</Text>
                </View>
              ))
            )}
          </View>
        </>
      ) : (
        <Text style={styles.muted}>No meals analyzed yet</Text>
      )}
    </TouchableOpacity>
  );
}
const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: colors.divider, // ✅ from theme
    borderRadius: borderRadius.xl, // ✅ from theme
    padding: spacing.md, // ✅ from theme
    backgroundColor: colors.white,
    marginTop: spacing.md, // ✅ from theme
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: { fontSize: fontSize.base, fontWeight: '600', color: colors.primary }, // ✅ from theme
  link: { color: colors.green[500], fontWeight: '600' }, // ✅ from theme
  energy: { fontSize: fontSize.xxl, fontWeight: '700', marginTop: spacing.sm }, // ✅ from theme
  tagWrap: { flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.sm },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.divider,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  chipText: { fontSize: fontSize.xs },
  muted: { color: colors.neutral[500] }, // ✅ from theme
});
