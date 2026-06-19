// Streaming client for a self-hosted WebSocket TTS endpoint.
// Server contract (as provided):
//   URL: ws(s)://host/tts/stream/tts?speed=1.0&voice=af_heart&lang_code=a
//   Send: { "type": "text", "content": "..." }
//   Receive: binary audio frames (raw PCM int16 mono @ 24kHz by default,
//            or WAV if the first 4 bytes are "RIFF"). Optional JSON
//            control frames like {"type":"end"} are recognised.

export type WsTtsOptions = {
  url: string;            // ws:// or wss://
  sampleRate?: number;    // default 24000
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: Error) => void;
};

export class WsTtsPlayer {
  private ctx: AudioContext | null = null;
  private ws: WebSocket | null = null;
  private playhead = 0;
  private pending = new Uint8Array(0);
  private opts: Required<Pick<WsTtsOptions, "sampleRate">> & WsTtsOptions;
  private active = false;
  private endTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(opts: WsTtsOptions) {
    this.opts = { sampleRate: 24000, ...opts };
  }

  async speak(text: string): Promise<void> {
    this.stop();
    this.active = true;

    if (!this.ctx) {
      this.ctx = new AudioContext({ sampleRate: this.opts.sampleRate });
    }
    if (this.ctx.state === "suspended") await this.ctx.resume().catch(() => {});
    this.playhead = 0;
    this.pending = new Uint8Array(0);

    return new Promise<void>((resolve, reject) => {
      let ws: WebSocket;
      try {
        ws = new WebSocket(this.opts.url);
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        this.opts.onError?.(err);
        reject(err);
        return;
      }
      ws.binaryType = "arraybuffer";
      this.ws = ws;

      const finish = () => {
        if (!this.active) return;
        this.active = false;
        try { ws.close(); } catch {}
        // wait for already-scheduled audio to finish
        const remaining = Math.max(0, this.playhead - (this.ctx?.currentTime ?? 0));
        setTimeout(() => {
          this.opts.onEnd?.();
          resolve();
        }, Math.min(remaining * 1000 + 50, 30_000));
      };

      // If no data arrives for 800ms after the last chunk, assume done.
      const bumpEndTimer = () => {
        if (this.endTimer) clearTimeout(this.endTimer);
        this.endTimer = setTimeout(finish, 800);
      };

      ws.onopen = () => {
        this.opts.onStart?.();
        ws.send(JSON.stringify({ type: "text", content: text }));
        bumpEndTimer();
      };

      ws.onmessage = (ev) => {
        if (!this.active) return;
        if (typeof ev.data === "string") {
          try {
            const msg = JSON.parse(ev.data) as { type?: string };
            if (msg.type === "end" || msg.type === "done") {
              finish();
              return;
            }
          } catch { /* ignore */ }
          bumpEndTimer();
          return;
        }
        const buf = ev.data as ArrayBuffer;
        const bytes = new Uint8Array(buf);
        // Skip WAV header if present (44 bytes)
        const offset = bytes.length > 44 && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 ? 44 : 0;
        this.playPcm(bytes.subarray(offset));
        bumpEndTimer();
      };

      ws.onerror = () => {
        const err = new Error("TTS WebSocket error");
        this.opts.onError?.(err);
        this.active = false;
        if (this.endTimer) clearTimeout(this.endTimer);
        reject(err);
      };

      ws.onclose = () => {
        if (this.active) finish();
      };
    });
  }

  private playPcm(incoming: Uint8Array) {
    if (!this.ctx) return;
    const merged = new Uint8Array(this.pending.length + incoming.length);
    merged.set(this.pending);
    merged.set(incoming, this.pending.length);
    const usable = merged.length - (merged.length % 2);
    this.pending = merged.slice(usable);
    if (usable === 0) return;
    const samples = new Int16Array(merged.buffer, 0, usable / 2);
    const floats = new Float32Array(samples.length);
    for (let i = 0; i < samples.length; i++) floats[i] = samples[i] / 32768;
    const buffer = this.ctx.createBuffer(1, floats.length, this.opts.sampleRate);
    buffer.copyToChannel(floats, 0);
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(this.ctx.destination);
    const now = this.ctx.currentTime;
    if (this.playhead === 0) this.playhead = now + 0.05;
    else this.playhead = Math.max(this.playhead, now);
    source.start(this.playhead);
    this.playhead += buffer.duration;
  }

  stop() {
    this.active = false;
    if (this.endTimer) {
      clearTimeout(this.endTimer);
      this.endTimer = null;
    }
    if (this.ws) {
      try { this.ws.close(); } catch {}
      this.ws = null;
    }
    if (this.ctx) {
      try { this.ctx.close(); } catch {}
      this.ctx = null;
    }
    this.playhead = 0;
    this.pending = new Uint8Array(0);
  }
}

export const DEFAULT_TTS_URL =
  "wss://agentic-rag.yavar.ai/stream/tts?voice=af_heart&lang_code=a";

export function buildTtsUrl(speed = 1, voice = "af_heart", langCode = "a") {
  return `wss://agentic-rag.yavar.ai/stream/tts?speed=${speed}&voice=${voice}&lang_code=${langCode}`;
}

