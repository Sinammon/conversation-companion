import React, { useRef, useState } from 'react';
import { AccessibilityInfo, BackHandler, Linking, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Action, c, Choices, Copy, formatTime, Heading, Icon, Label, Page, s } from '../components/ui';
import { useCapture } from '../capture/use-capture';
import { finish } from '../capture/transcript';
import { serviceUrl } from '../ai/client';
import type { Mode, Session } from '../types';

function Check({ value, toggle, title, detail }: { value: boolean; toggle: () => void; title: string; detail?: string }) {
  return <Pressable accessibilityRole="checkbox" aria-checked={value} accessibilityState={{ checked: value }} accessibilityLabel={[title, detail].filter(Boolean).join('. ')}
    onPress={toggle} style={[s.row, { alignItems: 'flex-start', paddingVertical: 9, minHeight: 48 }]}>
    <View style={{ width: 24, height: 24, backgroundColor: value ? c.green : c.white, borderRadius: 5, borderColor: c.green, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' }}>
      {value && <Icon name="check" size={17} color={c.white} />}</View>
    <View style={{ flex: 1, gap: 4 }}><Text style={[s.body, { fontWeight: '600' }]}>{title}</Text>{detail && <Text style={[s.body, { color: c.muted }]}>{detail}</Text>}</View>
  </Pressable>;
}
export function Capture({ onExit, onSave, size }: { onExit: () => void; onSave: (session: Session) => Promise<void>; size: number }) {
  const cap = useCapture();
  const [consent, setConsent] = useState(false);
  const [allowAI, setAllowAI] = useState(false);
  const [mode, setMode] = useState<Mode>('Lecture');
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [discard, setDiscard] = useState(false);
  const [follow, setFollow] = useState(true);
  const list = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const lock = useRef(false);
  const capturing = cap.startedAt.current !== 0;
  const stopped = cap.phase === 'paused';
  const busy = cap.phase === 'permission' || cap.phase === 'starting' || cap.phase === 'stopping';
  const captions = finish(cap.transcript);
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
  async function save() {
    if (!stopped || !captions.length || lock.current) return;
    lock.current = true;
    setSaving(true);
    setSaveError('');
    const date = cap.startedAt.current;
    try {
      await onSave({ id: String(date), startedAt: date, durationMs: cap.elapsed, mode, allowAI, captions,
        title: title.trim() || mode + ' · ' + new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) });
    } catch {
      setSaveError('Could not save on this device. Your captions are still here. Try saving again.');
      lock.current = false;
      setSaving(false);
    }
  }
  const status = ({ ready: 'Ready', permission: 'Checking permission…', starting: 'Opening microphone…', listening: 'Listening', stopping: 'Finishing captions…', paused: 'Microphone off' })[cap.phase];
  return <View style={{ flex: 1 }}>
    <View style={{ alignSelf: 'flex-start', paddingLeft: 12 }}><Action label={capturing ? 'Leave session' : 'Notebook'} secondary icon="back" onPress={back} disabled={saving || cap.phase === 'permission'} /></View>
    {!capturing ? <Page>
      <Heading>New session</Heading>
      <View style={s.group}><Label>Session title (optional)</Label><TextInput accessibilityLabel="Session title" placeholder="e.g. Biology seminar" placeholderTextColor={c.muted} style={s.input} maxLength={120} value={title} onChangeText={setTitle} /></View>
      <View style={s.group}><Label>Note format</Label><Choices values={['Lecture', 'Meeting']} selected={mode} onChange={setMode} />
        <Copy muted>{mode === 'Lecture' ? 'Key concepts, examples, and study prompts.' : 'Discussion, decisions, and action items.'}</Copy></View>
      <View style={{ gap: 4, borderTopWidth: 1, borderColor: c.line, paddingTop: 15 }}>
        <View style={s.row}><Icon name="shield" size={19} /><Label>Before you start</Label></View>
        <Copy muted>Your device’s speech service may process audio online. This app saves transcript text on this device and does not keep audio files.</Copy>
        <Check value={consent} toggle={() => setConsent(!consent)} title="Everyone agrees to transcription." />
        {!!serviceUrl && <Check value={allowAI} toggle={() => setAllowAI(!allowAI)} title="Generate AI notes after saving" detail={'Send transcript text to ' + serviceUrl + ' for notes and questions.'} />}
      </View>
      {!!cap.error && <Copy alert>{cap.error}</Copy>}
      {!!cap.error && Platform.OS !== 'web' && <Action secondary label="Open device settings" onPress={() => { void Linking.openSettings().catch(() => {}); }} />}
      <Action label={busy ? status : 'Start live captions'} icon="mic" disabled={!consent || busy} onPress={() => void cap.start(consent)} />
    </Page> : <View style={{ flex: 1, alignSelf: 'center', width: '100%', maxWidth: 720, padding: 18, gap: 12 }}>
      <View style={[s.row, { justifyContent: 'space-between' }]}><Label>{mode} · {formatTime(cap.elapsed)}</Label><Text accessibilityLiveRegion="polite" style={[s.label, { color: c.green }]}>{status}</Text></View>
      <Text accessibilityRole="header" style={s.subtitle}>Live captions</Text>
      <ScrollView ref={list} style={{ flex: 1, backgroundColor: c.white, borderRadius: 10 }} contentContainerStyle={{ padding: 16, gap: 13 }}
        onContentSizeChange={() => { if (follow) list.current?.scrollToEnd({ animated: false }); }}>
        {!captions.length && <Copy muted>{stopped ? 'No speech captured yet.' : 'Captions will appear when someone speaks.'}</Copy>}
        {cap.transcript.final.map((line, i) => <Text selectable key={i} style={{ fontSize: size, lineHeight: size * 1.45, color: c.ink }}>{line.text}</Text>)}
        {cap.transcript.partial && <Text selectable style={{ fontSize: size, lineHeight: size * 1.45, color: c.muted }}>{cap.transcript.partial.text}</Text>}
      </ScrollView>
      {Platform.OS === 'android' && <Text accessibilityLiveRegion="polite" style={{ height: 1, overflow: 'hidden' }}>{cap.transcript.final.at(-1)?.text}</Text>}
      <ScrollView style={{ flexGrow: 0, maxHeight: '50%' }} contentContainerStyle={{ gap: 8 }}>
        {!!(cap.error || saveError) && <Copy alert>{saveError || cap.error}</Copy>}
        {discard ? <View style={s.group}><Copy>Leave without saving these captions?</Copy><Action label="Keep session" onPress={() => setDiscard(false)} /><Action secondary label="Discard and leave" onPress={onExit} /></View>
          : stopped ? <><Action label={saving ? 'Saving…' : 'Save session'} disabled={!captions.length || saving} icon="book" onPress={() => void save()} />
            <Action secondary label="Resume captions" icon="mic" disabled={saving} onPress={() => void cap.start(consent)} /></>
          : <><Action secondary label={follow ? 'Pause auto-scroll' : 'Follow live captions'} onPress={() => { setFollow(!follow); if (!follow) list.current?.scrollToEnd(); }} />
            <Action label={busy ? status : 'Stop microphone'} disabled={busy} icon="stop" onPress={cap.stop} /></>}
      </ScrollView>
    </View>}
  </View>;
}
