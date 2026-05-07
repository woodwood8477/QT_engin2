import type p5 from 'p5';
import type { EngineState, MorphParams } from '@/types/state';
import { MORPH_BASE, clamp, morphN } from './chords';
import { currentIntervals, effectiveParams, neutralPeakDrive, triadProfile } from './motion';

const LOGO_W = 299;
const LOGO_H = 563.51;

const BASE_PATHS = [
  'M152.13,439.07c-9.43-25.79-16.63-63.01-35.81-83.5-29.04-22.16-44.74,39.53-50.42,59.04C54.21,448.91,42.04,560.73.01,563.51v-87.47c37.12-5.06,46.1-81.91,55.34-111.99,6.68-27.58,14.75-65.55,30.3-88.65,43.98-54.04,66.96,96.08,85.1,119.41,7.93,15.84,20.16,31.09,36,39.21,27.19,14.21,62.19,13.3,92.25,13.78v86.86c-83.12,2.87-121.83-11.7-146.87-95.61Z',
  'M147.37,288.37c-9.97-41.86-40.2-116.71-71.64-38.92C56.35,287.52,47.37,425.02,0,428.75v-86.78c61.34-18.75,46.52-170.56,95.05-210.18,31.47-17.03,42.8,47.42,49.8,68.04,31.07,105.55,32.59,138.36,154.14,132.94v66.95c-94.92,4.99-127.01-20.23-151.62-111.35Z',
  'M148.02,163.75c-18.35-66.76-49.31-120.79-79.7-20.64-13.04,35.81-24.49,153.71-68.31,157.48l.02-86.68c41.3-6.32,53.02-113.61,64.88-149.28C71.93,43.36,79.39,2.89,105.95,0c35.62,7.55,46.46,112.31,57.21,144.55,16.62,87.24,57.75,87.47,135.84,87.22v39.94c-93.41,3.75-124.75-17.79-150.97-107.96Z'
] as const;

interface BandSample {
  xs: number[];
  center: number[];
  half: number[];
  xMin: number;
  xMax: number;
  xRange: number;
  peakT: number;
}

export interface CanvasFrame {
  x: number;
  y: number;
  s: number;
}

let bandCache: BandSample[] | null = null;

export function getCanvasSide(): number {
  const mobile = window.innerWidth <= 960;
  if (mobile) {
    const h = Math.max(360, window.innerHeight || 720);
    return Math.max(268, Math.min(410, window.innerWidth * 0.68, h * 0.335));
  }
  return Math.max(
    320,
    Math.min(690, (window.innerWidth - 560) * 0.68, window.innerHeight * 0.74)
  );
}

export function logoFrame(p: p5): CanvasFrame {
  const side = Math.min(p.width, p.height);
  const safe = window.innerWidth <= 960 ? 0.9 : 0.86;
  return { x: side * 0.5, y: side * 0.55, s: (side / 600) * safe };
}

export function logoInk(darkMode: boolean): string {
  return darkMode ? '#f2f2f2' : '#050505';
}

export function drawScene(p: p5, st: EngineState, darkMode: boolean): void {
  p.clear();
  const t = st.motion ? p.millis() * 0.001 : 0;
  const params = effectiveParams(p, st, t);
  const frame = logoFrame(p);
  const bands = getBands();

  p.push();
  p.translate(frame.x, frame.y);
  p.scale(frame.s);
  for (let i = 0; i < bands.length; i++) drawGaussianBand(p, bands[i], st, params, i, t, darkMode);
  p.pop();
}

function getBands(): BandSample[] {
  bandCache ??= sampleBaseBands();
  return bandCache;
}

function sampleBaseBands(): BandSample[] {
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(LOGO_W) + 4;
  canvas.height = Math.ceil(LOGO_H) + 4;
  const ctx = canvas.getContext('2d');
  if (!ctx) return [];
  return BASE_PATHS.map((d) => sampleBand(ctx, new Path2D(d)));
}

function sampleBand(ctx: CanvasRenderingContext2D, path: Path2D): BandSample {
  const xs: number[] = [];
  const top: number[] = [];
  const bottom: number[] = [];
  const maxX = Math.ceil(LOGO_W);
  const maxY = Math.ceil(LOGO_H);
  let xMin = Number.POSITIVE_INFINITY;
  let xMax = Number.NEGATIVE_INFINITY;

  for (let xi = 0; xi < maxX; xi++) {
    let ty = -1;
    let by = -1;
    for (let y = 0; y < maxY; y++) {
      if (ctx.isPointInPath(path, xi + 0.5, y + 0.5)) {
        ty = y + 0.5;
        break;
      }
    }
    if (ty < 0) continue;
    for (let y = maxY - 1; y >= 0; y--) {
      if (ctx.isPointInPath(path, xi + 0.5, y + 0.5)) {
        by = y + 0.5;
        break;
      }
    }
    const x = xi + 0.5;
    xs.push(x - LOGO_W / 2);
    top.push(ty - LOGO_H / 2);
    bottom.push(by - LOGO_H / 2);
    xMin = Math.min(xMin, x - LOGO_W / 2);
    xMax = Math.max(xMax, x - LOGO_W / 2);
  }

  const center = smoothArray(top.map((y, i) => (y + bottom[i]) * 0.5), 2.2);
  const half = smoothArray(top.map((y, i) => Math.max(0.1, (bottom[i] - y) * 0.5)), 1.8);
  const xRange = Math.max(1, xMax - xMin);
  let peakIndex = 0;
  let peakY = Number.POSITIVE_INFINITY;
  for (let i = 0; i < center.length; i++) {
    if (center[i] < peakY) {
      peakY = center[i];
      peakIndex = i;
    }
  }

  return {
    xs,
    center,
    half,
    xMin,
    xMax,
    xRange,
    peakT: (xs[peakIndex] - xMin) / xRange
  };
}

function smoothArray(src: number[], sigma: number): number[] {
  if (sigma <= 0) return [...src];
  const radius = Math.ceil(sigma * 3);
  const weights: number[] = [];
  let sum = 0;
  for (let i = -radius; i <= radius; i++) {
    const w = Math.exp(-(i * i) / (2 * sigma * sigma));
    weights.push(w);
    sum += w;
  }
  return src.map((_, i) => {
    let value = 0;
    for (let j = -radius; j <= radius; j++) {
      const k = clamp(i + j, 0, src.length - 1);
      value += src[k] * (weights[j + radius] / sum);
    }
    return value;
  });
}

function smoothStep(a: number, b: number, x: number): number {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
}

function edgeFade(t: number): number {
  return smoothStep(0.018, 0.14, t) * (1 - smoothStep(0.86, 0.988, t));
}

function edgeLock(t: number): number {
  return Math.max(1 - smoothStep(0.012, 0.15, t), smoothStep(0.845, 0.992, t));
}

function mix(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function gaussian(x: number, center: number, width: number): number {
  const w = Math.max(0.001, width);
  return Math.exp(-((x - center) * (x - center)) / w);
}

function isNeutralDefault(st: EngineState, params: MorphParams): boolean {
  const eps = 0.0005;
  return (
    !st.motion &&
    st.chord === 0 &&
    Math.abs(params.sweep - MORPH_BASE.sweep) < eps &&
    Math.abs(params.edge - MORPH_BASE.edge) < eps &&
    Math.abs(params.bloom - MORPH_BASE.bloom) < eps &&
    Math.abs(params.tension - MORPH_BASE.tension) < eps
  );
}

export function drawGaussianBand(
  p: p5,
  band: BandSample,
  st: EngineState,
  params: MorphParams,
  index: number,
  time: number,
  darkMode: boolean
): void {
  const ctx = p.drawingContext as CanvasRenderingContext2D;
  const tri = triadProfile(p, st, index, time);
  const sn = morphN('sweep', params);
  const en = morphN('edge', params);
  const bn = morphN('bloom', params);
  const tn = morphN('tension', params);
  const drive = isNeutralDefault(st, params) ? 0 : neutralPeakDrive(st, params);
  const ints = currentIntervals(p, st, time);
  const span = Math.max(1, ints[2] - ints[0]);
  const voice = index - 1;
  const top: Array<{ x: number; y: number }> = [];
  const bottom: Array<{ x: number; y: number }> = [];

  const peakCenter = clamp(
    band.peakT + sn * 0.16 + tri.pitchOffset * 0.01 + tri.wide * 0.035 - tri.density * 0.026,
    0.1,
    0.78
  );
  const peakWidth = clamp(0.18 + Math.abs(en) * 0.08 + tri.wide * 0.035 - tri.density * 0.025, 0.1, 0.36);
  const live = st.playing ? 1 : 0;

  for (let i = 0; i < band.xs.length; i++) {
    const x = band.xs[i];
    const u = (x - band.xMin) / band.xRange;
    const fade = edgeFade(u);
    const lock = edgeLock(u);
    const body = Math.sin(Math.PI * clamp(u, 0, 1));
    const bodyPow = Math.pow(Math.max(0, body), 0.74);
    const peak = gaussian(u, peakCenter, peakWidth);
    const left = gaussian(u, peakCenter - 0.22 - tri.density * 0.018, 0.24 + Math.abs(en) * 0.05);
    const right = gaussian(u, peakCenter + 0.23 + tri.wide * 0.026, 0.26 + Math.abs(en) * 0.06);
    const rightTail = smoothStep(0.66, 0.98, u);
    const leftWall = 1 - smoothStep(0.02, 0.16, u);

    const xWarp =
      drive *
      fade *
      (sn * 18 * bodyPow * (peak - 0.32 * left - 0.3 * right) +
        bn * 7 * (u - 0.5) * bodyPow +
        tri.wide * 5.5 * (right - left) -
        tri.density * 3.8 * peak +
        tri.pitchOffset * 1.8 * bodyPow);

    const yWarp =
      drive *
      fade *
      (en * (-32 * peak + 18 * bodyPow + 8 * (right - left)) +
        sn * 5 * (u - 0.52) * peak +
        bn * 9 * (bodyPow * (u - 0.44) + 0.38 * (left - right)) +
        voice * (tri.wide * 10 - tri.density * 8 + tn * 8 + (span - 7) * 1.2) * (0.4 + 0.6 * bodyPow) +
        tri.curl * voice * 4.8 * (left + right - peak) +
        live * Math.sin(time * (0.86 + st.tension * 0.18) + u * 2.4) * 0.55 * fade);

    const thicknessScale =
      1 +
      drive *
        clamp(
          bn * (0.35 * bodyPow + 0.12 * peak - 0.1 * rightTail) +
            tn * (0.12 * peak + 0.06 * left - 0.05 * rightTail) +
            en * 0.05 * bodyPow +
            tri.density * 0.035 * peak -
            tri.wide * 0.02 * rightTail,
          -0.62,
          0.92
        );

    const lockedX = mix(x + xWarp, x, lock * 0.92 + leftWall * 0.04);
    const lockedCenter = mix(band.center[i] + yWarp, band.center[i], lock * 0.9);
    const half = Math.max(0.7, band.half[i] * thicknessScale);
    top.push({ x: lockedX, y: lockedCenter - half });
    bottom.push({ x: lockedX, y: lockedCenter + half });
  }

  const smoothedTop = smoothPoints(top, drive > 0 ? 2 : 1);
  const smoothedBottom = smoothPoints(bottom, drive > 0 ? 2 : 1);

  ctx.save();
  ctx.fillStyle = logoInk(darkMode);
  ctx.beginPath();
  ctx.moveTo(smoothedTop[0].x, smoothedTop[0].y);
  drawCurve(ctx, smoothedTop);
  ctx.lineTo(smoothedBottom[smoothedBottom.length - 1].x, smoothedBottom[smoothedBottom.length - 1].y);
  drawCurve(ctx, [...smoothedBottom].reverse());
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function smoothPoints(points: Array<{ x: number; y: number }>, passes: number): Array<{ x: number; y: number }> {
  const out = points.map((p) => ({ ...p }));
  for (let pass = 0; pass < passes; pass++) {
    const copy = out.map((p) => ({ ...p }));
    for (let i = 1; i < out.length - 1; i++) {
      out[i].x = (copy[i - 1].x + copy[i].x * 3 + copy[i + 1].x) / 5;
      out[i].y = (copy[i - 1].y + copy[i].y * 3 + copy[i + 1].y) / 5;
    }
  }
  return out;
}

function drawCurve(ctx: CanvasRenderingContext2D, points: Array<{ x: number; y: number }>): void {
  if (points.length < 2) return;
  for (let i = 1; i < points.length - 1; i += 3) {
    const p = points[i];
    const next = points[Math.min(i + 1, points.length - 1)];
    const mx = (p.x + next.x) * 0.5;
    const my = (p.y + next.y) * 0.5;
    ctx.quadraticCurveTo(p.x, p.y, mx, my);
  }
  const last = points[points.length - 1];
  ctx.lineTo(last.x, last.y);
}
