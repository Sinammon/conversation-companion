import { useState } from 'react';
import { Text, View } from 'react-native';
import type { Caption, LiveDraft } from '../types';
import type { useLiveNotes } from '../ai/use-live-notes';
import { serviceUrl } from '../ai/client';
import { Action, Copy, formatTime, Label, s } from './ui';

export function DraftPassage({draft, captions}: {draft: LiveDraft; captions: Caption[]}) {
  return <View style={s.group}>
    <Label>{formatTime(captions[draft.start].at)} – {formatTime(captions[draft.end - 1].at)}</Label>
    {draft.items.map((item, i) => <View key={i} style={{gap: 4}}>
      <Copy>• {item.text}</Copy><Copy muted>“{item.quote}”</Copy>
    </View>)}
  </View>;
}

export function LiveNotesPanel({notes, captions}: {notes: ReturnType<typeof useLiveNotes>; captions: Caption[]}) {
  const [expanded, setExpanded] = useState(false);
  const {status, error} = notes.state;
  const latest = notes.drafts.at(-1);
  return <View style={s.group}>
    <Action secondary icon="note" label={status === 'off' ? 'Live notes' : 'Live notes · On'} expanded={expanded} onPress={() => setExpanded(!expanded)} />
    {expanded && <View style={s.panel}>
      {status === 'off' ? <>
        <Label>Private adult pilot</Label>
        <Copy>Every 45 seconds, new finalized captions go to Google Gemini through {serviceUrl}. Use invented or non-sensitive speech. Google may use free-tier submissions to improve its products.</Copy>
        <Copy>Enable only if everyone is 18 or older and has agreed to share the conversation with Google.</Copy>
        <Action label="Everyone agrees · Enable live notes" onPress={notes.enable} />
      </> : <>
        <Text accessibilityLiveRegion="polite" style={s.label}>{status === 'updating' ? 'Updating draft…' : status === 'error' ? 'Live notes paused' : 'Waiting for new captions'}</Text>
        {!!error && <><Copy alert>{error}</Copy><Action secondary label="Retry live notes" onPress={notes.retry} /></>}
        <Action secondary label="Turn off live notes" onPress={notes.disable} />
      </>}
      {latest && <><Label>Latest draft</Label><DraftPassage draft={latest} captions={captions} /></>}
    </View>}
  </View>;
}
