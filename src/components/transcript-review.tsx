import { useState } from 'react';
import { View } from 'react-native';
import type { Session } from '../types';
import { passageIndices } from '../capture/bookmarks';
import { Action, Copy, formatTime, Label, s } from './ui';

export function TranscriptReview({ session, size, busy, onBookmarks }: {
  session: Session; size: number; busy: boolean; onBookmarks: (marks: number[]) => void;
}) {
  const [passage, setPassage] = useState<number | null>(null);
  const marks = session.bookmarks ?? [];
  const { captions } = session;
  const indices = passage === null ? captions.map((_, i) => i) : passageIndices(passage, captions.length);
  return <>
    {!!marks.length && <View style={s.group}><Label>Bookmarks</Label>
      {marks.map(i => <Action key={i} secondary icon="bookmark" label={`Open bookmark · ${formatTime(captions[i].at)} · Caption ${i + 1}`}
        onPress={() => setPassage(i)} />)}
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
          onPress={() => onBookmarks(marked ? marks.filter(mark => mark !== i) : [...marks, i].sort((a,b) => a-b))} /></View>
      </View>;
    })}
  </>;
}
