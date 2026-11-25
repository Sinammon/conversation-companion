import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import type { Mode, LiveDraft, Caption } from '../types';
import type { Transcript } from '../capture/transcript';
import { localHighlights } from './local-highlights';
import { livePilot, makeLiveNotes } from './client';
import { LiveNotesRun, type LiveState } from './live-notes-run';

export function useLiveNotes(mode: Mode, listening: boolean, read: () => Transcript | null, finalizedAtStop?: Caption[]) {
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
  useLayoutEffect(() => {
    if (listening || !active.current) return;
    if (livePilot) disable();
    else if (finalizedAtStop) {
      active.current.finishLocal(finalizedAtStop, localHighlights);
      disable();
    }
  }, [listening, finalizedAtStop, disable]);
  useEffect(() => {
    const sub = AppState.addEventListener('change', next => { if (next === 'background') disable(); });
    return () => { sub.remove(); cancel(); };
  }, [disable, cancel]);
  function enable() {
    const initial = read();
    if (!initial || active.current) return;
    const run = new LiveNotesRun(initial, read, async (text, signal) => livePilot ? makeLiveNotes(mode, text, signal) : localHighlights(text),
      setState, draft => setDrafts(previous => [...previous, { ...draft, source: livePilot ? 'gemini' : 'device' }]));
    active.current = run;
    setState({status: 'waiting'});
    timer.current = setInterval(() => { void run.tick(); }, 45000);
  }
  return { state, drafts, enable, disable, retry: () => { void active.current?.retry(); } };
}
