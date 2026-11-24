import { StyleSheet, View } from 'react-native';

export function GlassFallback() {
  return <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#293953', borderRadius: 34 }]} />;
}
