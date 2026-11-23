import { View } from 'react-native';
import { Choices, Label, s } from './ui';

export const captionSizes = { Standard: 21, Large: 26, Largest: 34 };
export type CaptionSize = keyof typeof captionSizes;
const options = ['Standard', 'Large', 'Largest'] as const;

export function CaptionSizeControl({ size, onChange }: { size: number; onChange: (label: CaptionSize) => void }) {
  const selected = options.find(label => captionSizes[label] === size) ?? 'Large';
  return <View style={s.group}>
    <Label>Caption size</Label>
    <Choices values={options} selected={selected} onChange={onChange} />
  </View>;
}
