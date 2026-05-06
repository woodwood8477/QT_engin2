import type p5 from 'p5';
import type { EngineState } from '@/types/state';
import { CHORDS, MORPH_BASE, MORPH_RANGE, clamp, clamp01, hz, morphN } from './chords';
import { currentNotes, effectiveParams, triadProfile } from './motion';

interface Voice {
  osc: OscillatorNode;
  osc2: OscillatorNode;
  gain: GainNode;
  pan: StereoPannerNode | null;
}

export class AudioEngine {
  ctx: AudioContext | null = null;
  private master!: GainNode;
  private filter!: BiquadFilterNode;
  private dry!: GainNode;
  private wet!: GainNode;
  private delay!: DelayNode;
  private feedback!: GainNode;
  private input!: GainNode;
  private voices: Voice[] = [];

  ensure(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const Ctx: typeof AudioContext | undefined =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    if (ctx.state === 'suspended') void ctx.resume();
    this.ctx = ctx;

    this.input = ctx.createGain();
    this.filter = ctx.createBiquadFilter();
    this.dry = ctx.createGain();
    this.wet = ctx.createGain();
    this.delay = ctx.createDelay(1.0);
    this.feedback = ctx.createGain();
    this.master = ctx.createGain();
    this.filter.type = 'lowpass';
    this.master.gain.value = 0;

    this.input.connect(this.filter);
    this.filter.connect(this.dry);
    this.dry.connect(this.master);
    this.filter.connect(this.wet);
    this.wet.connect(this.delay);
    this.delay.connect(this.master);
    this.delay.connect(this.feedback);
    this.feedback.connect(this.delay);
    this.master.connect(ctx.destination);

    for (let i = 0; i < 3; i++) {
      const osc = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      const pan = typeof ctx.createStereoPanner === 'function' ? ctx.createStereoPanner() : null;
      osc.type = 'sine';
      osc2.type = 'triangle';
      gain.gain.value = 0;
      osc.connect(gain);
      osc2.connect(gain);
      if (pan) {
        gain.connect(pan);
        pan.connect(this.input);
      } else {
        gain.connect(this.input);
      }
      osc.start();
      osc2.start();
      this.voices.push({ osc, osc2, gain, pan });
    }
  }

  refresh(p: p5, st: EngineState, fast: boolean, timeSec: number): void {
    if (!this.ctx || !st.playing) return;
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    const t = st.motion ? timeSec : 0;
    const params = effectiveParams(p, st, t);
    const notes = currentNotes(p, st, t);
    const ch = CHORDS[st.chord];
    const sx = morphN('sweep', params);
    const ex = morphN('edge', params);
    const tn = clamp01(
      (params.tension - (MORPH_BASE.tension - MORPH_RANGE.tension)) / (MORPH_RANGE.tension * 2)
    );
    const bn = clamp01(
      (params.bloom - (MORPH_BASE.bloom - MORPH_RANGE.bloom)) / (MORPH_RANGE.bloom * 2)
    );
    const energy = Math.abs(sx) * 0.5 + Math.abs(ex) * 0.36 + tn * 0.54;
    const tau = fast ? 0.018 : 0.075;
    const cutoff = clamp(
      190 * 2 ** ((0.5 + ex * 0.42) * 5.0) + bn * 1900 + tn * 1800,
      120,
      13800
    );
    const q = clamp(0.38 + (0.5 + ex * 0.42) * 7.2 + tn * 4.8 + ch.dense * 2.6, 0.35, 16);
    const wet = clamp(0.01 + bn ** 1.32 * 0.56 + Math.abs(sx) * 0.075, 0.01, 0.76);

    this.set(this.master.gain, st.volume * (0.22 + energy * 0.13), 0.03);
    this.set(this.filter.frequency, cutoff, tau);
    this.set(this.filter.Q, q, tau);
    this.set(this.dry.gain, 1, tau);
    this.set(this.wet.gain, wet, tau * 1.25);
    this.set(this.delay.delayTime, clamp(0.018 + bn * 0.32 + Math.abs(sx) * 0.11, 0.012, 0.54), tau * 1.4);
    this.set(this.feedback.gain, clamp(0.025 + bn * 0.45 + tn * 0.13, 0.015, 0.68), tau * 1.5);

    this.voices.forEach((v, i) => {
      const tri = triadProfile(p, st, i, t);
      const side = i - 1;
      const f = hz(notes[i]);
      const det = sx * (16 + ex * 18) * side + ex * side * 7 + tri.tone * tn * side * 10;
      const ratio = clamp(
        1.02 + (0.5 + ex * 0.42) * 0.95 + bn * 0.3 + tn * 0.18 + tri.ratio * 0.06 + side * sx * 0.03,
        1.02,
        2.75
      );
      const amp =
        (0.034 + (0.5 + ex * 0.42) * 0.017 + bn * 0.036 + tn * 0.022 + tri.density * 0.01) /
        Math.sqrt(1.15);
      this.set(v.osc.frequency, f, tau);
      this.set(v.osc2.frequency, f * ratio, tau * 1.1);
      this.set(v.osc.detune, det, tau);
      this.set(v.osc2.detune, det * 0.62 + ex * 6, tau);
      this.set(v.gain.gain, amp, 0.045);
      if (v.pan) this.set(v.pan.pan, clamp(side * 0.12 + sx * 0.52, -0.9, 0.9), 0.07);
    });
  }

  stop(): void {
    if (!this.ctx) return;
    this.voices.forEach((v) => this.set(v.gain.gain, 0, 0.05));
    this.set(this.master.gain, 0, 0.09);
  }

  private set(p: AudioParam | undefined, v: number, tau = 0.08): void {
    if (!p || !this.ctx) return;
    const now = this.ctx.currentTime;
    p.cancelScheduledValues(now);
    p.setTargetAtTime(Number.isFinite(v) ? v : 0, now, Math.max(0.012, tau));
  }
}
