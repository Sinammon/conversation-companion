import { useEffect, useState } from 'react';
import { AccessibilityInfo, StyleSheet } from 'react-native';
import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';
import { GlassFallback } from './glass-fallback';

export function GlassMaterial() {
  const [opaque, setOpaque] = useState(true);
  useEffect(() => {
    let current = true;
    const update = (enabled: boolean) => { if (current) setOpaque(enabled); };
    const listener = AccessibilityInfo.addEventListener('reduceTransparencyChanged', update);
    void AccessibilityInfo.isReduceTransparencyEnabled().then(update, () => {});
    return () => { current = false; listener.remove(); };
  }, []);
  if (opaque || !isGlassEffectAPIAvailable() || !isLiquidGlassAvailable()) return <GlassFallback />;
  return <GlassView pointerEvents="none" glassEffectStyle="regular" colorScheme="dark"
    style={[StyleSheet.absoluteFill, { borderRadius: 34 }]} />;
}
