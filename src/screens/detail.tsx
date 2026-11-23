import React, { useEffect, useRef, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { Action, c, Choices, Copy, formatTime, Heading, Label, Page, s } from '../components/ui';
import { ask, serviceUrl } from '../ai/client';
import { isApproved } from '../ai/consent';
import type { NoteJob } from '../ai/use-notes';
import type { Answer, Session } from '../types';

export function Detail({ session, auto, size, job, generate, onUpdate, onDelete, onBack }: {
  job?: NoteJob; generate: (s: Session) => Promise<void>;
  session: Session; auto: boolean; size: number; onUpdate: (s: Session) => Promise<void>; onDelete: () => Promise<void>; onBack: () => void;
}) {
  const [tab, setTab] = useState<'Transcript' | 'Notes' | 'Ask'>(auto || session.notes ? 'Notes' : 'Transcript');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState(false);
  const lock = useRef(false);
  const mounted = useRef(true);
  async function run(name: string, operation: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true; setBusy(name); setError('');
    try { await operation(); }
    catch (e) { if (mounted.current) setError(e instanceof Error ? e.message : 'The operation failed. Try again.'); }
    finally { lock.current = false; if (mounted.current) setBusy(''); }
  }
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  const needsSetup = !isApproved(session, serviceUrl);
  return <Page>
    <View style={{ alignSelf: 'flex-start' }}><Action secondary icon="back" label="Notebook" onPress={onBack} /></View>
    <View style={s.group}><Label>{session.mode} · {new Date(session.startedAt).toLocaleDateString()} · {formatTime(session.durationMs)}</Label><Heading>{session.title}</Heading></View>
    <Choices values={['Transcript', 'Notes', 'Ask']} selected={tab} onChange={value => { setTab(value); setConfirm(false); }} />
    {!!busy && <Text accessibilityLiveRegion="polite" style={s.label}>{busy}</Text>}
    {!!error && <Copy alert>{error}</Copy>}
    {tab === 'Notes' && job?.busy && <Copy>Writing notes…</Copy>}
    {tab === 'Notes' && !!job?.error && <Copy alert>{job.error}</Copy>}
    {tab === 'Transcript' && <>
      {session.captions.map((line, index) => <View key={index} style={[s.group, { borderLeftWidth: 2, borderColor: c.line, paddingLeft: 14 }]}>
        <Label>{formatTime(line.at)}</Label><Copy style={{ fontSize: size, lineHeight: size * 1.45 }}>{line.text}</Copy></View>)}
      {confirm ? <View style={s.group}><Copy>Delete this session and its notes from this device?</Copy><Action label="Keep session" secondary onPress={() => setConfirm(false)} />
        <Action label="Delete permanently" disabled={!!busy} onPress={() => void run('Deleting…', onDelete)} /></View>
        : <Action secondary label="Delete session" disabled={!!busy} onPress={() => setConfirm(true)} />}
    </>}
    {tab !== 'Transcript' && needsSetup && <View style={s.group}>
      <Text style={s.subtitle}>{serviceUrl ? 'Use AI for this session?' : 'Connect a notes service'}</Text>
      <Copy muted>{serviceUrl ? 'Allow this transcript to be sent to ' + serviceUrl + ' for notes and questions.' : 'Set EXPO_PUBLIC_AI_URL in your project and restart the app to enable notes and questions. Your transcript is saved.'}</Copy>
      {!!serviceUrl && <Action label="Allow transcript sharing" disabled={!!busy} onPress={() => void run('Saving…', () => onUpdate({ ...session, allowAI: true, approvedUrl: serviceUrl }))} />}
    </View>}
    {tab === 'Notes' && (session.notes ? <>
      <View style={s.group}><Text accessibilityRole="header" style={s.subtitle}>Summary</Text><Copy>{session.notes.summary}</Copy></View>
      {session.notes.sections.map(section => <View key={section.heading} style={s.group}><Text accessibilityRole="header" style={s.subtitle}>{section.heading}</Text>
        {!section.items.length && <Copy muted>No supported items in this section.</Copy>}
        {section.items.map((item, i) => <View key={i} style={{ gap: 6, paddingVertical: 9 }}><Copy>{item.text}</Copy><Source quote={item.quote} /></View>)}</View>)}
      </> : !needsSetup && !busy && !job?.busy && <Action icon="note" label="Generate notes" onPress={() => void generate(session)} />)}
    {tab === 'Ask' && !needsSetup && <View style={{ gap: 14 }}>
      <Label>Ask about this session</Label><TextInput multiline value={question} maxLength={1000} onChangeText={q => { setQuestion(q); setAnswer(null); }}
        editable={!busy} accessibilityLabel="Your question about the transcript" placeholder="What did we decide?" placeholderTextColor={c.muted} style={s.input} />
      <Action label="Ask question" icon="arrow" disabled={!!busy || !question.trim()} onPress={() => void run('Reading transcript…', async () => {
        const result = await ask(session, question.trim()); if (mounted.current) setAnswer(result);
      })} />
      {answer && <View style={s.group}><Text accessibilityRole="header" style={s.subtitle}>Answer</Text><Copy>{answer.answer}</Copy>{answer.quote && <Source quote={answer.quote} />}</View>}
    </View>}
  </Page>;
}
function Source({ quote }: { quote: string }) {
  return <View style={{ paddingLeft: 12, borderLeftWidth: 2, borderColor: '#8B9F89', gap: 3 }}><Label>Transcript excerpt</Label><Copy muted>“{quote}”</Copy></View>;
}
