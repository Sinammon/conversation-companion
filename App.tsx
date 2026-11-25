import React, { useEffect, useRef, useState } from 'react';
import { BackHandler, Platform, StatusBar, Text, View, Pressable, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';
import { useFonts } from 'expo-font';
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Lights } from './src/components/lights';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Action, c, Copy, Heading, Icon, Label, Page, s } from './src/components/ui';
import { LiquidNavbar } from './src/components/liquid-navbar';
import { mainTabPanelId, mainTabs } from './src/components/main-tabs';
import { CaptionSizeControl, captionSizes } from './src/components/caption-size';
import type { CaptionSize } from './src/components/caption-size';
import { speech } from './src/capture/speech';
import { recordingPreviewMessage } from './src/capture/speech-availability';
import { Capture } from './src/screens/capture';
import { Notebook } from './src/screens/notebook';
import { Detail } from './src/screens/detail';
import { loadSessions, saveSession, saveBookmark, approveSession, deleteSession, loadSize, saveSize } from './src/storage/notebook';
import { serviceUrl } from './src/ai/client';
import { createDemoSession, demoSessionId } from './src/ai/demos';
import { useNotes } from './src/ai/use-notes';
import type { DemoId, Session } from './src/types';

const previewMessage = recordingPreviewMessage(speech);
const transition = FadeIn.duration(180).reduceMotion(ReduceMotion.System);
const ScreenFrame = Platform.OS === 'web' ? View : Animated.View;

type Screen = 'Notebook' | 'Preferences' | 'Capture' | 'Detail';
export default function App() {
  const [fonts, fontError] = useFonts({ Inter_400Regular, Inter_600SemiBold });
  const { width, height } = useWindowDimensions();
  const iPhone = Platform.OS === 'ios' && !Platform.isPad;
  const wide = width >= 900 && !iPhone;
  const shortPhone = iPhone && height < 480;
  const [screen, setScreen] = useState<Screen>('Notebook');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [hasUnreadableRecords, setHasUnreadableRecords] = useState(false);
  const { jobs, generate } = useNotes((id, notes) => setSessions(previous => previous.map(s => s.id === id ? { ...s, notes } : s)));
  const [openingQuery, setOpeningQuery] = useState('');
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
      setSessions(saved.sessions);
      setHasUnreadableRecords(saved.hasUnreadableRecords);
      setSize(Object.values(captionSizes).includes(preference) ? preference : captionSizes.Large);
      setStatus('ready');
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
  function openSession(session: Session, query = '') {
    setOpeningQuery(query);
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
    screen === 'Notebook' ? <Notebook sessions={sessions.filter(item => !item.demoId)} hasUnreadableRecords={hasUnreadableRecords} onNew={() => setScreen('Capture')} previewMessage={previewMessage} onOpen={openSession}
      onDemo={id => void openDemo(id)} openingDemo={openingDemo} demoError={demoError} /> :
    screen === 'Capture' && speech ? <Capture size={size} sizeError={sizeError} onSizeChange={v => void changeSize(v)} onExit={() => setScreen('Notebook')} onSave={async s => { await persist(s); openSession(s); }} /> :
    screen === 'Detail' && session ? <Detail key={session.id} session={session} initialQuery={openingQuery} size={size} job={jobs[session.id]} generate={generate} onBack={() => setScreen('Notebook')}
      onBookmarks={async (index, marked) => {
        const bookmarks = await saveBookmark(session.id, index, marked);
        setSessions(prev => prev.map(item => item.id === session.id ? { ...item, bookmarks } : item));
      }} onApprove={async () => {
        await approveSession(session.id, serviceUrl);
        setSessions(prev => prev.map(item => item.id === session.id ? { ...item, allowAI: true, approvedProvider: 'gemini', approvedUrl: serviceUrl } : item));
      }} onDelete={async () => { await deleteSession(session.id); setSessions(prev => prev.filter(s => s.id !== session.id)); setScreen('Notebook'); }} /> :
    <Page><Heading>Preferences</Heading><CaptionSizeControl size={size} onChange={v => void changeSize(v)} />
      {!!sizeError && <Copy alert>{sizeError}</Copy>}
      <View style={{ gap: 10, padding: 18, borderRadius: 9, backgroundColor: c.reader }}><Label>Text preview</Label><Copy style={{ fontSize: size, lineHeight: size * 1.45 }}>This is your caption size.</Copy></View>
      <View style={s.panel}><Label>AI notes service</Label><Copy>{serviceUrl || 'Not connected'}</Copy>
        <Copy muted>{serviceUrl ? 'Ask questions and make notes from saved transcripts after approving sharing for each session.' : 'Captions and saved sessions work independently. See the project README to connect Gemini.'}</Copy></View>
    </Page>;

  if (!fonts && !fontError) return <View style={{ flex: 1, backgroundColor: c.paper }} />;
  const brand = <View style={[s.row, { paddingHorizontal: wide ? 8 : 20, paddingVertical: shortPhone ? 4 : 14 }]}>
    <View style={{ backgroundColor: '#335461', padding: 8, borderRadius: 12, borderWidth: 1, borderColor: '#6E9DAF' }}><Icon name="sound" size={20} color="#ACF5E9" /></View>
    <Text style={{ fontFamily: 'Inter_600SemiBold', color: c.ink, fontSize: 16, flexShrink: 1 }}>Conversation Companion</Text>
  </View>;
  return <SafeAreaProvider><SafeAreaView style={{ flex: 1, backgroundColor: c.paper }}>
    <StatusBar barStyle="light-content" /><Lights paused={screen === 'Capture'} />
    <View style={{ flex: 1, flexDirection: 'row' }}>
    {wide && <View accessibilityLabel="Sidebar" style={{ width: 232, margin: 16, marginRight: 0, padding: 12, gap: 16,
      backgroundColor: 'rgba(35,50,74,.84)', borderWidth: 1, borderColor: c.line, borderRadius: 22 }}>
      {brand}
      {screen !== 'Capture' && <View style={{ gap: 6 }}>{mainTabs.map(tab => <Pressable key={tab.id} id={tab.id} accessibilityRole="button"
        accessibilityState={{ selected: screen === tab.name }} dataSet={{ lift: true }} onPress={() => setScreen(tab.name)}
        style={[s.row, { backgroundColor: screen === tab.name ? c.wash : 'transparent', borderRadius: 12, padding: 13 }]}>
        <Icon name={tab.icon} color={screen === tab.name ? '#B7F3E8' : c.muted} /><Text style={s.body}>{tab.name}</Text>
      </Pressable>)}</View>}
    </View>}
    <View style={{ flex: 1, minWidth: 0, paddingTop: wide ? 15 : 0 }}>
      {!wide && topLevel && brand}
      <ScreenFrame key={screen} {...(Platform.OS !== 'web' ? { entering: transition } : {})} dataSet={{ page: true }} style={{ flex: 1, minHeight: 0 }}>
      {browserTab && !wide ? <View style={{ flex: 1, minHeight: 0 }} role="tabpanel" id={mainTabPanelId} aria-labelledby={browserTab.id}>
        {content}
      </View> : content}
      </ScreenFrame>
      {!wide && topLevel && status === 'ready' && <LiquidNavbar active={screen} onChange={setScreen} />}
    </View></View>
  </SafeAreaView></SafeAreaProvider>;
}
