export function cleanBookmarks(value: unknown, count: number): number[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter(index => Number.isInteger(index) && index >= 0 && index < count))].sort((a, b) => a - b);
}

export function editBookmark(stored: unknown, count: number, index: number, marked: boolean) {
  const marks = cleanBookmarks(stored, count).filter(mark => mark !== index);
  return marked ? cleanBookmarks([...marks, index], count) : marks;
}

export function passageIndices(index: number, count: number): number[] {
  const start = Math.max(0, index - 2);
  const end = Math.min(count, index + 3);
  return Array.from({length: end - start}, (_, offset) => start + offset);
}
