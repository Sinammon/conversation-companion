import { AppState, StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import Animated, { cancelAnimation, Easing, ReduceMotion, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useEffect, useState } from 'react';

export function Lights({ paused }: { paused: boolean }) {
  const { width } = useWindowDimensions();
  const [foreground, setForeground] = useState(AppState.currentState === 'active' || AppState.currentState === null);
  const shift = useSharedValue(0);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => setForeground(state === 'active'));
    return () => subscription.remove();
  }, []);
  useEffect(() => {
    if (paused || !foreground) return;
    shift.set(withRepeat(withTiming(1, { duration: 21000, easing: Easing.inOut(Easing.sin) }), -1, true, undefined, ReduceMotion.System));
    return () => cancelAnimation(shift);
  }, [foreground, paused, shift]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: width * .18 * shift.get() }] }));
  return <View pointerEvents="none" aria-hidden style={[StyleSheet.absoluteFill, { overflow: 'hidden', backgroundColor: '#203049' }]}>
    <Animated.View style={[{ position: 'absolute', top: 0, bottom: 0, left: -width * .25, right: -width * .25 }, style]}>
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id="lights" x1="0%" y1="20%" x2="100%" y2="55%">
            {['#213149','#343E67','#535782','#355D71','#25374F','#26354D','#484977','#406575','#263B52','#22334A'].map((color, i) =>
              <Stop key={i} offset={i / 9} stopColor={color} />)}
          </LinearGradient>
          <LinearGradient id="shade" x2="0%" y2="100%">
            <Stop offset="0" stopColor="#18283E" stopOpacity="0" /><Stop offset="1" stopColor="#18283E" stopOpacity=".65" />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#lights)" /><Rect width="100%" height="100%" fill="url(#shade)" />
      </Svg>
    </Animated.View>
  </View>;
}
