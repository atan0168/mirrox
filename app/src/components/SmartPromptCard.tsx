import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { Button } from '@/components/Button'; // Use your existing Button component
import AsyncStorage from '@react-native-async-storage/async-storage';

// ✅ Use the centralized axios instance
import { backendApiService } from '../services/BackendApiService';

const COOLDOWN_KEY = 'smart_prompt_cooldown'; // Key for local cooldown storage

export default function SmartPromptCard() {
  const [sug, setSug] = useState<any>(null);

  useEffect(() => {
    (async () => {
      // --- 1) Check cooldown before making a request ---
      const cool = await AsyncStorage.getItem(COOLDOWN_KEY);
      if (cool) {
        const until = Number(cool);
        if (Date.now() < until) return; // still cooling down → skip
      }

      // --- 2) Call backend for predictive suggestion ---
      const now = Date.now();

      try {
        // Using axios instead of fetch
        const { data: j } = await backendApiService['axiosInstance'].get(
          '/personalization/predict',
          { params: { now } }
        );

        if (j?.ok && j.ask && j.suggestion) {
          setSug(j.suggestion); // update state with suggestion
        }
      } catch (err) {
        console.error('Failed to fetch suggestion:', err);
      }
    })();
  }, []);

  if (!sug) return null; // If no suggestion, render nothing

  // --- Handle user accepting the suggestion ---
  const onYes = async () => {
    try {
      // Send meal event to backend
      await backendApiService['axiosInstance'].post(
        '/personalization/meal-event',
        {
          food_id: sug.key?.startsWith('myfcd:') ? sug.key : null,
          food_name: sug.name,
          source: 'predict_yes',
        }
      );

      // Set 24h cooldown after acceptance
      await AsyncStorage.setItem(
        COOLDOWN_KEY,
        String(Date.now() + 24 * 60 * 60 * 1000)
      );

      setSug(null);
      toast('Logged for you'); // TODO: replace with your toast system
    } catch (err) {
      console.error('Failed to log meal event:', err);
    }
  };

  // --- Handle user rejecting the suggestion ---
  const onNo = async () => {
    // Set 6h cooldown after rejection
    await AsyncStorage.setItem(
      COOLDOWN_KEY,
      String(Date.now() + 6 * 60 * 60 * 1000)
    );
    setSug(null);
  };

  return (
    <View className="bg-white rounded-2xl p-4 shadow">
      <Text className="text-lg font-medium">
        Good morning! Same {sug.name} today?
      </Text>
      <View className="flex-row gap-3 mt-3">
        <Button onPress={onYes}>Yes</Button>
        <Button variant="outline" onPress={onNo}>
          No
        </Button>
      </View>
    </View>
  );
}
