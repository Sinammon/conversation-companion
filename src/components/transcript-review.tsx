import { useState } from 'react';
import { TextInput, View } from 'react-native';
import type { Session } from '../types';
import { passageIndices } from '../capture/bookmarks';
import { matchingIndices } from '../storage/search';
import { Action, c, Copy, formatTime, Label, s } from './ui';

export function TranscriptReview({ session, size, busy, onBookmarks, initialQuery }: {
  initialQuery: string; session: Session; size: number; busy: boolean; onBookmarks: (index: number, marked: boolean) => void;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [passage, setPassage] = useState<number | null>(null);
  const marks = session.bookmarks ?? [];
  const { captions } = session;
  const indices = passage === null ? matchingIndices(captions, query) : passageIndices(passage, captions.length);
  return <>
    <TextInput accessibilityLabel="Find in transcript" placeholder="Find in transcript" placeholderTextColor={c.muted}
      value={query} onChangeText={text => { setPassage(null); setQuery(text); }} style={s.input} />
    {!indices.length && !!query.trim() && <Copy muted>No matching captions.</Copy>}
    {!!marks.length && <View style={s.group}><Label>Bookmarks</Label>
      {marks.map(i => <Action key={i} secondary icon="bookmark" label={`Open bookmark · ${formatTime(captions[i].at)} · Caption ${i + 1}`}
        onPress={() => { setQuery(''); setPassage(i); }} />)}
    </View>}
    {passage !== null && <Action secondary label="Show full transcript" onPress={() => setPassage(null)} />}
    {indices.map(i => {
      const line = captions[i];
      const marked = marks.includes(i);
      return <View key={i} style={s.panel}>
        <Label>{formatTime(line.at)}{passage === i ? ' · Selected passage' : ''}</Label>
        <Copy style={{ fontSize: size, lineHeight: size * 1.45 }}>{line.text}</Copy>
        <View style={{alignSelf: 'flex-start'}}><Action secondary icon="bookmark" disabled={busy}
          label={`${marked ? 'Remove bookmark' : 'Bookmark'} · Caption ${i + 1}`}
          onPress={() => onBookmarks(i, !marked)} /></View>
      </View>;
    })}
  </>;
}
