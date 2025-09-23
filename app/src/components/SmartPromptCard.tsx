import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { Button } from '@/components/Button'; // Use your existing Button component
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import API_BASE from constants
import { API_BASE } from '../constants';


const USER_ID = 'local-user-001'; // TODO: replace with real user id
const COOLDOWN_KEY = 'smart_prompt_cooldown'; // cooldown key for local storage

export default function SmartPromptCard() {
  const [sug, setSug] = useState<any>(null);

  useEffect(() => {
    (async () => {
      // --- 1) Check cooldown ---
      const cool = await AsyncStorage.getItem(COOLDOWN_KEY);
      if (cool) {
        const until = Number(cool);
        if (Date.now() < until) return; // still cooling down → skip
      }

      // --- 2) Ask backend for predictive suggestion ---
      const now = Date.now();
      const j = await fetch(
        `${API_BASE}/personalization/predict?user_id=${USER_ID}&now=${now}`
      ).then(r => r.json());

      if (j?.ok && j.ask && j.suggestion) {
        setSug(j.suggestion); // show suggestion card
      }
    })();
  }, []);

  if (!sug) return null; // no suggestion → render nothing

  // --- Handle user accepting the suggestion ---
  const onYes = async () => {
    await fetch(`${API_BASE}/personalization/meal-event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: USER_ID,
        food_id: sug.key?.startsWith('myfcd:') ? sug.key : null,
        food_name: sug.name,
        source: 'predict_yes',
      }),
    });

    // set 24h cooldown after acceptance
    await AsyncStorage.setItem(
      COOLDOWN_KEY,
      String(Date.now() + 24 * 60 * 60 * 1000)
    );

    setSug(null);
    toast('Logged for you'); // TODO: replace with your toast system
  };

  // --- Handle user rejecting the suggestion ---
  const onNo = async () => {
    // set 6h cooldown after rejection
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
