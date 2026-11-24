import React, { useEffect, useRef, useState } from 'react';
import { BackHandler, KeyboardAvoidingView, Platform, StatusBar, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Action, c, Copy, Heading, Icon, Label, Page, s } from './src/components/ui';
import { LiquidNavbar } from './src/components/liquid-navbar';
import { mainTabPanelId, mainTabs } from './src/components/main-tabs';
import { CaptionSizeControl, captionSizes } from './src/components/caption-size';
import type { CaptionSize } from './src/components/caption-size';
import { Capture } from './src/screens/capture';
import { Notebook } from './src/screens/notebook';
import { Detail } from './src/screens/detail';
import { loadSessions, saveSession, deleteSession, loadSize, saveSize } from './src/storage/notebook';
import { serviceUrl } from './src/ai/client';
import { createDemoSession, demoSessionId } from './src/ai/demos';
import { useNotes } from './src/ai/use-notes';
import type { DemoId, Session } from './src/types';

type Screen = 'Notebook' | 'Preferences' | 'Capture' | 'Detail';
export default function App() {
  const [screen, setScreen] = useState<Screen>('Notebook');
  const [sessions, setSessions] = useState<Session[]>([]);
  const { jobs, generate } = useNotes((id, notes) => setSessions(previous => previous.map(s => s.id === id ? { ...s, notes } : s)));
  const [current, setCurrent] = useState('');
  const demoLock = useRef(false);
  const [openingDemo, setOpeningDemo] = useState(false);
  const [demoError, setDemoError] = useState('');
  const [size, setSize] = useState(26);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [sizeError, setSizeError] = useState('');
  const [savingSize, setSavingSize] = useState(false);
  async function load() {
    setStatus('loading');
    try {
      const [saved, preference] = await Promise.all([loadSessions(), loadSize()]);
      setSessions(saved); setSize(Object.values(captionSizes).includes(preference) ? preference : captionSizes.Large); setStatus('ready');
    } catch { setStatus('error'); }
  }
  useEffect(() => { void load(); }, []);
  useEffect(() => {
    if (screen === 'Capture' || screen === 'Notebook') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { setScreen('Notebook'); return true; });
    return () => sub.remove();
  }, [screen]);
  async function persist(session: Session) {
    await saveSession(session);
    setSessions(prev => [session, ...prev.filter(s => s.id !== session.id)].sort((a, b) => b.startedAt - a.startedAt));
  }
  function openSession(session: Session) {
    setCurrent(session.id);
    setScreen('Detail');
  }
  async function openDemo(id: DemoId) {
    if (demoLock.current) return;
    demoLock.current = true;
    setOpeningDemo(true);
    setDemoError('');
    try {
      const saved = sessions.find(item => item.id === demoSessionId(id));
      const session = saved ?? createDemoSession(id);
      if (!saved) await persist(session);
      openSession(session);
    } catch {
      setDemoError('Could not save the demo on this device. Try again.');
    } finally {
      demoLock.current = false;
      setOpeningDemo(false);
    }
  }
  async function changeSize(label: CaptionSize) {
    if (savingSize) return;
    setSavingSize(true); setSizeError('');
    try { await saveSize(captionSizes[label]); setSize(captionSizes[label]); }
    catch { setSizeError('Could not save your caption size. Try again.'); }
    finally { setSavingSize(false); }
  }
  const session = sessions.find(s => s.id === current);
  const topLevel = screen === 'Notebook' || screen === 'Preferences';
  const browserTab = Platform.OS === 'web' && status === 'ready' && mainTabs.find(tab => tab.name === screen);
  const content = status !== 'ready' ? <Page><Copy>{status === 'loading' ? 'Opening notebook…' : 'Your notebook could not be opened on this device.'}</Copy>
    {status === 'error' && <Action label="Try again" onPress={() => void load()} />}</Page> :
    screen === 'Notebook' ? <Notebook sessions={sessions.filter(item => !item.demoId)} onNew={() => setScreen('Capture')} onOpen={openSession}
      onDemo={id => void openDemo(id)} openingDemo={openingDemo} demoError={demoError} /> :
    screen === 'Capture' ? <Capture size={size} sizeError={sizeError} onSizeChange={v => void changeSize(v)} onExit={() => setScreen('Notebook')} onSave={async s => { await persist(s); openSession(s); }} /> :
    screen === 'Detail' && session ? <Detail key={session.id} session={session} size={size} job={jobs[session.id]} generate={generate} onBack={() => setScreen('Notebook')}
      onUpdate={persist} onDelete={async () => { await deleteSession(session.id); setSessions(prev => prev.filter(s => s.id !== session.id)); setScreen('Notebook'); }} /> :
    <Page><Heading>Preferences</Heading><CaptionSizeControl size={size} onChange={v => void changeSize(v)} />
      {!!sizeError && <Copy alert>{sizeError}</Copy>}
      <View style={{ gap: 10, padding: 18, borderRadius: 9, backgroundColor: c.white }}><Label>Text preview</Label><Copy style={{ fontSize: size, lineHeight: size * 1.45 }}>This is your caption size.</Copy></View>
      <View style={s.group}><Label>AI notes service</Label><Copy>{serviceUrl || 'Not connected'}</Copy>
        <Copy muted>{serviceUrl ? 'Ask questions and make notes from saved transcripts after approving sharing for each session.' : 'Captions and saved sessions work independently. See the project README to connect Gemini.'}</Copy></View>
    </Page>;

  return <SafeAreaProvider><SafeAreaView style={{ flex: 1, backgroundColor: c.paper }}>
    <StatusBar barStyle="dark-content" />
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      {topLevel && <View style={[s.row, { alignSelf: 'center', width: '100%', maxWidth: 720, paddingHorizontal: 22, paddingVertical: 12, gap: 10 }]}>
        <View style={{ backgroundColor: c.green, padding: 7, borderRadius: 10 }}><Icon name="sound" size={18} color={c.lime} /></View>
        <Text style={{ fontSize: 15, color: c.ink, fontWeight: '700', flexShrink: 1 }}>Conversation Companion</Text>
      </View>}
      {browserTab ? <View style={{ flex: 1, minHeight: 0 }} role="tabpanel" id={mainTabPanelId} aria-labelledby={browserTab.id}>
        {content}
      </View> : content}
      {topLevel && status === 'ready' && <LiquidNavbar active={screen} onChange={setScreen} />}
    </KeyboardAvoidingView>
  </SafeAreaView></SafeAreaProvider>;
}
