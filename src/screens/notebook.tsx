import React from 'react';
import { Pressable, Text, View } from 'react-native';
import type { Session } from '../types';
import { Action, c, Copy, formatTime, Heading, Icon, Page, s, serif, Wave } from '../components/ui';

export function Notebook({ sessions, onNew, onOpen }: { sessions: Session[]; onNew: () => void; onOpen: (s: Session) => void }) {
  return <Page>
    <View style={{ gap: 3 }}><Copy muted style={{ fontSize: 14 }}>{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</Copy>
      <Heading>My notebook</Heading></View>
    <View style={{ padding: 22, borderRadius: 14, backgroundColor: c.green, gap: 13 }}>
      <View style={{ alignItems: 'center', flexDirection: 'row', gap: 14 }}>
        <View style={{ width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#789887' }}><Icon name="mic" color={c.lime} /></View>
        <View style={{ flex: 1 }}><Wave /></View>
      </View>
      <View style={{ gap: 5 }}><Text accessibilityRole="header" style={{ color: c.white, fontFamily: serif, fontSize: 29 }}>Capture a conversation</Text>
        <Copy style={{ color: '#E1EBDF' }}>Follow along with live captions, then revisit your notes.</Copy></View>
      <View style={{ alignSelf: 'flex-start', marginTop: 4 }}><Action light label="New session" icon="plus" onPress={onNew} /></View>
    </View>
    <View style={{ gap: 14, paddingTop: 6 }}>
      <View style={[s.row, { justifyContent: 'space-between', borderBottomWidth: 1, borderColor: c.line, paddingBottom: 13 }]}>
        <Text accessibilityRole="header" style={s.subtitle}>Saved sessions</Text><Text accessibilityLabel={sessions.length + ' saved sessions'} style={[s.label, { fontVariant: ['tabular-nums'] }]}>{String(sessions.length).padStart(2, '0')}</Text>
      </View>
      {!sessions.length && <View style={{ alignItems: 'center', gap: 9, paddingVertical: 18 }}>
        <View style={{ backgroundColor: c.wash, borderRadius: 12, padding: 12 }}><Icon name="book" color={c.green} size={26} /></View>
        <Copy style={{ fontWeight: '700' }}>Your notebook is empty</Copy>
        <Copy muted style={{ textAlign: 'center', maxWidth: 280 }}>Saved lectures and meetings will appear here.</Copy>
      </View>}
      {sessions.map(session => <Pressable accessibilityRole="button" key={session.id} onPress={() => onOpen(session)}
        style={({ pressed }) => [s.row, { paddingVertical: 14, borderBottomWidth: 1, borderColor: c.line, opacity: pressed ? 0.65 : 1 }]}>
        <View style={{ backgroundColor: c.wash, padding: 11, borderRadius: 9 }}><Icon name={session.mode === 'Lecture' ? 'lecture' : 'people'} /></View>
        <View style={{ flex: 1, gap: 4 }}><Text style={[s.body, { fontWeight: '700' }]}>{session.title}</Text>
          <Text style={s.label}>{session.mode} · {new Date(session.startedAt).toLocaleDateString()} · {formatTime(session.durationMs)}</Text></View>
        <Icon name="right" size={17} /></Pressable>)}
    </View>
  </Page>;
}
