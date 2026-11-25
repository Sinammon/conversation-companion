import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { speech } from './speech';
import { useSpeechRecognitionEvent } from './use-speech-event';
import { empty, finish, onWords } from './transcript';
import { activeMicrophone, prepareMicrophone } from './microphone';
import type { MicrophoneInput, PreparedMicrophone } from './microphone-types';

type Phase = 'ready' | 'permission' | 'starting' | 'listening' | 'stopping' | 'paused';

export function useCapture() {
  const [phase, setPhase] = useState<Phase>('ready');
  const status = useRef<Phase>('ready');
  const [error, setError] = useState('');
  const words = useRef(empty());
  const [transcript, setTranscript] = useState(words.current);
  const finalsAtStop = useRef(words.current.final);
  const startedAt = useRef(0);
  const [elapsed, setElapsed] = useState(0);
  const mounted = useRef(true);
  const afterStart = useRef<(() => void) | undefined>(undefined);
  const attempt = useRef(0);
  const microphone = useRef<PreparedMicrophone | undefined>(undefined);
  const chosen = useRef<MicrophoneInput | null>(null);
  const [inputInUse, setInputInUse] = useState('');
  const [needsMicrophoneChoice, setNeedsMicrophoneChoice] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  function change(next: Phase) {
    status.current = next;
    if (mounted.current) setPhase(next);
  }
  function settle() {
    clearTimeout(timer.current);
    releaseMicrophone();
    finalsAtStop.current = words.current.final;
    words.current = { final: finish(words.current), partial: null };
    if (mounted.current) {
      setTranscript(words.current);
      setElapsed(startedAt.current ? Date.now() - startedAt.current : 0);
    }
    change('paused');
  }
  function releaseMicrophone() {
    microphone.current?.release?.();
    microphone.current = undefined;
  }
  function stop() {
    if (status.current === 'permission') {
      attempt.current++;
      change(startedAt.current ? 'paused' : 'ready');
      return;
    }
    if (!['starting', 'listening'].includes(status.current)) return;
    change('stopping');
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      speech?.abort();
      settle();
    }, 2500);
    try { speech?.stop(); } catch { speech?.abort(); settle(); }
  }
  useSpeechRecognitionEvent('start', () => {
    if (status.current === 'starting') {
      clearTimeout(timer.current);
      setInputInUse(activeMicrophone()?.label || microphone.current?.label ||
        (microphone.current?.options.companionAudioTrack ? chosen.current?.label : undefined) || 'System microphone');
      change('listening');
      afterStart.current?.();
      afterStart.current = undefined;
    }
  });
  useSpeechRecognitionEvent('result', (event) => {
    if (!['starting', 'listening', 'stopping'].includes(status.current)) return;
    words.current = onWords(words.current, event.results[0]?.transcript ?? '', event.isFinal, Date.now() - startedAt.current);
    setTranscript(words.current);
  });
  useSpeechRecognitionEvent('error', (event) => {
    if (!['starting', 'listening', 'stopping'].includes(status.current)) return;
    if (chosen.current && event.error === 'audio-capture') {
      setNeedsMicrophoneChoice(true);
      setError('The selected microphone disconnected or is unavailable. Choose a microphone to continue.');
    } else if (!(status.current === 'stopping' && event.error === 'aborted')) {
      setError(event.error === 'not-allowed' ? 'Microphone or speech access is off. Allow access in Settings, then try again.'
        : event.error === 'no-speech' ? 'No speech was detected. Move the phone closer and try again.'
        : 'The speech service stopped (' + event.error + '). Check the device’s speech settings and try again.');
    }
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
      attempt.current++;
      subscription.remove();
      clearTimeout(timer.current);
      if (['starting', 'listening', 'stopping'].includes(status.current)) speech?.abort();
      releaseMicrophone();
    };
  }, []);
  useEffect(() => {
    if (phase !== 'listening') return;
    const id = setInterval(() => {
      setElapsed(Date.now() - startedAt.current);
      if (!chosen.current && Platform.OS === 'ios') setInputInUse(activeMicrophone()?.label || 'System microphone');
    }, 1000);
    return () => clearInterval(id);
  }, [phase]);

  async function start(consent: boolean, input: MicrophoneInput | null, onListening?: () => void) {
    if (!consent || needsMicrophoneChoice || !['ready', 'paused'].includes(status.current)) return;
    afterStart.current = onListening;
    const sequence = ++attempt.current;
    const current = () => mounted.current && sequence === attempt.current;
    chosen.current = input;
    setError('');
    change('permission');
    try {
      if (!speech?.isRecognitionAvailable()) {
        throw new Error(Platform.OS === 'web'
          ? 'This browser does not expose speech recognition. On iPhone, turn on Siri in Settings, open this page directly in Safari, and reload. On a computer, try Chrome.'
          : 'Speech recognition is unavailable. Enable a speech service on this device, or try another device.');
      }
      const permission = await speech.requestPermissionsAsync();
      if (!current()) return;
      if (!permission.granted) throw new Error('Allow microphone and speech access in Settings, then try again.');
      if (AppState.currentState === 'background') throw new Error('Return to the app and start captions again.');
      const prepared = await prepareMicrophone(input?.id ?? null, () => {
        if (!current() || !['starting', 'listening'].includes(status.current)) return;
        setError('The selected microphone disconnected. Choose a microphone to continue.');
        setNeedsMicrophoneChoice(true);
        stop();
      });
      if (!current()) {
        prepared.release?.();
        return;
      }
      microphone.current = prepared;
      if (AppState.currentState === 'background') throw new Error('Return to the app and start captions again.');
      if (!startedAt.current) startedAt.current = Date.now();
      change('starting');
      timer.current = setTimeout(() => {
        speech?.abort();
        setError('The microphone did not start. Check permissions and try again.');
        settle();
      }, 12000);
      speech.start({
        ...prepared.options,
        lang: 'en-US', interimResults: true,
        continuous: Platform.OS !== 'android' || Number(Platform.Version) >= 33,
        recordingOptions: { persist: false },
        volumeChangeEventOptions: { enabled: Platform.OS !== 'web', intervalMillis: 120 },
      });
    } catch (cause) {
      if (!current()) return;
      clearTimeout(timer.current);
      releaseMicrophone();
      if (input && cause instanceof Error && cause.message.includes('unavailable')) setNeedsMicrophoneChoice(true);
      setError(cause instanceof Error ? cause.message : 'Unable to start the microphone. Please try again.');
      change(startedAt.current ? 'paused' : 'ready');
    }
  }
  function acceptMicrophoneChoice() {
    setNeedsMicrophoneChoice(false);
    if (needsMicrophoneChoice) setError('');
  }
  const readLiveTranscript = useCallback(() =>
    status.current === 'listening' && AppState.currentState !== 'background' ? words.current : null, []);
  return { finalsAtStop, readLiveTranscript, audioTrack: microphone.current?.options.companionAudioTrack, phase, error, transcript, elapsed, startedAt, start, stop, inputInUse, needsMicrophoneChoice, acceptMicrophoneChoice };
}
