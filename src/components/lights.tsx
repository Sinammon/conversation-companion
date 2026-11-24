import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import Animated, { Easing, ReduceMotion, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useEffect } from 'react';

export function Lights() {
  const shift = useSharedValue(0);
  useEffect(() => { shift.set(withRepeat(withTiming(24, { duration: 16000, easing: Easing.inOut(Easing.sin) }), -1, true, undefined, ReduceMotion.System)); }, [shift]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: shift.get() }] }));
  return <View pointerEvents="none" aria-hidden style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}>
    <Animated.View style={[{ position: 'absolute', inset: -30 }, style]}><Svg width="100%" height="100%">
      <Defs><LinearGradient id="lights" x1="0" y1="0" x2="100%" y2="100%">
        <Stop offset="0" stopColor="#394665" /><Stop offset=".24" stopColor="#26374F" />
        <Stop offset=".48" stopColor="#343651" /><Stop offset=".72" stopColor="#1D3747" /><Stop offset="1" stopColor="#17263B" />
      </LinearGradient></Defs><Rect width="100%" height="100%" fill="url(#lights)" />
    </Svg></Animated.View></View>;
}
