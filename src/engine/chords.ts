import type { ChordDef, MorphKey, MorphParams } from '@/types/state';

export const NOTE_NAMES = [
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  'F#',
  'G',
  'G#',
  'A',
  'A#',
  'B'
] as const;

export const CHORDS: readonly ChordDef[] = [
  { label: 'MAJ',  name: 'Major Triad',      intervals: [0, 4, 7], tone: 0.16, wide: 0.26, dense: 0.10, curl: 0.12 },
  { label: 'MIN',  name: 'Minor Triad',      intervals: [0, 3, 7], tone: 0.28, wide: 0.10, dense: 0.22, curl: 0.16 },
  { label: 'AUG',  name: 'Augmented Triad',  intervals: [0, 4, 8], tone: 0.48, wide: 0.36, dense: 0.18, curl: 0.26 },
  { label: 'DIM',  name: 'Diminished Triad', intervals: [0, 3, 6], tone: 0.64, wide: -0.12, dense: 0.48, curl: 0.34 },
  { label: 'SUS4', name: 'Sus4 Triad',       intervals: [0, 5, 7], tone: 0.38, wide: 0.20, dense: 0.30, curl: 0.20 },
  { label: 'SUS2', name: 'Sus2 Triad',       intervals: [0, 2, 7], tone: 0.40, wide: 0.06, dense: 0.38, curl: 0.22 }
];

export const MORPH_BASE: MorphParams = { sweep: 0.5, edge: 0.5, bloom: 0.44, tension: 1.0 };
export const MORPH_RANGE: MorphParams = { sweep: 0.75, edge: 0.75, bloom: 0.75, tension: 0.75 };

export const clamp = (v: number, lo: number, hi: number): number =>
  v < lo ? lo : v > hi ? hi : v;
export const clamp01 = (v: number): number => clamp(v, 0, 1);

export const uiToMorph = (key: MorphKey, ui: number): number =>
  MORPH_BASE[key] + ((clamp(Number(ui) || 0, 0, 100) - 50) / 50) * MORPH_RANGE[key];

export const morphToUi = (key: MorphKey, morph: number): number =>
  clamp(50 + ((morph - MORPH_BASE[key]) / MORPH_RANGE[key]) * 50, 0, 100);

export const morphN = (key: MorphKey, params: MorphParams): number =>
  clamp((params[key] - MORPH_BASE[key]) / MORPH_RANGE[key], -1.5, 1.5);

export const hz = (m: number): number => 440 * 2 ** ((m - 69) / 12);

export const fmt = (v: number): string =>
  Math.abs(v - Math.round(v)) < 0.055 ? String(Math.round(v)) : v.toFixed(1);

export function noteName(m: number): string {
  const r = Math.round(m);
  const pc = ((r % 12) + 12) % 12;
  const oct = Math.floor(r / 12) - 1;
  const cents = Math.round((m - r) * 100);
  if (Math.abs(cents) < 3) return `${NOTE_NAMES[pc]}${oct}`;
  const sign = cents > 0 ? '+' : '';
  return `${NOTE_NAMES[pc]}${oct}${sign}${cents}`;
}

export function defaultMorphForChord(chord: number): MorphParams {
  if (chord === 0) return { ...MORPH_BASE };
  const presets: Array<[number, number, number, number]> = [
    [55, 42, 43, 45],
    [58, 56, 55, 54],
    [38, 36, 48, 58],
    [54, 46, 46, 52],
    [43, 48, 42, 48]
  ];
  const t = presets[clamp(chord - 1, 0, presets.length - 1)];
  return {
    sweep: uiToMorph('sweep', t[0]),
    edge: uiToMorph('edge', t[1]),
    bloom: uiToMorph('bloom', t[2]),
    tension: uiToMorph('tension', t[3])
  };
}
