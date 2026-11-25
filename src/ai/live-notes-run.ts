import type { Transcript } from '../capture/transcript';
import type { DraftItem, LiveDraft } from '../types';

export type LiveState = { status: 'off' | 'waiting' | 'updating' | 'error'; error?: string };

export class LiveNotesRun {
  private cursor: number;
  private batchEnd?: number;
  private request?: AbortController;
  private stopped = false;
  private failed = false;

  constructor(initial: Transcript, private read: () => Transcript | null,
    private generate: (text: string, signal: AbortSignal) => Promise<DraftItem[]>,
    private update: (state: LiveState) => void, private save: (draft: LiveDraft) => void) {
    // An interim utterance that began before consent can contain earlier speech.
    this.cursor = initial.final.length + (initial.partial ? 1 : 0);
  }

  stop() {
    this.stopped = true;
    this.request?.abort();
  }

  retry() {
    this.failed = false;
    return this.tick();
  }

  async tick() {
    if (this.stopped || this.failed || this.request) return;
    const words = this.read();
    if (!words || this.cursor >= words.final.length) return;
    const start = this.cursor;
    const end = this.batchEnd ?? words.final.length;
    this.batchEnd = end;
    const text = words.final.slice(start, end).map(line => line.text).join('\n');
    const request = new AbortController();
    this.request = request;
    this.update({status: 'updating'});
    try {
      const items = await this.generate(text, request.signal);
      if (this.stopped || !this.read()) return;
      if (items.length) this.save({start, end, items});
      this.cursor = end;
      this.batchEnd = undefined;
      this.update({status: 'waiting'});
    } catch (error) {
      if (this.stopped || !this.read()) return;
      this.failed = true;
      this.update({status: 'error', error: error instanceof Error ? error.message : 'Could not update live notes.'});
    } finally {
      this.request = undefined;
    }
  }
}
