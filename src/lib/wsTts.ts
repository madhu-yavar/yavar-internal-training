// Streaming TTS client.
// Primary: self-hosted WebSocket (raw PCM int16 mono @ sampleRate, optional WAV header).
// Fallback: POST /api/tts which streams Lovable AI Gateway SSE (`speech.audio.delta`
//          with base64 PCM 24kHz mono int16 LE).

export type WsTtsOptions = {
  url: string;
  sampleRate?: number;        // primary WS sample rate
  fallbackUrl?: string;       // defaults to "/api/tts"
  fallbackVoice?: string;     // defaults to "alloy"
  fallbackSpeed?: number;     // defaults to 1
  fallbackSampleRate?: number;// Lovable PCM rate, default 24000
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: Error) => void;
  onFallback?: (reason: string) => void;
};

export class WsTtsPlayer {
  private ctx: AudioContext | null = null;
  private ws: WebSocket | null = null;
  private playhead = 0;
  private pending = new Uint8Array(0);
  private sources: AudioBufferSourceNode[] = [];
  private opts: Required<Pick<WsTtsOptions, "sampleRate" | "fallbackUrl" | "fallbackVoice" | "fallbackSpeed" | "fallbackSampleRate">> & WsTtsOptions;
  private active = false;
  private endTimer: ReturnType<typeof setTimeout> | null = null;
  private resolveCurrent: (() => void) | null = null;
  private abort: AbortController | null = null;
  /** Set true after WS fails once in this session, so we go straight to fallback. */
  private wsBroken = false;
  private currentSampleRate = 24000;

  constructor(opts: WsTtsOptions) {
    this.opts = {
      sampleRate: 24000,
      fallbackUrl: "/api/tts",
      fallbackVoice: "alloy",
      fallbackSpeed: 1,
      fallbackSampleRate: 24000,
      ...opts,
    };
    this.currentSampleRate = this.opts.sampleRate;
  }

  setUrl(url: string) {
    this.opts.url = url;
  }

  prime(): void {
    if (this.ctx) return;
    try {
      // Use a context that can play any rate — 24k works for both WS and fallback;
      // buffers are created with their own sample rate so playback is correct.
      this.ctx = new AudioContext();
      if (this.ctx.state === "suspended") void this.ctx.resume().catch(() => {});
    } catch {
      this.ctx = null;
    }
  }

  async speak(text: string): Promise<void> {
    this.stop();
    this.active = true;
    this.prime();
    if (!this.ctx) return;
    if (this.ctx.state === "suspended") await this.ctx.resume().catch(() => {});
    this.playhead = 0;
    this.pending = new Uint8Array(0);

    if (this.wsBroken) {
      return this.speakFallback(text, "previous-ws-failure");
    }

    try {
      await this.speakWs(text);
    } catch (e) {
      const reason = (e as Error).message || "ws-error";
      this.wsBroken = true;
      this.opts.onFallback?.(reason);
      if (!this.active) return;
      // reset audio state before fallback
      this.playhead = 0;
      this.pending = new Uint8Array(0);
      await this.speakFallback(text, reason);
    }
  }

  private speakWs(text: string): Promise<void> {
    this.currentSampleRate = this.opts.sampleRate;
    return new Promise<void>((resolve, reject) => {
      let ws: WebSocket;
      try {
        ws = new WebSocket(this.opts.url);
      } catch (e) {
        reject(e instanceof Error ? e : new Error(String(e)));
        return;
      }
      ws.binaryType = "arraybuffer";
      this.ws = ws;
      this.resolveCurrent = resolve;

      let gotAudio = false;
      // If the socket never opens or never sends audio within 2.5s, treat it as failed.
      let openTimer: ReturnType<typeof setTimeout> | null = setTimeout(() => {
        try { ws.close(); } catch {}
        reject(new Error("ws-open-timeout"));
      }, 2500);

      const finish = () => {
        if (!this.active) return;
        this.active = false;
        if (this.endTimer) clearTimeout(this.endTimer);
        this.endTimer = null;
        try { ws.close(); } catch {}
        if (this.ws === ws) this.ws = null;
        const remaining = Math.max(0, this.playhead - (this.ctx?.currentTime ?? 0));
        this.endTimer = setTimeout(() => {
          this.endTimer = null;
          this.resolveCurrent = null;
          this.opts.onEnd?.();
          resolve();
        }, Math.min(remaining * 1000 + 50, 30_000));
      };

      const bumpEndTimer = () => {
        if (this.endTimer) clearTimeout(this.endTimer);
        this.endTimer = setTimeout(finish, 800);
      };

      ws.onopen = () => {
        if (openTimer) { clearTimeout(openTimer); openTimer = null; }
        this.opts.onStart?.();
        try {
          ws.send(JSON.stringify({ type: "text", content: text }));
        } catch (e) {
          reject(e instanceof Error ? e : new Error("ws-send-failed"));
          return;
        }
        // give the server 2.5s after open to send any audio
        openTimer = setTimeout(() => {
          if (!gotAudio) {
            try { ws.close(); } catch {}
            reject(new Error("ws-no-audio"));
          }
        }, 2500);
      };

      ws.onmessage = (ev) => {
        if (!this.active) return;
        if (typeof ev.data === "string") {
          try {
            const msg = JSON.parse(ev.data) as { type?: string };
            if (msg.type === "end" || msg.type === "done") { finish(); return; }
            if (msg.type === "error") {
              try { ws.close(); } catch {}
              reject(new Error("ws-server-error"));
              return;
            }
          } catch { /* ignore */ }
          bumpEndTimer();
          return;
        }
        gotAudio = true;
        if (openTimer) { clearTimeout(openTimer); openTimer = null; }
        const buf = ev.data as ArrayBuffer;
        const bytes = new Uint8Array(buf);
        const offset = bytes.length > 44 && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 ? 44 : 0;
        this.playPcm(bytes.subarray(offset));
        bumpEndTimer();
      };

      ws.onerror = () => {
        if (openTimer) { clearTimeout(openTimer); openTimer = null; }
        if (gotAudio) {
          // already producing audio — let onclose / finish handle it
          return;
        }
        reject(new Error("ws-error"));
      };

      ws.onclose = () => {
        if (openTimer) { clearTimeout(openTimer); openTimer = null; }
        if (!gotAudio && this.active) {
          reject(new Error("ws-closed"));
          return;
        }
        if (this.active) finish();
      };
    });
  }

  private async speakFallback(text: string, _reason: string): Promise<void> {
    this.currentSampleRate = this.opts.fallbackSampleRate;
    this.abort = new AbortController();
    this.opts.onStart?.();

    let res: Response;
    try {
      res = await fetch(this.opts.fallbackUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          voice: this.opts.fallbackVoice,
          speed: this.opts.fallbackSpeed,
        }),
        signal: this.abort.signal,
      });
    } catch (e) {
      this.active = false;
      this.opts.onError?.(e as Error);
      this.opts.onEnd?.();
      return;
    }
    if (!res.ok || !res.body) {
      const msg = await res.text().catch(() => "");
      this.active = false;
      this.opts.onError?.(new Error(`tts-fallback-${res.status}: ${msg}`));
      this.opts.onEnd?.();
      return;
    }

    const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
    let buf = "";
    try {
      while (this.active) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += value;
        let nl;
        while ((nl = buf.indexOf("\n")) !== -1) {
          const line = buf.slice(0, nl).trim();
          buf = buf.slice(nl + 1);
          if (!line.startsWith("data:")) continue;
          const data = line.slice(5).trim();
          if (!data || data === "[DONE]") continue;
          let payload: { type?: string; audio?: string };
          try { payload = JSON.parse(data); } catch { continue; }
          if (payload.type === "speech.audio.delta" && payload.audio) {
            const bin = atob(payload.audio);
            const bytes = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
            this.playPcm(bytes);
          }
        }
      }
    } catch (e) {
      this.opts.onError?.(e as Error);
    }
    // Wait for scheduled audio to finish.
    const remaining = Math.max(0, this.playhead - (this.ctx?.currentTime ?? 0));
    await new Promise<void>((r) => setTimeout(r, Math.min(remaining * 1000 + 50, 30_000)));
    this.active = false;
    this.opts.onEnd?.();
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
    const buffer = this.ctx.createBuffer(1, floats.length, this.currentSampleRate);
    buffer.copyToChannel(floats, 0);
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(this.ctx.destination);
    const now = this.ctx.currentTime;
    if (this.playhead === 0) this.playhead = now + 0.05;
    else this.playhead = Math.max(this.playhead, now);
    source.start(this.playhead);
    this.playhead += buffer.duration;
    this.sources.push(source);
  }

  stop() {
    this.active = false;
    if (this.endTimer) { clearTimeout(this.endTimer); this.endTimer = null; }
    if (this.abort) { try { this.abort.abort(); } catch {} this.abort = null; }
    if (this.ws) { try { this.ws.close(); } catch {} this.ws = null; }
    for (const source of this.sources) { try { source.stop(); } catch {} }
    this.sources = [];
    this.playhead = 0;
    this.pending = new Uint8Array(0);
    const resolve = this.resolveCurrent;
    this.resolveCurrent = null;
    resolve?.();
  }

  dispose() {
    this.stop();
    if (this.ctx) { try { this.ctx.close(); } catch {} this.ctx = null; }
  }
}

export const DEFAULT_TTS_URL =
  "wss://agentic-rag.yavar.ai/stream/tts?voice=af_heart&lang_code=a";

export function buildTtsUrl(speed = 1, voice = "af_heart", langCode = "a") {
  return `wss://agentic-rag.yavar.ai/stream/tts?speed=${speed}&voice=${voice}&lang_code=${langCode}`;
}
