import { useEffect, useEffectEvent } from 'react';
import type { ExpoSpeechRecognitionNativeEventMap } from 'expo-speech-recognition';
import { speech } from './speech';

type SpeechListeners = { [K in keyof ExpoSpeechRecognitionNativeEventMap]: (event: ExpoSpeechRecognitionNativeEventMap[K]) => void };

export function useSpeechRecognitionEvent<K extends keyof ExpoSpeechRecognitionNativeEventMap>(
  name: K,
  listener: SpeechListeners[K],
  enabled = true,
) {
  const onEvent = useEffectEvent(listener);
  useEffect(() => {
    if (!enabled) return;
    const subscription = speech?.addListener(name, onEvent);
    return () => subscription?.remove();
  }, [enabled, name]);
}
