export type MicrophoneInput = { id: string; label: string };
export type PreparedMicrophone = {
  options: { companionInputUID?: string; companionAudioTrack?: MediaStreamTrack };
  label?: string;
  release?: () => void;
};
