import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

// Interleaved contour lines give the glass a drawn sound-wave texture.
export function Ribbons({ color }: { color: string }) {
  return <View pointerEvents="none" aria-hidden style={StyleSheet.absoluteFill}><Svg width="100%" height="100%" viewBox="0 0 600 190" preserveAspectRatio="none">
    {Array.from({ length: 16 }, (_, i) => <Path key={i} d={`M -80 ${184+i*3} C 80 ${198+i*2}, 117 ${139-i*2}, 245 ${162+i*2} S 384 ${209-i}, 458 ${145-i*2} S 548 ${126+i}, 680 ${50+i*4}`}
      fill="none" stroke={color} strokeWidth=".85" opacity={.11+i*.008} />)}
  </Svg></View>;
}
