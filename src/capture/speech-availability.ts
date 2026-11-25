export function resolveSpeech<T>(probe: () => object | null, load: () => T): T | null {
  return probe() ? load() : null;
}

export function recordingPreviewMessage(speech: object | null): string {
  return speech ? '' : 'Live captions require a development build. Open a sample transcript below to try the notebook.';
}
