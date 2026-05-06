export type PageId = 'morph' | 'motion' | 'harmony';

export type MorphKey = 'sweep' | 'edge' | 'bloom' | 'tension';
export type MotionKey = 'motionAmount' | 'motionSpeed' | 'motionRandom';

export interface ChordDef {
  label: string;
  name: string;
  intervals: [number, number, number];
  tone: number;
  wide: number;
  dense: number;
  curl: number;
}

export interface MorphParams {
  sweep: number;
  edge: number;
  bloom: number;
  tension: number;
}

export interface EngineState extends MorphParams {
  chord: number;
  root: number;
  oct: number;
  playing: boolean;
  motion: boolean;
  volume: number;
  motionAmount: number;
  motionSpeed: number;
  motionRandom: number;
}

export interface TriadProfile {
  iv: number;
  ratio: number;
  notePos: number;
  peakCenter: number;
  pitchOffset: number;
  tone: number;
  wide: number;
  density: number;
  curl: number;
}
