import React, { useState } from 'react';
import { View, StyleSheet, Text, SafeAreaView } from 'react-native';
import ThreeAvatar from '../components/ThreeAvatar';

export default function AvatarCustomizationScreen() {
  const [skinToneAdjustment, setSkinToneAdjustment] = useState(0);

  const handleSkinToneChange = (value: number) => {
    setSkinToneAdjustment(value);
    console.log(`Skin tone adjusted to: ${value}`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Avatar Customization</Text>
        
        <View style={styles.avatarContainer}>
          <ThreeAvatar
            width={300}
            height={400}
            showSkinToneControls={true}
            skinToneAdjustment={skinToneAdjustment}
            onSkinToneChange={handleSkinToneChange}
            facialExpression="neutral"
          />
        </View>
        
        <View style={styles.infoContainer}>
          <Text style={styles.infoTitle}>Instructions:</Text>
          <Text style={styles.infoText}>
            • Use the skin tone slider to darken or lighten your avatar's skin
          </Text>
          <Text style={styles.infoText}>
            • Negative values make the skin darker
          </Text>
          <Text style={styles.infoText}>
            • Positive values make the skin lighter
          </Text>
          <Text style={styles.currentValue}>
            Current adjustment: {skinToneAdjustment.toFixed(1)}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  infoContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  infoText: {
    fontSize: 14,
    marginBottom: 6,
    color: '#666',
    lineHeight: 20,
  },
  currentValue: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 10,
    color: '#4A90E2',
    textAlign: 'center',
  },
});
