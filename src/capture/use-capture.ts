import { useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { ExpoSpeechRecognitionModule as speech, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { empty, finish, onWords } from './transcript';

type Phase = 'ready' | 'permission' | 'starting' | 'listening' | 'stopping' | 'paused';

export function useCapture() {
  const [phase, setPhase] = useState<Phase>('ready');
  const status = useRef<Phase>('ready');
  const [error, setError] = useState('');
  const words = useRef(empty());
  const [transcript, setTranscript] = useState(words.current);
  const startedAt = useRef(0);
  const [elapsed, setElapsed] = useState(0);
  const mounted = useRef(true);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  function change(next: Phase) {
    status.current = next;
    if (mounted.current) setPhase(next);
  }
  function settle() {
    clearTimeout(timer.current);
    words.current = { final: finish(words.current), partial: null };
    if (mounted.current) {
      setTranscript(words.current);
      setElapsed(startedAt.current ? Date.now() - startedAt.current : 0);
    }
    change('paused');
  }
  function stop() {
    if (!['starting', 'listening'].includes(status.current)) return;
    change('stopping');
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      speech.abort();
      settle();
    }, 2500);
    try { speech.stop(); } catch { speech.abort(); settle(); }
  }
  useSpeechRecognitionEvent('start', () => {
    if (status.current === 'starting') {
      clearTimeout(timer.current);
      change('listening');
    }
  });
  useSpeechRecognitionEvent('result', (event) => {
    if (!['starting', 'listening', 'stopping'].includes(status.current)) return;
    words.current = onWords(words.current, event.results[0]?.transcript ?? '', event.isFinal, Date.now() - startedAt.current);
    setTranscript(words.current);
  });
  useSpeechRecognitionEvent('error', (event) => {
    if (!['starting', 'listening', 'stopping'].includes(status.current)) return;
    setError(event.error === 'not-allowed' ? 'Microphone or speech access is off. Allow access in Settings, then try again.'
      : event.error === 'no-speech' ? 'No speech was detected. Move the phone closer and try again.'
      : 'The speech service stopped (' + event.error + '). Check the device’s speech settings and try again.');
    settle();
  });
  useSpeechRecognitionEvent('end', () => {
    if (['starting', 'listening', 'stopping'].includes(status.current)) settle();
  });
  useEffect(() => {
    mounted.current = true;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'background') stop();
    });
    return () => {
      mounted.current = false;
      subscription.remove();
      clearTimeout(timer.current);
      if (['starting', 'listening', 'stopping'].includes(status.current)) speech.abort();
    };
  }, []);
  useEffect(() => {
    if (phase !== 'listening') return;
    const id = setInterval(() => setElapsed(Date.now() - startedAt.current), 1000);
    return () => clearInterval(id);
  }, [phase]);

  async function start(consent: boolean) {
    if (!consent || !['ready', 'paused'].includes(status.current)) return;
    setError('');
    change('permission');
    try {
      if (!speech.isRecognitionAvailable()) throw new Error('Speech recognition is unavailable. Enable a speech service on this device, or try another device.');
      const permission = await speech.requestPermissionsAsync();
      if (!mounted.current) return;
      if (!permission.granted) throw new Error('Allow microphone and speech access in Settings, then try again.');
      if (AppState.currentState === 'background') throw new Error('Return to the app and start captions again.');
      if (!startedAt.current) startedAt.current = Date.now();
      change('starting');
      timer.current = setTimeout(() => {
        speech.abort();
        setError('The microphone did not start. Check permissions and try again.');
        settle();
      }, 12000);
      speech.start({
        lang: 'en-US', interimResults: true,
        continuous: Platform.OS !== 'android' || Number(Platform.Version) >= 33,
        recordingOptions: { persist: false },
        volumeChangeEventOptions: { enabled: Platform.OS !== 'web', intervalMillis: 120 },
      });
    } catch (cause) {
      if (!mounted.current) return;
      clearTimeout(timer.current);
      setError(cause instanceof Error ? cause.message : 'Unable to start the microphone. Please try again.');
      change(startedAt.current ? 'paused' : 'ready');
    }
  }
  return { phase, error, transcript, elapsed, startedAt, start, stop };
}
