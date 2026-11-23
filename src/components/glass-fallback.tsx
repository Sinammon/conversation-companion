import { StyleSheet, View } from 'react-native';

export function GlassFallback() {
  return <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#FFFDFA', borderRadius: 34 }]} />;
}
