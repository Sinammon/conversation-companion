import { useSpeechRecognitionEvent } from '../capture/use-speech-event';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { normalizeRecordingLevel } from '../capture/recording-level';
import { OrbArt } from './orb-art';

export function Orb({ size, listening = false }: { size: number; listening?: boolean; track?: MediaStreamTrack }) {
  const level = useSharedValue(0);
  const reduced = useReducedMotion();
  useSpeechRecognitionEvent('volumechange', event => {
    level.set(withTiming(normalizeRecordingLevel(event.value), { duration: 120 }));
  }, listening && !reduced);
  const pulse = useAnimatedStyle(() => ({ transform: [{ scale: listening && !reduced ? 1 + level.get() * .12 : 1 }] }));
  return <Animated.View aria-hidden pointerEvents="none" style={pulse}><OrbArt size={size} /></Animated.View>;
}
