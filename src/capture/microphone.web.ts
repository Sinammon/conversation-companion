import type { MicrophoneInput, PreparedMicrophone } from './microphone-types';

export function canChooseMicrophone() {
  if (typeof window === 'undefined' || !window.isSecureContext || !navigator.mediaDevices?.getUserMedia ||
      !navigator.mediaDevices.enumerateDevices) return false;
  const ua = navigator.userAgent;
  const version = Number(ua.match(/Chrome\/(\d+)/)?.[1] ?? 0);
  return version >= 135 && !/Android|iPhone|iPad|iPod|Mobile/.test(ua) &&
    (typeof Reflect.get(window, 'SpeechRecognition') === 'function' ||
      typeof Reflect.get(window, 'webkitSpeechRecognition') === 'function');
}

export async function listMicrophones(): Promise<MicrophoneInput[]> {
  if (!canChooseMicrophone()) return [];
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const devices = (await navigator.mediaDevices.enumerateDevices())
      .filter(device => device.kind === 'audioinput' && device.deviceId && !['default', 'communications'].includes(device.deviceId));
    return devices.map((device, index) => ({ id: device.deviceId, label: device.label || 'Microphone ' + (index + 1) }));
  } catch {
    throw new Error('Allow microphone access in Chrome to list microphones.');
  } finally {
    stream?.getTracks().forEach(track => track.stop());
  }
}

export function activeMicrophone(): MicrophoneInput | undefined { return undefined; }

export async function prepareMicrophone(id: string | null, onDisconnect: () => void): Promise<PreparedMicrophone> {
  if (id === null) return { options: {} };
  if (!canChooseMicrophone()) throw new Error('Choose System default on this browser.');
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: { deviceId: { exact: id } } });
  } catch (error) {
    if (error instanceof DOMException && (error.name === 'NotAllowedError' || error.name === 'SecurityError')) {
      throw new Error('Allow microphone access in Chrome, then try again.');
    }
    throw new Error('The selected microphone is unavailable. Choose a microphone to continue.');
  }
  const track = stream.getAudioTracks()[0];
  if (!track || track.readyState !== 'live' || track.getSettings().deviceId !== id) {
    stream.getTracks().forEach(item => item.stop());
    throw new Error('The selected microphone is unavailable. Choose a microphone to continue.');
  }
  track.addEventListener('ended', onDisconnect);
  return {
    options: { companionAudioTrack: track }, label: track.label,
    release() {
      track.removeEventListener('ended', onDisconnect);
      stream.getTracks().forEach(item => item.stop());
    },
  };
}
