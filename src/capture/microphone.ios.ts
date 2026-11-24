import { ExpoSpeechRecognitionModule as speech } from 'expo-speech-recognition';
import type { MicrophoneInput, PreparedMicrophone } from './microphone-types';

const router = speech as typeof speech & {
  listCompanionInputsIOS?: () => MicrophoneInput[];
  getCompanionInputIOS?: () => MicrophoneInput | null;
};

export function canChooseMicrophone() { return typeof router.listCompanionInputsIOS === 'function'; }
export async function listMicrophones() {
  if (!router.listCompanionInputsIOS) return [];
  const permission = await speech.requestMicrophonePermissionsAsync();
  if (!permission.granted) throw new Error('Allow microphone access in iPhone Settings to list microphones.');
  return router.listCompanionInputsIOS();
}
export function activeMicrophone() { return router.getCompanionInputIOS?.() ?? undefined; }
export async function prepareMicrophone(id: string | null, _onDisconnect: () => void): Promise<PreparedMicrophone> {
  if (id !== null && !canChooseMicrophone()) throw new Error('Rebuild the iPhone app or choose System default.');
  return { options: id === null ? {} : { companionInputUID: id } };
}
