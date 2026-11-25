import { requireOptionalNativeModule } from 'expo';
import { resolveSpeech } from './speech-availability';

type SpeechPackage = typeof import('expo-speech-recognition');

// The package eagerly requires native bindings at import time. Expo Go omits them.
export const speech = resolveSpeech(
  () => requireOptionalNativeModule('ExpoSpeechRecognition'),
  () => (require('expo-speech-recognition') as SpeechPackage).ExpoSpeechRecognitionModule,
);
