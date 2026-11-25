export type Mode = 'Lecture' | 'Meeting';
export type DemoId = 'lecture' | 'meeting';
export type Caption = { text: string; at: number }; // milliseconds from session start
export type DraftItem = { text: string; quote: string };
/** Half-open range of finalized caption indices. */
export type LiveDraft = { start: number; end: number; source?: 'device' | 'gemini'; items: DraftItem[] };
export type NoteSection = { heading: string; items: { text: string; quote: string }[] };
export type Notes = { summary: string; sections: NoteSection[] };
export type Answer = { answer: string; quote: string | null };
export type Session = {
  id: string;
  title: string;
  mode: Mode;
  startedAt: number;
  durationMs: number;
  captions: Caption[];
  allowAI: boolean;
  approvedUrl?: string;
  approvedProvider?: 'gemini';
  demoId?: DemoId;
  notes?: Notes;
  bookmarks?: number[];
  liveDrafts?: LiveDraft[];
};
