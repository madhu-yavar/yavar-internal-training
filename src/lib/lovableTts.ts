import { createParser } from "eventsource-parser";

/**
 * Streams TTS audio from /api/tts (Lovable AI Gateway, openai/gpt-4o-mini-tts)
 * and plays it progressively via Web Audio. PCM 24kHz 16-bit mono.
 */
export class LovableTtsPlayer {
  private ctx: AudioContext | null = null;
  private abort: AbortController | null = null;
  private playhead = 0;
  private pending = new Uint8Array(0);
  private sources: AudioBufferSourceNode[] = [];
  private endTimer: ReturnType<typeof setTimeout> | null = null;
  private stopped = false;
  private rate = 1;

  setRate(r: number) {
    this.rate = Math.max(0.5, Math.min(2, r));
    for (const s of this.sources) {
      try { s.playbackRate.value = this.rate; } catch { /* noop */ }
    }
  }

  /**
   * Create + resume the AudioContext synchronously. MUST be called from a
   * user-gesture handler (click, keydown). Otherwise iframes leave the
   * context suspended and no audio is ever heard.
   */
  prime(): void {
    if (this.ctx) return;
    this.stopped = false;
    try {
      this.ctx = new AudioContext({ sampleRate: 24000 });
      // resume() returns a promise but the unlock itself happens in the
      // synchronous gesture frame — do not await here.
      if (this.ctx.state === "suspended") void this.ctx.resume().catch(() => {});
    } catch {
      this.ctx = null;
    }
  }

  async speak(text: string, voice = "shimmer"): Promise<void> {
    this.stopped = false;
    this.abort = new AbortController();
    if (!this.ctx) {
      this.ctx = new AudioContext({ sampleRate: 24000 });
    }
    if (this.ctx.state === "suspended") {
      try { await this.ctx.resume(); } catch { /* noop */ }
    }
    this.playhead = 0;
    this.pending = new Uint8Array(0);


    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, voice }),
      signal: this.abort.signal,
    }).catch((e) => {
      if (this.stopped) return null;
      throw e;
    });
    if (this.stopped) return;
    if (!res) return;
    if (!res.ok || !res.body) {
      throw new Error(`TTS failed: ${res.status} ${await res.text().catch(() => "")}`);
    }

    const parser = createParser({
      onEvent: (event) => {
        if (this.stopped) return;
        let payload: { type: string; audio?: string };
        try { payload = JSON.parse(event.data); } catch { return; }
        if (payload.type !== "speech.audio.delta" || !payload.audio) return;
        const binary = atob(payload.audio);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        this.playChunk(bytes);
      },
    });

    const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        parser.feed(value);
      }
    } catch (e) {
      if (this.stopped) return;
      throw e;
    }

    // Wait until scheduled playback finishes
    if (!this.ctx || this.stopped) return;
    const remaining = Math.max(0, this.playhead - this.ctx.currentTime);
    await new Promise<void>((resolve) => {
      this.endTimer = setTimeout(resolve, remaining * 1000 + 80);
    });
  }

  private playChunk(incoming: Uint8Array) {
    if (!this.ctx) return;
    const bytes = new Uint8Array(this.pending.length + incoming.length);
    bytes.set(this.pending);
    bytes.set(incoming, this.pending.length);
    const usable = bytes.length - (bytes.length % 2);
    this.pending = bytes.slice(usable);
    if (usable === 0) return;

    const samples = new Int16Array(bytes.buffer, 0, usable / 2);
    const floats = Float32Array.from(samples, (s) => s / 32768);
    const buffer = this.ctx.createBuffer(1, floats.length, 24000);
    buffer.copyToChannel(floats, 0);
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = this.rate;
    source.connect(this.ctx.destination);
    if (this.playhead === 0) {
      this.playhead = this.ctx.currentTime + 0.05;
    } else {
      this.playhead = Math.max(this.playhead, this.ctx.currentTime);
    }
    source.start(this.playhead);
    this.playhead += buffer.duration / this.rate;
    this.sources.push(source);
  }

  /** Stop current playback but KEEP the AudioContext alive so the next
   *  speak() call doesn't lose its user-gesture unlock. */
  stop() {
    this.stopped = true;
    if (this.endTimer) { clearTimeout(this.endTimer); this.endTimer = null; }
    if (this.abort) { try { this.abort.abort(); } catch { /* noop */ } this.abort = null; }
    for (const s of this.sources) { try { s.stop(); } catch { /* noop */ } }
    this.sources = [];
    this.playhead = 0;
    this.pending = new Uint8Array(0);
  }

  /** Full teardown — only on unmount. */
  dispose() {
    this.stop();
    if (this.ctx) { try { this.ctx.close(); } catch { /* noop */ } this.ctx = null; }
  }

}
