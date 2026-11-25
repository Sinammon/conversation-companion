import React, { useRef, useState } from 'react';
import { AccessibilityInfo, BackHandler, Linking, Platform, Pressable, ScrollView, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { Action, c, Choices, Copy, formatTime, Heading, Icon, Label, Page, s } from '../components/ui';
import { livePilot } from '../ai/client';
import { useLiveNotes } from '../ai/use-live-notes';
import { LiveNotesPanel } from '../components/live-notes';
import { useCapture } from '../capture/use-capture';
import { canChooseMicrophone, listMicrophones } from '../capture/microphone';
import type { MicrophoneInput } from '../capture/microphone-types';
import { finish } from '../capture/transcript';
import { useKeepAwake } from 'expo-keep-awake';
import { CaptionSizeControl } from '../components/caption-size';
import type { CaptionSize } from '../components/caption-size';
import { Orb } from '../components/orb';
import { CaptionFeed } from '../components/caption-feed';
import { RecordingMeter } from '../components/recording-meter';
import type { Mode, Session } from '../types';

function KeepScreenAwake() {
  useKeepAwake('conversation-companion-capture', { suppressDeactivateWarnings: true });
  return null;
}

function Check({ value, toggle, title, detail }: { value: boolean; toggle: () => void; title: string; detail?: string }) {
  return <Pressable accessibilityRole="checkbox" aria-checked={value} accessibilityState={{ checked: value }} accessibilityLabel={[title, detail].filter(Boolean).join('. ')}
    onPress={toggle} style={[s.row, { alignItems: 'flex-start', paddingVertical: 9, minHeight: 48 }]}>
    <View style={{ width: 24, height: 24, backgroundColor: value ? c.green : c.reader, borderRadius: 5, borderColor: c.green, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' }}>
      {value && <Icon name="check" size={17} color={c.reader} />}</View>
    <View style={{ flex: 1, gap: 4 }}><Text style={[s.body, { fontWeight: '600' }]}>{title}</Text>{detail && <Text style={[s.body, { color: c.muted }]}>{detail}</Text>}</View>
  </Pressable>;
}
export function Capture({ onExit, onSave, size, sizeError, onSizeChange }: {
  onExit: () => void; onSave: (session: Session) => Promise<void>; size: number;
  sizeError: string; onSizeChange: (size: CaptionSize) => void;
}) {
  const cap = useCapture();
  const { height, fontScale } = useWindowDimensions();
  const compact = height < 480 || fontScale >= 1.35;
  const [consent, setConsent] = useState(false);
  const [mode, setMode] = useState<Mode>('Lecture');
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [discard, setDiscard] = useState(false);
  const [pausedAt, setPausedAt] = useState<number | null>(null);
  const [bookmarks, setBookmarks] = useState<number[]>([]);
  const latest = cap.transcript.final.length - 1;
  const [focus, setFocus] = useState(false);
  const follow = pausedAt === null;
  const unread = cap.transcript.final.length - (pausedAt ?? cap.transcript.final.length);
  const [showSize, setShowSize] = useState(false);
  const [input, setInput] = useState<MicrophoneInput | null>(null);
  const [inputs, setInputs] = useState<MicrophoneInput[]>([]);
  const [showInputs, setShowInputs] = useState(false);
  const [loadingInputs, setLoadingInputs] = useState(false);
  const [inputError, setInputError] = useState('');
  const discovery = useRef<AbortController | null>(null);
  React.useEffect(() => () => discovery.current?.abort(), []);
  const lock = useRef(false);
  const capturing = cap.startedAt.current !== 0;
  const stopped = cap.phase === 'paused';
  const listening = cap.phase === 'listening';
  const live = useLiveNotes(mode, listening, cap.readLiveTranscript);
  const busy = cap.phase === 'permission' || cap.phase === 'starting' || cap.phase === 'stopping';
  const hasCaptions = Boolean(cap.transcript.final.length || cap.transcript.partial);
  const canChoose = canChooseMicrophone();
  async function toggleInputs() {
    if (showInputs) {
      setShowInputs(false);
      return;
    }
    const controller = new AbortController();
    discovery.current = controller;
    setShowInputs(true);
    setLoadingInputs(true);
    setInputError('');
    setInputs([]);
    try {
      const available = await listMicrophones(controller.signal);
      if (!controller.signal.aborted) setInputs(available);
    } catch (error) {
      if (!controller.signal.aborted) {
        setInputError(error instanceof Error ? error.message : 'Could not list microphones. Try again.');
      }
    } finally {
      if (discovery.current === controller) {
        discovery.current = null;
        if (!controller.signal.aborted) setLoadingInputs(false);
      }
    }
  }
  function selectInput(selected: MicrophoneInput | null) {
    setInput(selected);
    setShowInputs(false);
    cap.acceptMicrophoneChoice();
  }
  function toggleConsent() {
    if (consent) {
      cap.stop();
      discovery.current?.abort();
      discovery.current = null;
      setLoadingInputs(false);
      setShowInputs(false);
    }
    setConsent(!consent);
  }
  function start() {
    setShowInputs(false);
    void cap.start(consent, input);
  }
  const microphones = <View style={s.group}>
    <Label>Microphone</Label>
    <Copy muted>{input?.label ?? (canChoose ? 'System default' : 'System microphone')}</Copy>
    {canChoose && <Action label="Choose microphone" icon="mic" secondary expanded={showInputs}
      disabled={!consent || loadingInputs || saving || busy} onPress={() => void toggleInputs()} />}
    {showInputs && <View accessibilityRole="radiogroup" accessibilityLabel="Microphone inputs" style={s.group}>
      {loadingInputs && <Copy muted>Finding microphones…</Copy>}
      {!!inputError && <Copy alert>{inputError}</Copy>}
      {[null, ...inputs].map(item => {
        const selected = !cap.needsMicrophoneChoice && (item?.id ?? null) === (input?.id ?? null);
        return <Pressable key={item?.id ?? 'system'} accessibilityRole="radio" aria-checked={selected}
          accessibilityState={{ checked: selected, disabled: loadingInputs }} disabled={loadingInputs}
          onPress={() => selectInput(item)} style={[s.choice, selected && s.activeChoice]}>
          <Text style={[s.choiceText, selected && { color: c.reader }]}>{item?.label ?? 'System default'}</Text>
        </Pressable>;
      })}
    </View>}
  </View>;
  function back() {
    if (lock.current) return;
    if (!capturing && cap.phase === 'ready') { onExit(); return; }
    if (cap.phase === 'permission') return;
    cap.stop();
    setDiscard(true);
  }
  React.useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { back(); return true; });
    return () => sub.remove();
  });
  React.useEffect(() => {
    const last = cap.transcript.final.at(-1);
    if (last && Platform.OS === 'ios') AccessibilityInfo.announceForAccessibilityWithOptions(last.text, { queue: true });
  }, [cap.transcript.final]);
  React.useEffect(() => {
    if (cap.phase === 'paused' && Platform.OS === 'ios') {
      AccessibilityInfo.announceForAccessibility('Microphone off. Resume captions or save the session.');
    }
  }, [cap.phase]);
  async function save() {
    if (!stopped || !hasCaptions || lock.current) return;
    lock.current = true;
    setSaving(true);
    setSaveError('');
    const date = cap.startedAt.current;
    try {
      await onSave({ id: String(date), startedAt: date, durationMs: cap.elapsed, mode, allowAI: false, bookmarks, liveDrafts: live.drafts, captions: finish(cap.transcript),
        title: title.trim() || mode + ' · ' + new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) });
    } catch {
      setSaveError('Could not save on this device. Your captions are still here. Try saving again.');
      lock.current = false;
      setSaving(false);
    }
  }
  const status = ({ ready: 'Ready', permission: 'Checking permission…', starting: 'Opening microphone…', listening: 'Listening', stopping: 'Finishing captions…', paused: 'Microphone off' })[cap.phase];
  return <View style={{ flex: 1 }}>
    {(cap.phase === 'starting' || cap.phase === 'listening') && <KeepScreenAwake />}
    {!capturing ? <Page>
      <View style={{ alignSelf: 'flex-start' }}><Action label="Notebook" secondary icon="back" onPress={back} disabled={cap.phase === 'permission'} /></View>
      <Heading>New session</Heading>
      <View style={s.group}><Label>Session title (optional)</Label><TextInput accessibilityLabel="Session title" placeholder="e.g. Biology seminar" placeholderTextColor={c.muted} style={s.input} maxLength={120} value={title} onChangeText={setTitle} /></View>
      <View style={s.group}><Label>Note format</Label><Choices values={['Lecture', 'Meeting']} selected={mode} onChange={setMode} />
        <Copy muted>{mode === 'Lecture' ? 'Key concepts, examples, and study prompts.' : 'Discussion, decisions, and action items.'}</Copy></View>
      <View style={s.panel}>
        <View style={s.row}><Icon name="shield" size={19} /><Label>Before you start</Label></View>
        <Copy muted>Your device’s speech service may process audio online. This app saves transcript text on this device and does not keep audio files.</Copy>
        <Check value={consent} toggle={toggleConsent} title="Everyone agrees to transcription." />
      </View>
      {microphones}
      {!!cap.error && <Copy alert>{cap.error}</Copy>}
      {!!cap.error && Platform.OS !== 'web' && <Action secondary label="Open device settings" onPress={() => { void Linking.openSettings().catch(() => {}); }} />}
      <Action recording label={busy ? status : 'Start live captions'} icon="mic"
        disabled={!consent || busy || loadingInputs || cap.needsMicrophoneChoice} onPress={start} />
    </Page> : <View style={{ flex: 1, alignSelf: 'center', width: '100%', maxWidth: 720, padding: compact ? 10 : 18, gap: compact ? 6 : 11 }}>
      <ScrollView style={{ flexGrow: 0, maxHeight: compact ? '42%' : undefined }} contentContainerStyle={{ gap: compact ? 6 : 11 }} keyboardShouldPersistTaps="handled">
        <View style={[s.row, { justifyContent: 'space-between', flexWrap: 'wrap' }]}>
          {!focus && <Action label="Leave session" secondary icon="back" onPress={back} disabled={saving || cap.phase === 'permission'} />}
          <Action label={focus ? 'Exit focus' : 'Focus captions'} secondary onPress={() => setFocus(!focus)} />
          <Action label="Caption size" secondary icon="tune" expanded={showSize} onPress={() => setShowSize(!showSize)} />
        </View>
        <View style={[s.row, { justifyContent: 'space-between', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 12, flexWrap: 'wrap',
          backgroundColor: listening ? c.recordWash : c.wash }]}>
          <View style={{ flexShrink: 1 }}>
            <Label>{mode} · <Text style={{ fontVariant: ['tabular-nums'] }}>{formatTime(cap.elapsed)}</Text></Label>
            <Text accessibilityLiveRegion="polite" style={[s.label, { color: listening ? c.record : c.ink }]}>{status}</Text>
            {listening && !focus && <Label>Microphone in use: {cap.inputInUse}</Label>}
          </View>
          {!compact && !focus && <View style={s.row}><RecordingMeter listening={listening} /><Orb size={56} listening={listening} track={cap.audioTrack} /></View>}
        </View>
        {!focus && <Text accessibilityRole="header" style={s.subtitle}>Live captions</Text>}
        {showSize && <View style={{ gap: 5 }}><CaptionSizeControl size={size} onChange={onSizeChange} />{!!sizeError && <Copy alert>{sizeError}</Copy>}</View>}
      </ScrollView>
      <CaptionFeed transcript={cap.transcript} size={size} follow={follow} stopped={stopped} />
      {Platform.OS === 'android' && <Text accessibilityLiveRegion="polite" style={{ height: 1, overflow: 'hidden' }}>{cap.transcript.final.at(-1)?.text}</Text>}
      <ScrollView style={{ flexGrow: 0, maxHeight: compact ? '30%' : '40%' }} contentContainerStyle={{ gap: 8 }}>
        {!!(cap.error || saveError) && <Copy alert>{saveError || cap.error}</Copy>}
        {livePilot && listening && !discard && (!focus || live.state.status !== 'off') &&
          <LiveNotesPanel notes={live} captions={cap.transcript.final} />}
        {!discard && (!follow || !stopped) && <Action secondary icon={follow ? 'pause' : 'arrow'}
          label={follow ? 'Pause auto-scroll' : stopped ? 'Go to latest caption' : unread ? `Back to live · ${unread} new caption${unread === 1 ? '' : 's'}` : 'Back to live'}
          onPress={() => setPausedAt(follow ? cap.transcript.final.length : null)} />}
        {!discard && !focus && <Action secondary icon="bookmark" label={bookmarks.includes(latest) ? 'Latest caption bookmarked' : 'Bookmark latest caption'}
          disabled={latest < 0 || bookmarks.includes(latest) || saving} onPress={() => setBookmarks(previous => previous.includes(latest) ? previous : [...previous, latest])} />}
        {discard ? <View style={s.group}><Copy>Leave without saving these captions?</Copy><Action label="Keep session" onPress={() => setDiscard(false)} /><Action secondary label="Discard and leave" onPress={onExit} /></View>
          : stopped ? <>{microphones}<Action label={saving ? 'Saving…' : 'Save session'} disabled={!hasCaptions || saving} icon="book" onPress={() => void save()} />
            <Action secondary label="Resume captions" icon="mic" disabled={saving || loadingInputs || cap.needsMicrophoneChoice} onPress={start} /></>
          : null}
      </ScrollView>
      {!stopped && !discard && <Action recording label={busy ? status : 'Stop microphone'} disabled={busy} icon="stop" onPress={cap.stop} />}
    </View>}
  </View>;
}
