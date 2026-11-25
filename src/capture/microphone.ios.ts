import { speech } from './speech';
import type { MicrophoneInput, PreparedMicrophone } from './microphone-types';

const router = speech as (NonNullable<typeof speech> & {
  listCompanionInputsIOS?: () => MicrophoneInput[];
  getCompanionInputIOS?: () => MicrophoneInput | null;
}) | null;

export function canChooseMicrophone() { return typeof router?.listCompanionInputsIOS === 'function'; }
export async function listMicrophones(signal: AbortSignal) {
  if (signal.aborted || !router?.listCompanionInputsIOS) return [];
  const permission = await router.requestMicrophonePermissionsAsync();
  if (signal.aborted) return [];
  if (!permission.granted) throw new Error('Allow microphone access in iPhone Settings to list microphones.');
  return router.listCompanionInputsIOS();
}
export function activeMicrophone() { return router?.getCompanionInputIOS?.() ?? undefined; }
export async function prepareMicrophone(id: string | null, _onDisconnect: () => void): Promise<PreparedMicrophone> {
  if (id !== null && !canChooseMicrophone()) throw new Error('Rebuild the iPhone app or choose System default.');
  return { options: id === null ? {} : { companionInputUID: id } };
}
