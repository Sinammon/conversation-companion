import { StyleSheet, Text } from 'react-native';
import type { Transcript } from '../capture/transcript';
import { c } from './ui';

export type CaptionFeedProps = { transcript: Transcript; size: number; follow: boolean; stopped: boolean };

export const captionFeedStyles = StyleSheet.create({
  frame: { flex: 1, minHeight: 64, backgroundColor: c.reader, borderRadius: 16, borderWidth: 1, borderColor: c.line },
  content: { padding: 16, gap: 14 },
});

export function CaptionLine({ text, size, interim = false }: { text: string; size: number; interim?: boolean }) {
  return <Text selectable style={{ fontSize: size, lineHeight: size * 1.45, color: interim ? c.muted : c.ink }}>{text}</Text>;
}
