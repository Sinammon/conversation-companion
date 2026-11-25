import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import type { Mode, LiveDraft } from '../types';
import type { Transcript } from '../capture/transcript';
import { livePilot, makeLiveNotes } from './client';
import { LiveNotesRun, type LiveState } from './live-notes-run';

export function useLiveNotes(mode: Mode, listening: boolean, read: () => Transcript | null) {
  const [state, setState] = useState<LiveState>({status: 'off'});
  const [drafts, setDrafts] = useState<LiveDraft[]>([]);
  const active = useRef<LiveNotesRun | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const cancel = useCallback(() => {
    clearInterval(timer.current);
    active.current?.stop();
    active.current = null;
  }, []);
  const disable = useCallback(() => {
    cancel();
    setState({status: 'off'});
  }, [cancel]);
  useLayoutEffect(() => { if (!listening) disable(); }, [listening, disable]);
  useEffect(() => {
    const sub = AppState.addEventListener('change', next => { if (next === 'background') disable(); });
    return () => { sub.remove(); cancel(); };
  }, [disable, cancel]);
  function enable() {
    const initial = read();
    if (!livePilot || !initial || active.current) return;
    const run = new LiveNotesRun(initial, read, (text, signal) => makeLiveNotes(mode, text, signal),
      setState, draft => setDrafts(previous => [...previous, draft]));
    active.current = run;
    setState({status: 'waiting'});
    timer.current = setInterval(() => { void run.tick(); }, 45000);
  }
  return { state, drafts, enable, disable, retry: () => { void active.current?.retry(); } };
}
