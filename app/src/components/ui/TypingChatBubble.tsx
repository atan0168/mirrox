import React, { useEffect, useState } from 'react';
import {
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';

interface TypingChatBubbleProps {
  text: string;
  isVisible: boolean;
  typingSpeed?: number;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

const DEFAULT_TYPING_SPEED_MS = 40;

const TypingChatBubble: React.FC<TypingChatBubbleProps> = ({
  text,
  isVisible,
  typingSpeed = DEFAULT_TYPING_SPEED_MS,
  style,
  textStyle,
}) => {
  const [displayedText, setDisplayedText] = useState('');

  useEffect(() => {
    if (!isVisible) {
      setDisplayedText('');
      return;
    }

    let currentIndex = 0;
    setDisplayedText('');

    const safeSpeed = Math.max(typingSpeed, 20);
    const intervalId = setInterval(() => {
      currentIndex += 1;
      setDisplayedText(text.slice(0, currentIndex));

      if (currentIndex >= text.length) {
        clearInterval(intervalId);
      }
    }, safeSpeed);

    return () => {
      clearInterval(intervalId);
    };
  }, [isVisible, text, typingSpeed]);

  if (!isVisible) {
    return null;
  }

  const isTyping = displayedText.length < text.length;

  return (
    <View style={[styles.container, style]}>
      <Text style={[styles.text, textStyle]}>
        {displayedText}
        {isTyping ? <Text style={styles.cursor}>|</Text> : null}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(20, 24, 33, 0.92)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
  },
  text: {
    textAlign: 'center',
    color: '#F8FAFC',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  cursor: {
    color: '#F8FAFC',
  },
});

export default TypingChatBubble;
