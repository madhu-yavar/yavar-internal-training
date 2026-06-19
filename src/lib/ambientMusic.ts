// Soft ambient pad generated with the Web Audio API.
// No external audio file required — works offline, fully in-browser.
export class AmbientMusic {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private nodes: AudioScheduledSourceNode[] = [];

  async start(volume = 0.05) {
    if (this.ctx) return;
    const ctx = new AudioContext();
    if (ctx.state === "suspended") {
      try { await ctx.resume(); } catch { /* noop */ }
    }
    this.ctx = ctx;

    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);
    this.master = master;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 900;
    filter.Q.value = 0.7;
    filter.connect(master);

    // Gentle Cmaj9-ish pad
    const freqs = [65.41, 98.0, 164.81, 246.94, 329.63];
    freqs.forEach((f, i) => {
      const o1 = ctx.createOscillator();
      o1.type = "sine";
      o1.frequency.value = f;
      const o2 = ctx.createOscillator();
      o2.type = "triangle";
      o2.frequency.value = f * 1.004;

      const voice = ctx.createGain();
      voice.gain.value = 0.16;
      o1.connect(voice);
      o2.connect(voice);
      voice.connect(filter);

      // Slow tremolo so it breathes
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.05 + i * 0.018;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 0.07;
      lfo.connect(lfoGain);
      lfoGain.connect(voice.gain);

      o1.start(); o2.start(); lfo.start();
      this.nodes.push(o1, o2, lfo);
    });

    master.gain.linearRampToValueAtTime(volume, ctx.currentTime + 2.5);
  }

  setVolume(v: number) {
    if (!this.ctx || !this.master) return;
    this.master.gain.cancelScheduledValues(this.ctx.currentTime);
    this.master.gain.linearRampToValueAtTime(v, this.ctx.currentTime + 0.4);
  }

  stop() {
    if (!this.ctx || !this.master) return;
    const ctx = this.ctx;
    const m = this.master;
    m.gain.cancelScheduledValues(ctx.currentTime);
    m.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.8);
    const nodes = this.nodes;
    this.nodes = [];
    this.ctx = null;
    this.master = null;
    setTimeout(() => {
      nodes.forEach((n) => { try { n.stop(); } catch { /* noop */ } });
      try { ctx.close(); } catch { /* noop */ }
    }, 900);
  }
}
