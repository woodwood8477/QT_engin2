import type p5 from 'p5';
import type { EngineState, MorphParams } from '@/types/state';
import { clamp, morphN } from './chords';
import { currentIntervals, effectiveParams, neutralPeakDrive, triadProfile } from './motion';

export interface CanvasFrame {
  x: number;
  y: number;
  s: number;
}

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
  p.push();
  p.translate(frame.x, frame.y);
  p.scale(frame.s);
  for (let i = 0; i < 3; i++) drawGaussianBand(p, st, params, i, t, darkMode);
  p.pop();
}

export function drawGaussianBand(
  p: p5,
  st: EngineState,
  params: MorphParams,
  index: number,
  time: number,
  darkMode: boolean
): void {
  const tri = triadProfile(p, st, index, time);
  const sn = morphN('sweep', params);
  const en = morphN('edge', params);
  const bn = morphN('bloom', params);
  const tn = morphN('tension', params);
  const edgeLevel = clamp(0.5 + en * 0.42, -0.08, 1.18);
  const tensionLevel = clamp(0.72 + tn * 0.55, 0.15, 1.65);
  const bloomLevel = clamp(0.5 + bn * 0.42, 0.04, 1.22);
  const ints = currentIntervals(p, st, time);
  const span = Math.max(1, ints[2] - ints[0]);

  const ampBase = 72 + tensionLevel * 132 + edgeLevel * 38;
  const spacing =
    82 + span * 2.5 + tri.wide * 5 - tri.density * 5 + tensionLevel * 23;
  const bandAmp = ampBase * (0.76 + index * 0.12 + tri.ratio * 0.1 + tri.tone * 0.08);
  const bandVar = clamp(
    0.46 + edgeLevel * 1.62 + tri.wide * 0.1 - tri.density * 0.06,
    0.34,
    2.5
  );
  const phaseShift = tri.peakCenter + tri.curl * 0.04 * neutralPeakDrive(st, params);
  const skew = sn * (0.13 + index * 0.025);

  p.fill(logoInk(darkMode));
  p.beginShape();
  const pts: { x: number; cy: number; th: number }[] = [];
  const steps = 174;
  for (let j = 0; j <= steps; j++) {
    const u = j / steps;
    const x = p.lerp(-168, 168, u);
    const nx = p.map(u, 0, 1, -1.48 - sn * 0.42, 3.08 + sn * 0.48);
    const sxLocal = nx - phaseShift;
    const yBase = (index - 1) * spacing + sn * (index - 1) * 8;
    const peak = bandAmp * Math.exp(-(sxLocal * sxLocal) / Math.max(0.2, bandVar));
    const dipAmp =
      ampBase * (0.14 + tensionLevel * 0.1 + tri.tone * 0.06 + edgeLevel * 0.04);
    const leftDip =
      dipAmp *
      Math.exp(
        -((sxLocal + 1.1 - tri.density * 0.05 - sn * 0.12) ** 2) / (0.46 + edgeLevel * 0.2)
      );
    const rightDip =
      dipAmp *
      Math.exp(
        -((sxLocal - 1.36 - tri.wide * 0.12 + sn * 0.12) ** 2) / (0.56 + edgeLevel * 0.36)
      );
    const shoulder = en * 14 * Math.exp(-((sxLocal - 0.72) ** 2) / 0.8);
    const curlY =
      tri.curl * Math.sin(u * Math.PI) * (index - 1) * 9 * (0.25 + tensionLevel + edgeLevel * 0.2);
    const cy = yBase - peak + leftDip + rightDip + shoulder + curlY + skew * x * 0.08;
    const baseThick = 3.0 + index * 0.85 + bloomLevel ** 1.85 * 11 + edgeLevel * 1.8;
    const peakThick =
      (20 + bloomLevel ** 1.28 * 86 + edgeLevel * 18 + tensionLevel * 12) *
      (index === 1 ? 1.15 : 0.9) *
      (1 + tri.density * 0.08);
    const thickness =
      baseThick + peakThick * Math.exp(-(sxLocal * sxLocal) / (bandVar * (0.86 + edgeLevel * 0.34)));
    pts.push({ x, cy, th: thickness });
    p.vertex(x, cy - thickness / 2);
  }
  for (let j = pts.length - 1; j >= 0; j--) p.vertex(pts[j].x, pts[j].cy + pts[j].th / 2);
  p.endShape(p.CLOSE);
}
