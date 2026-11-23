import React from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { TextStyle, ViewStyle } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

export const c = {
  paper: '#F8F5EF', ink: '#202421', muted: '#555A53', green: '#234B3E', lime: '#DEE9DA', line: '#DDD8CD',
  wash: '#EBE8E0', white: '#FFFFFF', surface: '#FFFDFA', error: '#8E3028', record: '#A23D31', recordWash: '#F7E7E0',
};
export const serif = Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia, serif' });
const paths = {
  mic: 'M9 6a3 3 0 0 1 6 0v6a3 3 0 0 1-6 0z M5 11v1a7 7 0 0 0 14 0v-1 M12 19v3 M9 22h6',
  book: 'M4 4h13a2 2 0 0 1 2 2v14H6a2 2 0 0 1-2-2z M7 4v16 M10 8h6 M10 11h4',
  tune: 'M3 6h6m4 0h8M3 12h12m4 0h2M3 18h3m4 0h11 M9 4v4m6 2v4M6 16v4',
  arrow: 'M4 12h15m-6-6 6 6-6 6', back: 'M20 12H5m6-6-6 6 6 6',
  right: 'm9 5 7 7-7 7', plus: 'M12 5v14M5 12h14', check: 'm4 12 5 5L20 6',
  people: 'M3 20v-2a5 5 0 0 1 10 0v2 M15 14a5 5 0 0 1 6 5v1 M5 7a3 3 0 1 0 6 0 3 3 0 1 0-6 0 M15 4a3 3 0 1 1 0 6',
  lecture: 'm2 9 10-5 10 5-10 5z M6 12v5q6 4 12 0v-5 M22 9v7',
  shield: 'm12 3 8 3v5q0 7-8 11-8-4-8-11V6z M8 12l3 3 5-6',
  note: 'M5 3h10l4 4v14H5z M14 3v5h5 M8 12h8 M8 16h6',
  stop: 'M6 6h12v12H6z', pause: 'M8 5v14 M16 5v14', sound: 'M3 10v4m4-8v12m5-16v20m5-17v14m4-9v4',
};
export type IconName = keyof typeof paths;
export function Icon({ name, size = 22, color = c.ink }: { name: IconName; size?: number; color?: string }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" accessible={false} aria-hidden><Path d={paths[name]} fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" /></Svg>;
}
export function Wave() {
  const heights = [4,6,4,8,12,8,14,22,13,20,31,42,25,18,30,48,61,43,26,35,55,66,48,29,37,24,18,33,45,27,17,23,14,9,15,8,5,7,4];
  return <Svg width="100%" height={64} viewBox="0 0 248 70" preserveAspectRatio="none" accessible={false} aria-hidden>
    {heights.map((h,i) => <Rect key={i} x={i*6.4} y={(70-h)/2} width={2.8} height={h} rx={1.4} fill={c.record} opacity={0.30 + h / 110} />)}
  </Svg>;
}
export function Copy({ children, style, muted, alert }: { children: React.ReactNode; style?: TextStyle; muted?: boolean; alert?: boolean }) {
  return <Text selectable accessibilityRole={alert ? 'alert' : undefined} style={[s.body, muted && { color: c.muted }, alert && { color: c.error }, style]}>{children}</Text>;
}
export function Heading({ children }: { children: React.ReactNode }) {
  return <Text accessibilityRole="header" style={s.title}>{children}</Text>;
}
export function Label({ children }: { children: React.ReactNode }) { return <Text style={s.label}>{children}</Text>; }
export function Action({ label, onPress, icon, secondary, recording, disabled, expanded }: {
  label: string; onPress: () => void; icon?: IconName; secondary?: boolean; recording?: boolean; disabled?: boolean; expanded?: boolean;
}) {
  const color = secondary ? c.ink : c.white;
  return <Pressable accessibilityRole="button" aria-expanded={expanded} accessibilityState={{ disabled: !!disabled, expanded }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [s.action, { backgroundColor: secondary ? c.wash : recording ? c.record : c.green, opacity: disabled ? 0.56 : pressed ? 0.82 : 1 }]}>
    {icon && <Icon name={icon} color={color} size={19} />}<Text style={[s.actionText, { color }]}>{label}</Text>
  </Pressable>;
}
export function Choices<T extends string>({ values, selected, onChange }: { values: readonly T[]; selected: T; onChange: (v: T) => void }) {
  return <View style={s.choices}>{values.map(value => <Pressable key={value} accessibilityRole="radio" aria-checked={value === selected} accessibilityState={{ checked: value === selected }}
    onPress={() => onChange(value)} style={[s.choice, value === selected && s.activeChoice]}>
    <Text style={[s.choiceText, value === selected && { color: c.white }]}>{value}</Text></Pressable>)}</View>;
}
export function Page({ children, extra }: { children: React.ReactNode; extra?: ViewStyle }) {
  return <ScrollView keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets contentContainerStyle={[s.page, extra]}>{children}</ScrollView>;
}
export function formatTime(ms: number) {
  const sec = Math.floor(ms / 1000);
  return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
}
export const s = StyleSheet.create({
  page: { paddingHorizontal: 22, paddingTop: 20, paddingBottom: 36, gap: 22, width: '100%', maxWidth: 720, alignSelf: 'center' },
  body: { fontSize: 16, lineHeight: 24, color: c.ink },
  title: { fontFamily: serif, fontSize: 42, lineHeight: 50, letterSpacing: -1.5, color: c.ink },
  subtitle: { fontFamily: serif, fontSize: 26, color: c.ink, letterSpacing: -0.55 },
  label: { fontSize: 13, fontWeight: '700', color: c.muted, letterSpacing: 0.4 },
  action: { flexDirection: 'row', gap: 9, minHeight: 50, borderRadius: 14, borderCurve: 'continuous', paddingHorizontal: 17, paddingVertical: 13, alignItems: 'center', justifyContent: 'center' },
  actionText: { fontSize: 16, fontWeight: '700', flexShrink: 1 },
  choices: { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: c.wash, padding: 4, borderRadius: 9, gap: 2 },
  choice: { flexGrow: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 9, paddingVertical: 9, borderRadius: 6 },
  choiceText: { fontSize: 15, color: c.muted, fontWeight: '600' }, activeChoice: { backgroundColor: c.green },
  input: { borderWidth: 1, borderColor: '#829184', borderRadius: 8, padding: 14, color: c.ink, backgroundColor: c.white, minHeight: 50, fontSize: 17 },
  group: { gap: 9 }, row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
