export function normalizeRecordingLevel(level: number) {
  return Number.isFinite(level) ? Math.min(1, Math.max(0, level / 10)) : 0;
}
