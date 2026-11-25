import type { MicrophoneInput, PreparedMicrophone } from './microphone-types';

export function canChooseMicrophone() { return false; }
export async function listMicrophones(_signal: AbortSignal): Promise<MicrophoneInput[]> { return []; }
export function activeMicrophone(): MicrophoneInput | undefined { return undefined; }
export async function prepareMicrophone(id: string | null, _onDisconnect: () => void): Promise<PreparedMicrophone> {
  if (id !== null) throw new Error('Choose System default on this device.');
  return { options: {} };
}
