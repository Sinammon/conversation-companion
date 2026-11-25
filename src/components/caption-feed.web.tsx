import { useCallback, useEffect, useRef } from 'react';
import type { ComponentRef } from 'react';
import { ScrollView } from 'react-native';
import { CaptionLine, captionFeedStyles } from './caption-feed-shared';
import type { CaptionFeedProps } from './caption-feed-shared';
import { Copy } from './ui';

export function CaptionFeed({ transcript, size, follow, stopped }: CaptionFeedProps) {
  const list = useRef<ComponentRef<typeof ScrollView>>(null);
  const followEnd = useCallback(() => {
    if (follow) list.current?.scrollToEnd({ animated: false });
  }, [follow]);
  useEffect(followEnd, [followEnd]);

  return <ScrollView ref={list} testID="caption-feed" style={captionFeedStyles.frame}
    contentContainerStyle={captionFeedStyles.content} onContentSizeChange={followEnd} onLayout={followEnd}>
    {!transcript.final.length && !transcript.partial && <Copy muted>{stopped ? 'No speech captured yet.' : 'Captions will appear when someone speaks.'}</Copy>}
    {transcript.final.map((line, index) => <CaptionLine key={index} text={line.text} size={size} />)}
    {transcript.partial && <CaptionLine text={transcript.partial.text} size={size} interim />}
  </ScrollView>;
}
