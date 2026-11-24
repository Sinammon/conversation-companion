import React from 'react';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import type { DemoId, Session } from '../types';
import { demoIds, demos } from '../ai/demos';
import { Action, c, Copy, formatTime, Heading, Icon, Page, s, bold } from '../components/ui';

import { Orb } from '../components/orb';
import { Ribbons } from '../components/ribbons';

export function Notebook({ sessions, onNew, onOpen, onDemo, openingDemo, demoError }: {
  sessions: Session[]; onNew: () => void; onOpen: (s: Session) => void;
  onDemo: (id: DemoId) => void; openingDemo: boolean; demoError: string;
}) {
  const { width } = useWindowDimensions();
  const wide = width >= 850;
  const inset = wide ? 36 : 20;
  return <Page>
    <View style={[s.row, { justifyContent: 'space-between', flexWrap: 'wrap' }]}><Heading>My notebook</Heading>
      <Copy muted style={{ fontSize: 13 }}>{new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', weekday: 'short' })}</Copy></View>
    <View dataSet={{ hero: true }} style={[s.panel, { padding: inset, borderRadius: 28, backgroundColor: '#303D60', overflow: 'hidden', justifyContent: 'center', minHeight: wide ? 276 : 235 }]}>
      <Ribbons color="#A3BBFF" />
      <View style={{ position: 'absolute', right: wide ? '5%' : -4, top: wide ? 4 : 5 }}><Orb size={wide ? 242 : width < 360 ? 100 : 132} /></View>
      <Text accessibilityRole="header" style={{ color: c.ink, fontFamily: bold, fontSize: wide ? 46 : 31, lineHeight: wide ? 50 : 35, letterSpacing: -1.3, maxWidth: wide ? '61%' : '68%' }}>Capture a conversation</Text>
      <Copy style={{ color: '#D2DCF0', maxWidth: wide ? 315 : '72%' }}>Read live captions and save the transcript for later.</Copy>
      <View style={{ alignSelf: 'flex-start', marginTop: 8 }}><Action recording label="New session" icon="mic" onPress={onNew} /></View>
    </View>
    <View style={{ gap: 12 }}>
      <Text accessibilityRole="header" style={s.subtitle}>Try Gemini notes</Text>
      <View style={{ flexDirection: width < 350 ? 'column' : 'row', gap: 12 }}>
        {demoIds.map(id => {
          const lecture = id === 'lecture';
          const tint = lecture ? '#9AF1DE' : '#DFCBFF';
          return <Pressable key={id} dataSet={{ lift: true }} accessibilityRole="button" accessibilityLabel={demos[id].title}
            disabled={openingDemo} onPress={() => onDemo(id)} style={({ pressed }) => [s.panel, {
              flex: 1, overflow: 'hidden', padding: wide ? 22 : 16, gap: 12, backgroundColor: lecture ? '#234C55' : '#453C61',
              borderColor: lecture ? '#4A7B80' : '#71638D', opacity: pressed || openingDemo ? .8 : 1 }]}>
            <Ribbons color={tint} />
            <View style={[s.row, { justifyContent: 'space-between' }]}><Icon name={lecture ? 'lecture' : 'people'} color={tint} size={28} /><Icon name="arrow" color={tint} size={18} /></View>
            <View><Text style={[s.body, { fontFamily: bold, fontSize: wide ? 21 : 17 }]}>{demos[id].title}</Text>
              <Text style={{ color: tint, fontSize: 13, marginTop: 4 }}>Sample transcript</Text></View>
          </Pressable>;
        })}
      </View>
      {!!demoError && <Copy alert>{demoError}</Copy>}
    </View>
    <View style={{ gap: 14, paddingTop: 6 }}>
      <View style={[s.row, { justifyContent: 'space-between', borderBottomWidth: 1, borderColor: c.line, paddingBottom: 13 }]}>
        <Text accessibilityRole="header" style={s.subtitle}>Saved sessions</Text>{sessions.length > 0 && <Text accessibilityLabel={sessions.length + ' saved sessions'} style={[s.label, { fontVariant: ['tabular-nums'] }]}>{sessions.length}</Text>}
      </View>
      {!sessions.length && <View style={{ alignItems: 'center', gap: 6, paddingVertical: 18, backgroundColor: c.surface, borderRadius: 18 }}>
        <View style={{ backgroundColor: c.wash, borderRadius: 12, padding: 12 }}><Icon name="book" color={c.green} size={26} /></View>
        <Copy style={{ fontWeight: '700' }}>Your notebook is empty</Copy>
        <Copy muted style={{ textAlign: 'center', maxWidth: 280 }}>Saved lectures and meetings will appear here.</Copy>
      </View>}
      {sessions.map(session => <Pressable dataSet={{ lift: true }} accessibilityRole="button" key={session.id} onPress={() => onOpen(session)}
        style={({ pressed }) => [s.row, { padding: 16, backgroundColor: c.surface, borderRadius: 18, borderWidth: 1, borderColor: c.line, opacity: pressed ? 0.65 : 1 }]}>
        <View style={{ backgroundColor: c.wash, padding: 11, borderRadius: 9 }}><Icon name={session.mode === 'Lecture' ? 'lecture' : 'people'} /></View>
        <View style={{ flex: 1, gap: 4 }}><Text style={[s.body, { fontWeight: '700' }]}>{session.title}</Text>
          <View style={[s.row, { flexWrap: 'wrap', gap: 8 }]}>
            <Text style={[s.label, { color: session.mode === 'Lecture' ? '#A4EFDF' : '#DCC5FF', backgroundColor: session.mode === 'Lecture' ? '#264C54' : '#493E60',
              paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }]}>{session.mode}</Text>
            <Text style={s.label}>{new Date(session.startedAt).toLocaleDateString()} · {formatTime(session.durationMs)}</Text>
          </View></View>
        <Icon name="right" size={17} /></Pressable>)}
    </View>
  </Page>;
}
