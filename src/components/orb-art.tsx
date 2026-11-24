import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

export function OrbArt({ size }: { size: number }) {
  return <Svg width={size} height={size} viewBox="0 0 100 100" aria-hidden accessible={false}>
    <Defs><RadialGradient id="orb" cx="47%" cy="42%" r="53%">
      <Stop offset="0" stopColor="#3A4776" /><Stop offset=".51" stopColor="#485482" />
      <Stop offset=".72" stopColor="#949CE0" /><Stop offset=".84" stopColor="#C7C7FF" />
      <Stop offset=".89" stopColor="#ADFFF3" /><Stop offset=".94" stopColor="#8784EF" stopOpacity=".56" />
      <Stop offset="1" stopColor="#958AFF" stopOpacity="0" />
    </RadialGradient></Defs><Circle cx="50" cy="50" r="48" fill="url(#orb)" />
  </Svg>;
}
