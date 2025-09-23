import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ChevronRight, Info } from 'lucide-react-native'; // Use Lucide icons instead of ASCII symbols

import { TAG_LABEL } from '../constants';


type NutritionCardProps = {
  total?: {
    energy_kcal?: number;
    sugar_g?: number;
    fat_g?: number;
    fiber_g?: number;
    sodium_mg?: number;
  };
  tags?: string[];
  sources?: { key: string; label: string; url?: string }[];
  /** Fired when user taps "See details" */
  onPressDetails?: () => void;
};

export function NutritionCard({
  total,
  tags,
  sources,
  onPressDetails,
}: NutritionCardProps) {
  // Limit tags to 2 for a quick glance
  const topTags = (tags ?? []).slice(0, 2);
  // Use the first source for a short inline hint
  const primarySource = sources?.[0]?.label;

  const detailsDisabled = !onPressDetails;

  return (
    <View className="rounded-2xl p-4 border border-gray-200 mt-12">
      {/* Title: remove "(preview)" per review comment */}
      <Text className="text-lg font-semibold">Nutrition</Text>

      {!total ? (
        <Text className="text-gray-500 mt-1">No meals analyzed yet</Text>
      ) : (
        <>
          {/* Key metric for a quick glance */}
          <Text className="mt-2">
            Energy: {Math.round(total.energy_kcal || 0)} kcal
          </Text>

          {/* Show up to 2 tags */}
          {!!topTags.length && (
            <View className="flex-row flex-wrap mt-2">
              {topTags.map(t => (
                <View
                  key={t}
                  className="px-2 py-1 mr-2 mb-2 rounded-full border border-gray-300"
                >
                  <Text>{TAG_LABEL[t] || t}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Short source hint with an info icon (optional but clearer) */}
          {primarySource && (
            <Text className="text-gray-500 mt-1">Source: {primarySource}</Text>
          )}

          {/* "See details" button: use Lucide ChevronRight instead of ASCII arrow */}
          <TouchableOpacity
            onPress={onPressDetails}
            disabled={detailsDisabled}
            style={{ marginTop: 10, opacity: detailsDisabled ? 0.5 : 1 }}
            accessibilityRole="button"
            accessibilityLabel="See nutrition details"
          >
            <View className="flex-row items-center">
              <Text style={{ color: '#2563EB', fontWeight: '600' }}>
                See details
              </Text>
              <ChevronRight size={18} />
            </View>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}
