import type p5 from 'p5';
import type { EngineState, MorphParams, TriadProfile } from '@/types/state';
import { CHORDS, MORPH_BASE, MORPH_RANGE, clamp, clamp01, morphN } from './chords';

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export function shapeParams(st: EngineState): MorphParams {
  return { sweep: st.sweep, edge: st.edge, bloom: st.bloom, tension: st.tension };
}

export function randomWave(p: p5, t: number, seed: number): number {
  const n1 = p.noise(seed, t * 0.34) * 2 - 1;
  const n2 = p.noise(seed + 10.1, t * 0.82) * 2 - 1;
  const lfo = Math.sin(t * (0.52 + seed * 0.027) + seed * 2.1) * 0.35;
  return clamp(n1 * 0.58 + n2 * 0.3 + lfo * 0.12, -1, 1);
}

export function effectiveParams(p: p5, st: EngineState, t: number): MorphParams {
  const base = shapeParams(st);
  if (!st.motion) return base;
  const ch = CHORDS[st.chord];
  const amt = st.motionAmount;
  const rnd = st.motionRandom;
  const spd = st.motionSpeed;
  const rate = 0.18 + spd * 5.2;
  const drift1 = randomWave(p, t * rate, 1.1);
  const drift2 = randomWave(p, t * rate, 2.3);
  const drift3 = randomWave(p, t * rate, 3.7);
  const drift4 = randomWave(p, t * rate, 4.9);
  const wave1 = Math.sin(t * (0.92 + ch.tone * 0.62) * rate + drift2 * rnd * 3.2);
  const wave2 = Math.sin(t * (1.28 + ch.dense * 0.76) * rate + 1.7 + drift3 * rnd * 3.6);
  const wave3 = Math.sin(t * (0.82 + ch.curl * 0.58) * rate + 2.4 + drift1 * rnd * 3.9);
  const wave4 = Math.sin(t * (1.56 + ch.wide * 0.46) * rate + 0.4 + drift4 * rnd * 3.2);
  const tensionNorm = clamp01(
    (base.tension - MORPH_BASE.tension + MORPH_RANGE.tension) / (MORPH_RANGE.tension * 2)
  );
  const depth = (0.2 + tensionNorm * 0.54) * amt;

  const make = (key: keyof MorphParams, wave: number, scale: number, drift: number): number => {
    const target =
      MORPH_BASE[key] + (morphN(key, base) + wave * depth * scale + drift * rnd * 0.5) * MORPH_RANGE[key];
    return clamp(target, MORPH_BASE[key] - MORPH_RANGE[key], MORPH_BASE[key] + MORPH_RANGE[key]);
  };

  return {
    sweep: make('sweep', wave1, 1, drift1),
    edge: make('edge', wave2, 1.06, drift2),
    bloom: make('bloom', wave3, 1.05, drift3),
    tension: make('tension', wave4, 1.02, drift4)
  };
}

export function currentIntervals(p: p5, st: EngineState, t = 0): [number, number, number] {
  const ch = CHORDS[st.chord];
  const params = effectiveParams(p, st, t);
  const s = morphN('sweep', params);
  const e = morphN('edge', params);
  const base = ch.intervals;
  const mid = base[1];
  const spread = clamp(1 + s * 0.34 + e * 0.1, 0.46, 1.86);
  const raw = [0, 1, 2].map(
    (i) => mid + (base[i] - mid) * spread + (i - 1) * s * 0.85 + (i - 1) * e * 0.35
  );
  return [raw[0] - raw[0], raw[1] - raw[0], raw[2] - raw[0]];
}

export function currentNotes(p: p5, st: EngineState, t = 0): [number, number, number] {
  const root = (st.oct + 1) * 12 + st.root;
  const iv = currentIntervals(p, st, t);
  return [root + iv[0], root + iv[1], root + iv[2]];
}

export function neutralPeakDrive(st: EngineState, params: MorphParams): number {
  if (st.motion) return 1;
  const sn = Math.abs(morphN('sweep', params));
  const en = Math.abs(morphN('edge', params));
  const bn = Math.abs(morphN('bloom', params));
  const tn = Math.abs(morphN('tension', params));
  return clamp01((st.chord === 0 ? 0 : 1) + sn * 0.95 + en * 0.85 + bn * 0.35 + tn * 0.42);
}

export function triadProfile(p: p5, st: EngineState, voice: number, t = 0): TriadProfile {
  const ch = CHORDS[st.chord];
  const ints = currentIntervals(p, st, t);
  const base = ch.intervals;
  const iv = ints[voice];
  const mn = Math.min(...ints);
  const mx = Math.max(...ints);
  const span = Math.max(1, mx - mn);
  const n = (iv - mn) / span;
  const bn = (base[voice] - base[0]) / Math.max(1, base[2] - base[0]);
  const rawPeak = lerp(-0.5, 0.5, n) + (n - bn) * 0.18;
  const align = neutralPeakDrive(st, effectiveParams(p, st, t));
  return {
    iv,
    ratio: 2 ** (iv / 12),
    notePos: n,
    peakCenter: lerp(0, rawPeak, align),
    pitchOffset: iv - base[voice],
    tone: ch.tone,
    wide: ch.wide,
    density: ch.dense,
    curl: ch.curl
  };
}
