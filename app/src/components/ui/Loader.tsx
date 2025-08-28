import { useEffect, useRef } from 'react';
import { View, Animated, Easing } from 'react-native';
import { Loader2 } from 'lucide-react-native';
import { colors } from '../../theme';

export default function SpinningLoader() {
  const spinAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 1000, // 1 second per rotation
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();

    return () => loop.stop();
  }, [spinAnim]);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={{ transform: [{ rotate: spin }] }}>
        <Loader2 size={48} color={colors.neutral[600]} />
      </Animated.View>
    </View>
  );
}
