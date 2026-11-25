import { Platform, StyleSheet, View } from 'react-native';
import { useSpeechRecognitionEvent } from '../capture/use-speech-event';
import Animated, { Easing, ReduceMotion, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { normalizeRecordingLevel } from '../capture/recording-level';
import { c } from './ui';

const bars = [0.3, 0.65, 0.48, 0.85, 1, 0.68, 0.93, 0.52, 0.73, 0.35];

function MeterBar({ level, height }: { level: SharedValue<number>; height: number }) {
  const pulse = useAnimatedStyle(() => ({
    transform: [{ scaleY: 0.16 + 0.84 * level.get() * height }],
  }));
  return <Animated.View style={[styles.bar, pulse]} />;
}

export function RecordingMeter({ listening }: { listening: boolean }) {
  const reduceMotion = useReducedMotion();
  return <View aria-hidden importantForAccessibility="no-hide-descendants" pointerEvents="none" style={styles.meter}>
    {listening && !reduceMotion && Platform.OS !== 'web' ? <LiveMeter /> :
      bars.map((height, index) => <View key={index} style={[styles.bar, { height: listening ? 6 + height * 11 : 4,
        backgroundColor: listening ? c.record : c.line }]} />)}
  </View>;
}

function LiveMeter() {
  const level = useSharedValue(0);
  useSpeechRecognitionEvent('volumechange', event => {
    level.set(withTiming(normalizeRecordingLevel(event.value), {
      duration: 130, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.System,
    }));
  });
  return bars.map((height, index) => <MeterBar key={index} level={level} height={height} />);
}

const styles = StyleSheet.create({
  meter: { flexDirection: 'row', alignItems: 'center', gap: 3, height: 29 },
  bar: { width: 3, height: 25, borderRadius: 2, backgroundColor: c.record },
});
