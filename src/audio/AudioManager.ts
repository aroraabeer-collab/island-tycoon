// Procedural WebAudio sound: cha-ching, pops, coins, engine hum and ocean ambience. No asset files.
import { bus, type VehicleKind } from '../core/EventBus';

export class AudioManager {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private engine: { osc: OscillatorNode; osc2: OscillatorNode; gain: GainNode; filter: BiquadFilterNode } | null = null;
  private engineKind: VehicleKind | null = null;
  muted = false;
  private volume = 0.8;

  constructor() {
    bus.on('buttonPurchased', () => { this.chaChing(); setTimeout(() => this.pop(), 120); });
    bus.on('cashCollected', ({ amount }) => this.coins(Math.min(8, 2 + Math.floor(Math.log10(amount + 1)))));
    bus.on('purchaseDenied', () => this.buzz());
    bus.on('vehicleUnlocked', () => this.fanfare());
    bus.on('win', () => this.fanfare(true));
    bus.on('activity', ({ state }) => { if (state === 'progress') this.blip(880); if (state === 'started') this.blip(660); });
    bus.on('vehicleEntered', ({ kind }) => { this.engineKind = kind; });
    bus.on('vehicleExited', () => { this.engineKind = null; });
  }

  /** Must be called from a user gesture. */
  start() {
    if (this.ctx) return;
    this.ctx = new AudioContext();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.6 * this.volume;
    this.master.connect(this.ctx.destination);
    this.ambience();
    // Browsers may start the context suspended (e.g. ?autostart); resume on the first gesture.
    const resume = () => { void this.ctx?.resume(); };
    window.addEventListener('pointerdown', resume, { once: true });
    window.addEventListener('keydown', resume, { once: true });
  }

  toggleMute() {
    this.muted = !this.muted;
    this.applyGain();
  }

  setVolume(v: number) {
    this.volume = Math.min(1, Math.max(0, v));
    this.applyGain();
  }

  private applyGain() {
    if (this.ctx) this.master.gain.setTargetAtTime(this.muted ? 0 : 0.6 * this.volume, this.ctx.currentTime, 0.05);
  }

  private tone(freq: number, dur: number, type: OscillatorType, vol: number, delay = 0, slideTo?: number) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  private noiseBuffer(seconds: number) {
    const ctx = this.ctx!;
    const buf = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  chaChing() {
    if (!this.ctx) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer(0.08);
    const f = this.ctx.createBiquadFilter();
    f.type = 'highpass'; f.frequency.value = 3000;
    const g = this.ctx.createGain(); g.gain.value = 0.25;
    src.connect(f).connect(g).connect(this.master);
    src.start();
    this.tone(1318, 0.5, 'triangle', 0.25, 0.06);
    this.tone(1760, 0.7, 'triangle', 0.22, 0.14);
    this.tone(2637, 0.6, 'sine', 0.08, 0.14);
  }

  pop() { this.tone(300, 0.15, 'sine', 0.35, 0, 900); }
  blip(f: number) { this.tone(f, 0.12, 'square', 0.08); }
  buzz() { this.tone(140, 0.25, 'sawtooth', 0.12, 0, 90); }

  coins(n: number) {
    for (let i = 0; i < n; i++) this.tone(1800 + Math.random() * 900, 0.12, 'triangle', 0.12, i * 0.05);
  }

  fanfare(big = false) {
    const notes = big ? [523, 659, 784, 1046, 1318, 1568] : [523, 659, 784, 1046];
    notes.forEach((f, i) => this.tone(f, 0.4, 'triangle', 0.18, i * 0.1));
  }

  private ambience() {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer(4);
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = 500;
    const g = ctx.createGain(); g.gain.value = 0.06;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.12;
    const lfoGain = ctx.createGain(); lfoGain.gain.value = 0.04;
    lfo.connect(lfoGain).connect(g.gain);
    src.connect(f).connect(g).connect(this.master);
    src.start(); lfo.start();
  }

  /** Engine hum follows speed/throttle of the driven vehicle. */
  update(speed: number, throttle: number) {
    if (!this.ctx) return;
    if (!this.engine) {
      const osc = this.ctx.createOscillator(); osc.type = 'sawtooth';
      const osc2 = this.ctx.createOscillator(); osc2.type = 'square';
      const filter = this.ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 600;
      const gain = this.ctx.createGain(); gain.gain.value = 0;
      osc.connect(filter); osc2.connect(filter); filter.connect(gain).connect(this.master);
      osc.start(); osc2.start();
      this.engine = { osc, osc2, gain, filter };
    }
    const e = this.engine, t = this.ctx.currentTime;
    const on = this.engineKind !== null;
    const base = this.engineKind === 'air' ? 70 : this.engineKind === 'boat' ? 55 : 45;
    const f = base + speed * (this.engineKind === 'air' ? 2.2 : 3.2) + throttle * 25;
    e.osc.frequency.setTargetAtTime(f, t, 0.08);
    e.osc2.frequency.setTargetAtTime(f * 0.501, t, 0.08);
    e.filter.frequency.setTargetAtTime(400 + throttle * 900 + speed * 15, t, 0.1);
    e.gain.gain.setTargetAtTime(on ? 0.05 + throttle * 0.05 : 0, t, 0.15);
  }
}
