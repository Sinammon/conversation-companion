import { useCallback, useEffect, useMemo, useRef } from 'react';
import { FlatList, View } from 'react-native';
import { finish } from '../capture/transcript';
import type { Caption } from '../types';
import { CaptionLine, captionFeedStyles } from './caption-feed-shared';
import type { CaptionFeedProps } from './caption-feed-shared';
import { Copy } from './ui';

// Final captions are append-only within a session. Keep keys stable as the interim line changes.
const captionKey = (_line: Caption, index: number) => String(index);

export function CaptionFeed({ transcript, size, follow, stopped }: CaptionFeedProps) {
  const list = useRef<FlatList<Caption>>(null);
  const rows = useMemo(() => finish(transcript), [transcript]);
  const followEnd = useCallback(() => {
    if (follow) list.current?.scrollToEnd({ animated: false });
  }, [follow]);
  useEffect(followEnd, [followEnd]);

  return <FlatList
    ref={list}
    testID="caption-feed"
    style={captionFeedStyles.frame}
    contentContainerStyle={{ padding: 16 }}
    data={rows}
    keyExtractor={captionKey}
    renderItem={({ item, index }) => <CaptionLine text={item.text} size={size} interim={index === transcript.final.length} />}
    ItemSeparatorComponent={CaptionGap}
    ListEmptyComponent={<Copy muted>{stopped ? 'No speech captured yet.' : 'Captions will appear when someone speaks.'}</Copy>}
    removeClippedSubviews={false}
    onContentSizeChange={followEnd}
    onLayout={followEnd}
  />;
}

function CaptionGap() { return <View style={{ height: 14 }} />; }
