import React, { useEffect, useRef, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { Action, c, Choices, Copy, formatTime, Heading, Label, Page, s } from '../components/ui';
import { TranscriptReview } from '../components/transcript-review';
import { ask, serviceUrl } from '../ai/client';
import { isApproved } from '../ai/consent';
import { demoForSession, transcriptOf } from '../ai/demos';
import type { NoteJob } from '../ai/use-notes';
import type { Answer, Session } from '../types';

export function Detail({ session, size, job, generate, onBookmarks, onUpdate, onDelete, onBack }: {
  onBookmarks: (indices: number[]) => Promise<void>;
  job?: NoteJob; generate: (s: Session) => Promise<void>;
  session: Session; size: number; onUpdate: (s: Session) => Promise<void>; onDelete: () => Promise<void>; onBack: () => void;
}) {
  const [tab, setTab] = useState<'Transcript' | 'Notes' | 'Ask'>(session.notes ? 'Notes' : 'Transcript');
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [question, setQuestion] = useState('');
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
  const demo = demoForSession(session);
  const transcript = transcriptOf(session);
  const validTranscript = !!transcript.trim() && transcript.length <= 200000;
  const canGenerate = validTranscript && isApproved(session, serviceUrl);
  function submitQuestion(text: string) {
    if (!text.trim()) return;
    void run('Reading transcript…', async () => {
      setAnswer(null);
      const result = await ask(session, text);
      if (mounted.current) setAnswer(result);
    });
  }
  return <Page>
    <View style={{ alignSelf: 'flex-start' }}><Action secondary icon="back" label="Notebook" onPress={onBack} /></View>
    <View style={s.group}><Label>{session.mode} · {new Date(session.startedAt).toLocaleDateString()} · {formatTime(session.durationMs)}</Label><Heading>{session.title}</Heading></View>
    {demo && <Copy muted>Made-up transcript for trying Gemini.</Copy>}
    <Choices values={['Transcript', 'Notes', 'Ask']} selected={tab} onChange={value => { setTab(value); setConfirm(false); }} />
    {!!busy && <Text accessibilityLiveRegion="polite" style={s.label}>{busy}</Text>}
    {!!error && <Copy alert>{error}</Copy>}
    {tab === 'Notes' && job?.busy && <Copy>Writing notes…</Copy>}
    {tab === 'Notes' && !!job?.error && <Copy alert>{job.error}</Copy>}
    {tab === 'Transcript' && <>
      <TranscriptReview session={session} size={size} busy={!!busy} onBookmarks={marks => void run('Saving bookmark…', () => onBookmarks(marks))} />
      {confirm ? <View style={s.group}><Copy>Delete this session and its notes from this device?</Copy><Action label="Keep session" secondary onPress={() => setConfirm(false)} />
        <Action label="Delete permanently" disabled={!!busy} onPress={() => void run('Deleting…', onDelete)} /></View>
        : <Action secondary label="Delete session" disabled={!!busy} onPress={() => setConfirm(true)} />}
    </>}
    {tab !== 'Transcript' && !canGenerate && <View style={s.panel}>
      {!validTranscript ? <Copy muted>{transcript.length > 200000 ? 'This transcript exceeds the 200,000-character limit for AI.' : 'A saved transcript is needed for notes and questions.'}</Copy> :
        !serviceUrl ? <Copy muted>Set EXPO_PUBLIC_AI_URL on the PC and restart the app to connect the notes service.</Copy> :
        <>
          <Text accessibilityRole="header" style={s.subtitle}>Share this transcript?</Text>
          <Copy muted>When you request notes or ask a question, Google Gemini receives the transcript and any question you submit through {serviceUrl}. Google may use free-tier content to improve its products.</Copy>
          {!demo && <Copy>By allowing sharing, you confirm that the participants agreed to share the transcript with Google.</Copy>}
          <Action label="Allow sharing with Google Gemini" disabled={!!busy} onPress={() => void run('Saving…', () =>
            onUpdate({ ...session, allowAI: true, approvedUrl: serviceUrl, approvedProvider: 'gemini' }))} />
        </>}
    </View>}
    {tab === 'Notes' && session.notes && <>
      <View style={s.panel}><Text accessibilityRole="header" style={s.subtitle}>Summary</Text><Copy>{session.notes.summary}</Copy></View>
      {session.notes.sections.map(section => <View key={section.heading} style={s.panel}><Text accessibilityRole="header" style={s.subtitle}>{section.heading}</Text>
        {!section.items.length && <Copy muted>No supported items in this section.</Copy>}
        {section.items.map((item, i) => <View key={i} style={{ gap: 6, paddingVertical: 9 }}><Copy>{item.text}</Copy><Source quote={item.quote} /></View>)}</View>)}
      </>}
    {tab === 'Notes' && canGenerate && !busy && !job?.busy &&
      <Action icon="note" label={session.notes ? 'Regenerate notes' : 'Generate notes'} onPress={() => void generate(session)} />}
    {tab === 'Ask' && canGenerate && <View style={{ gap: 14 }}>
      <Label>Question about this transcript</Label>
      <TextInput multiline accessibilityLabel="Question about this transcript" value={question}
        onChangeText={text => { setQuestion(text); setAnswer(null); }} maxLength={1000} editable={!busy} style={s.input} />
      <Action label="Ask question" icon="arrow" disabled={!!busy || !question.trim()} onPress={() => submitQuestion(question)} />
      {demo?.questions.map(text => <Action key={text} label={text} secondary disabled={!!busy}
        onPress={() => { setQuestion(text); submitQuestion(text); }} />)}
      {answer && <View style={s.panel}><Text accessibilityRole="header" style={s.subtitle}>Answer</Text><Copy>{answer.answer}</Copy>{answer.quote && <Source quote={answer.quote} />}</View>}
    </View>}
  </Page>;
}
function Source({ quote }: { quote: string }) {
  return <View style={{ paddingLeft: 12, borderLeftWidth: 2, borderColor: c.green, gap: 3 }}><Label>Transcript excerpt</Label><Copy muted>“{quote}”</Copy></View>;
}
