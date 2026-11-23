import React, { useEffect, useState } from 'react';
import { BackHandler, KeyboardAvoidingView, Platform, Pressable, StatusBar, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Action, c, Choices, Copy, Heading, Icon, Label, Page, s } from './src/components/ui';
import { Capture } from './src/screens/capture';
import { Notebook } from './src/screens/notebook';
import { Detail } from './src/screens/detail';
import { loadSessions, saveSession, deleteSession, loadSize, saveSize } from './src/storage/notebook';
import { serviceUrl } from './src/ai/client';
import type { Session } from './src/types';

type Screen = 'Notebook' | 'Preferences' | 'Capture' | 'Detail';
const sizes = { Standard: 21, Large: 26, Largest: 34 };
export default function App() {
  const [screen, setScreen] = useState<Screen>('Notebook');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [current, setCurrent] = useState('');
  const [auto, setAuto] = useState(false);
  const [size, setSize] = useState(26);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [sizeError, setSizeError] = useState('');
  const [savingSize, setSavingSize] = useState(false);
  async function load() {
    setStatus('loading');
    try {
      const [saved, preference] = await Promise.all([loadSessions(), loadSize()]);
      setSessions(saved); setSize(Object.values(sizes).includes(preference) ? preference : 26); setStatus('ready');
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
  async function changeSize(label: keyof typeof sizes) {
    if (savingSize) return;
    setSavingSize(true); setSizeError('');
    try { await saveSize(sizes[label]); setSize(sizes[label]); }
    catch { setSizeError('Could not save your caption size. Try again.'); }
    finally { setSavingSize(false); }
  }
  const session = sessions.find(s => s.id === current);
  const topLevel = screen === 'Notebook' || screen === 'Preferences';
  return <SafeAreaProvider><SafeAreaView style={{ flex: 1, backgroundColor: c.paper }}>
    <StatusBar barStyle="dark-content" />
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <View style={{ borderBottomWidth: 1, borderColor: c.line, marginBottom: topLevel ? 0 : 10 }}>
        <View style={[s.row, { alignSelf: 'center', width: '100%', maxWidth: 720, paddingHorizontal: 22, paddingVertical: 13, gap: 10 }]}>
          <View style={{ backgroundColor: c.green, padding: 7, borderRadius: 9 }}><Icon name="sound" size={19} color={c.lime} /></View>
          <Text style={{ fontSize: 16, color: c.ink, fontWeight: '700', flexShrink: 1 }}>Conversation Companion</Text>
        </View>
      </View>
      {status !== 'ready' ? <Page><Copy>{status === 'loading' ? 'Opening notebook…' : 'Your notebook could not be opened on this device.'}</Copy>
        {status === 'error' && <Action label="Try again" onPress={() => void load()} />}</Page> :
        screen === 'Notebook' ? <Notebook sessions={sessions} onNew={() => setScreen('Capture')} onOpen={s => { setCurrent(s.id); setAuto(false); setScreen('Detail'); }} /> :
        screen === 'Capture' ? <Capture size={size} onExit={() => setScreen('Notebook')} onSave={async s => { await persist(s); setCurrent(s.id); setAuto(s.allowAI); setScreen('Detail'); }} /> :
        screen === 'Detail' && session ? <Detail key={session.id} session={session} size={size} auto={auto} onBack={() => setScreen('Notebook')}
          onUpdate={persist} onDelete={async () => { await deleteSession(session.id); setSessions(prev => prev.filter(s => s.id !== session.id)); setScreen('Notebook'); }} /> :
        <Page><Heading>Preferences</Heading><View style={s.group}><Label>Caption size</Label>
          <Choices values={['Standard', 'Large', 'Largest']} selected={size === 21 ? 'Standard' : size === 34 ? 'Largest' : 'Large'} onChange={v => void changeSize(v)} /></View>
          {!!sizeError && <Copy alert>{sizeError}</Copy>}
          <View style={{ gap: 10, padding: 18, borderRadius: 9, backgroundColor: c.white }}><Label>Text preview</Label><Copy style={{ fontSize: size, lineHeight: size * 1.45 }}>This is your caption size.</Copy></View>
          <View style={s.group}><Label>AI notes service</Label><Copy>{serviceUrl || 'Not connected'}</Copy>
            <Copy muted>{serviceUrl ? 'You choose whether to share the transcript for each session.' : 'Captions and saved sessions work independently. See the project README to connect Ollama for notes and questions.'}</Copy></View>
        </Page>}
      {topLevel && status === 'ready' && <View style={{ flexDirection: 'row', borderTopWidth: 1, borderColor: c.line, backgroundColor: c.paper }}>
        {(['Notebook', 'Preferences'] as const).map(name => <Pressable key={name} accessibilityRole="tab" aria-selected={name === screen} accessibilityState={{ selected: name === screen }}
          onPress={() => setScreen(name)} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4, padding: 10, minHeight: 60 }}>
          <Icon name={name === 'Notebook' ? 'book' : 'tune'} color={name === screen ? c.green : c.muted} size={22} />
          <Text style={{ fontSize: 13, color: name === screen ? c.green : c.muted, fontWeight: name === screen ? '700' : '500' }}>{name}</Text>
        </Pressable>)}</View>}
    </KeyboardAvoidingView>
  </SafeAreaView></SafeAreaProvider>;
}
