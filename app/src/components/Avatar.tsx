import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import Svg, { Ellipse, Circle, Path, Rect } from 'react-native-svg';
import { AvatarProps } from '../models/Avatar';

const Avatar: React.FC<AvatarProps> = ({ head, eyes, body }) => {
  // Simple emoji-based avatar for now - we can enhance this later
  const getAvatarEmoji = () => {
    if (eyes === 'tired') return '😴';
    if (eyes === 'happy') return '😊';
    return '😐';
  };

  const getBodyEmoji = () => {
    return '👕'; // Simple body representation
  };

  return (
    <View style={styles.container}>
      <View style={styles.avatarContainer}>
        <Text style={styles.emoji}>{getAvatarEmoji()}</Text>
        <Text style={styles.bodyEmoji}>{getBodyEmoji()}</Text>
      </View>
      
      {/* Future SVG implementation */}
      {/* 
      <View style={styles.svgContainer}>
        <Svg width={150} height={250} viewBox="0 0 150 250">
          <Rect x="25" y="120" width="100" height="130" rx="20" fill="#E3F2FD" stroke="#2196F3" strokeWidth="2"/>
          <Ellipse cx="75" cy="50" rx="40" ry="50" fill="#FDBCB4" stroke="#E1B8A5" strokeWidth="2"/>
        </Svg>
      </View>
      */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    width: 150, 
    height: 250, 
    alignItems: 'center', 
    justifyContent: 'center',
  },
  avatarContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 80,
    marginBottom: 10,
  },
  bodyEmoji: {
    fontSize: 40,
  },
  svgContainer: {
    // For future SVG implementation
  },
});

export default Avatar;
