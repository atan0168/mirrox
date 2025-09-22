import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useMealStore } from '../store/mealStore';

import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App'; 

const TAG_LABEL: Record<string, string> = {
  high_sugar: 'High Sugar',
  high_fat: 'High Fat',
  low_fiber: 'Low Fiber',
  high_sodium: 'High Sodium',
  unbalanced: 'Unbalanced',
};

export function NutritionSummaryCard() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const last = useMealStore((s) => s.lastAnalysis);

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
              tags.map((t) => (
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
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 16, padding: 16,
    backgroundColor: 'white', marginTop: 16,
  },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 16, fontWeight: '600' },
  link: { color: '#10B981', fontWeight: '600' },
  energy: { fontSize: 24, fontWeight: '700', marginTop: 8 },
  tagWrap: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 9999, borderWidth: 1, borderColor: '#E5E7EB', marginRight: 8, marginBottom: 8 },
  chipText: { fontSize: 12 },
  muted: { color: '#6B7280' },
});
