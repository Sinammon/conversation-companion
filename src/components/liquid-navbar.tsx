import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { ReduceMotion, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { GlassMaterial } from './glass-material';
import { c, Icon } from './ui';

const tabs = [{ name: 'Notebook', icon: 'book' }, { name: 'Preferences', icon: 'tune' }] as const;
export type MainTab = typeof tabs[number]['name'];
const inset = 5;

export function LiquidNavbar({ active, onChange }: { active: MainTab; onChange: (tab: MainTab) => void }) {
  const [width, setWidth] = useState(0);
  const cellWidth = Math.max(0, (width - inset * 2) / tabs.length);
  const index = tabs.findIndex(tab => tab.name === active);
  const position = useSharedValue(index);
  useEffect(() => {
    position.set(withSpring(index, { damping: 24, stiffness: 320, overshootClamping: true, reduceMotion: ReduceMotion.System }));
  }, [index, position]);
  const highlight = useAnimatedStyle(() => ({ transform: [{ translateX: position.get() * cellWidth }] }));

  return <View accessibilityRole="tablist" accessibilityLabel="Main navigation" style={styles.dock}
    onLayout={event => setWidth(event.nativeEvent.layout.width)}>
    <GlassMaterial />
    {cellWidth > 0 && <Animated.View pointerEvents="none" style={[styles.selection, { width: cellWidth }, highlight]} />}
    {tabs.map(tab => {
      const selected = tab.name === active;
      const color = selected ? c.green : c.muted;
      return <Pressable key={tab.name} accessibilityRole="tab" accessibilityLabel={tab.name}
        aria-selected={selected} accessibilityState={{ selected }} onPress={() => onChange(tab.name)}
        style={({ pressed }) => [styles.tab, pressed && { opacity: 0.7 }]}>
        <Icon name={tab.icon} size={21} color={color} />
        <Text style={[styles.label, { color, fontWeight: selected ? '700' : '500' }]}>{tab.name}</Text>
      </Pressable>;
    })}
  </View>;
}

const styles = StyleSheet.create({
  dock: { flexDirection: 'row', alignSelf: 'center', width: '90%', maxWidth: 396, padding: inset, marginTop: 4, marginBottom: 10,
    borderRadius: 34, boxShadow: '0px 4px 18px rgba(46, 35, 22, 0.12)' },
  selection: { position: 'absolute', left: inset, top: inset, bottom: inset, borderRadius: 29, backgroundColor: c.wash },
  tab: { flex: 1, minHeight: 54, justifyContent: 'center', alignItems: 'center', gap: 3, paddingVertical: 6, paddingHorizontal: 8 },
  label: { fontSize: 12, textAlign: 'center' },
});
