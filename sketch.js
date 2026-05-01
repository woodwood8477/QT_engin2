/**
 * QT_ensin Base Wave Logo Engine v0.2
 *
 * v0.2 corrects the v0.1 over-normalized S-curve problem.
 * The logo now keeps the earlier horizontal wave-band character while adding:
 * - softer side bias
 * - larger but controlled amplitude
 * - non-colliding three-band layout
 * - square-bounded logo mass
 *
 * Legacy files are preserved under /legacy.
 */

let chordSelect, ctrlSweep, ctrlEdge, ctrlBloom, ctrlTension, ctrlRipple;
let valDisplays = {};
let isPaused = false;
let seedValue = 4721;

const presets = [
  { bias: 0.13, edge: 1.28, body: 38, wave: 132, ripple: 0.0 },
  { bias: 0.20, edge: 1.16, body: 36, wave: 138, ripple: 0.0 },
  { bias: 0.10, edge: 1.46, body: 35, wave: 158, ripple: 0.0 },
  { bias: 0.16, edge: 1.34, body: 46, wave: 118, ripple: 1.2 }
];

function setup() {
  const canvas = createCanvas(720, 720);
  canvas.parent('canvas-container');
  pixelDensity(2);
  noStroke();

  chordSelect = select('#chordSelect');
  ctrlSweep   = select('#ctrlSweep');
  ctrlEdge    = select('#ctrlEdge');
  ctrlBloom   = select('#ctrlBloom');
  ctrlTension = select('#ctrlTension');
  ctrlRipple  = select('#ctrlRipple');

  valDisplays = {
    sweep:   select('#valSweep'),
    edge:    select('#valEdge'),
    bloom:   select('#valBloom'),
    tension: select('#valTension'),
    ripple:  select('#valRipple')
  };

  chordSelect.changed(applyPreset);
  [ctrlSweep, ctrlEdge, ctrlBloom, ctrlTension, ctrlRipple].forEach(el => el.input(updateDisplays));

  applyPreset();
}

function windowResized() {
  const side = constrain(min(windowWidth - 420, windowHeight), 540, 820);
  resizeCanvas(side, side);
}

function applyPreset() {
  const p = presets[int(chordSelect.value())];
  ctrlSweep.value(p.bias);
  ctrlEdge.value(p.edge);
  ctrlBloom.value(p.body);
  ctrlTension.value(p.wave);
  ctrlRipple.value(p.ripple);
  updateDisplays();
}

function updateDisplays() {
  valDisplays.sweep.html(nf(float(ctrlSweep.value()), 1, 2));
  valDisplays.edge.html(nf(float(ctrlEdge.value()), 1, 2));
  valDisplays.bloom.html(int(ctrlBloom.value()));
  valDisplays.tension.html(int(ctrlTension.value()));
  valDisplays.ripple.html(nf(float(ctrlRipple.value()), 1, 1));
}

function readControls() {
  return {
    bias: float(ctrlSweep.value()),
    edge: float(ctrlEdge.value()),
    body: float(ctrlBloom.value()),
    wave: float(ctrlTension.value()),
    ripple: float(ctrlRipple.value())
  };
}

function buildDesignParams(ui) {
  return {
    frameScale: 0.72,
    alignX: 0.56,
    alignY: 0.52,
    peakBiasX: ui.bias,
    amplitude: map(ui.wave, 60, 190, 92, 168),
    sharpness: map(ui.edge, 0.55, 2.30, 0.80, 2.00),
    thicknessBase: map(ui.body, 10, 72, 10, 20),
    thicknessPeak: map(ui.body, 10, 72, 20, 42),
    rippleAmp: map(ui.ripple, 0, 18, 0, 9),
    minGap: map(ui.body, 10, 72, 16, 26),
    leftSkew: 1.42,
    rightSkew: 0.72,
    rightTailLift: 0.10
  };
}

function buildBandSpecs() {
  return [
    { id: 0, yOffset: -88, peakOffsetX: -0.024, ampScale: 1.00, widthScale: 0.78, rippleScale: 0.25, phase: -0.20 },
    { id: 1, yOffset:   0, peakOffsetX:  0.000, ampScale: 1.06, widthScale: 1.00, rippleScale: 0.15, phase:  0.00 },
    { id: 2, yOffset:  88, peakOffsetX:  0.026, ampScale: 1.00, widthScale: 0.86, rippleScale: 0.08, phase:  0.16 }
  ];
}

function getLogoFrame() {
  const side = min(width, height) * 0.78;
  return {
    x: width * 0.5 - side * 0.5,
    y: height * 0.5 - side * 0.5,
    size: side
  };
}

function draw() {
  clear();
  drawLogo(isPaused ? 0 : millis() * 0.001);
}

function drawLogo(time) {
  randomSeed(seedValue);
  noiseSeed(seedValue);

  const ui = readControls();
  const dp = buildDesignParams(ui);
  const bands = buildBandSpecs();
  const frame = getLogoFrame();

  const centerlines = bands.map(b => sampleCenterline(frame, b, dp, time, 190));
  enforceClearance(centerlines, bands, dp);

  const polygons = centerlines.map((line, i) => buildBandPolygon(line, bands[i], dp));

  fill('#171717');
  noStroke();
  polygons.forEach(drawPolygon);
}

function sampleCenterline(frame, band, dp, t, steps) {
  const pts = [];
  const logoW = frame.size * 0.86;
  const startX = frame.x + frame.size * 0.07 + frame.size * 0.035;
  const endX = startX + logoW;
  const baseY = frame.y + frame.size * dp.alignY + band.yOffset;
  const peakU = constrain(0.50 + dp.peakBiasX + band.peakOffsetX, 0.34, 0.68);

  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    const x = lerp(startX, endX, u);
    const local = map(u, 0, 1, -2.75, 3.25);
    const peakLocal = map(peakU, 0, 1, -2.75, 3.25);
    const d0 = local - peakLocal;
    const d = d0 < 0 ? d0 * dp.leftSkew : d0 * dp.rightSkew;

    const crest = dp.amplitude * band.ampScale * Math.exp(-(d * d) / (1.15 + dp.sharpness * 0.60));
    const leftValley = dp.amplitude * 0.25 * Math.exp(-sq((d0 + 1.35) / 0.72));
    const rightValley = dp.amplitude * 0.18 * Math.exp(-sq((d0 - 1.70) / 0.90));
    const baseWave = sin(u * TWO_PI * 1.04 - 0.65 + band.phase) * dp.amplitude * 0.070;
    const tailLift = smoothstep(0.66, 1.0, u) * dp.amplitude * dp.rightTailLift;
    const ripple = sin(u * TWO_PI * 5.4 + t * 1.0 + band.id * 0.8)
      * dp.rippleAmp * band.rippleScale
      * Math.exp(-sq(d0 / 2.1));

    const live = sin(t * 1.0 + band.id + u * 2.0) * 0.8;
    const y = baseY - crest + leftValley + rightValley + baseWave - tailLift + ripple + live;
    pts.push({ x, y, u, d: d0, dWarped: d });
  }

  return pts;
}

function thicknessAt(p, band, dp) {
  const base = dp.thicknessBase * band.widthScale;
  const peak = dp.thicknessPeak * band.widthScale * Math.exp(-(p.dWarped * p.dWarped) / 2.25);
  const taperL = smoothstep(0.00, 0.10, p.u);
  const taperR = 1.0 - smoothstep(0.92, 1.00, p.u);
  const taper = map(taperL * taperR, 0, 1, 0.82, 1.0);
  return (base + peak) * taper;
}

function buildBandPolygon(centerPts, band, dp) {
  const top = [];
  const bottom = [];

  for (let i = 0; i < centerPts.length; i++) {
    const p = centerPts[i];
    const prev = centerPts[max(0, i - 1)];
    const next = centerPts[min(centerPts.length - 1, i + 1)];
    const dx = next.x - prev.x;
    const dy = next.y - prev.y;
    const len = max(0.0001, sqrt(dx * dx + dy * dy));
    const nx = -dy / len;
    const ny = dx / len;
    const th = thicknessAt(p, band, dp) * 0.5;

    top.push({ x: p.x + nx * th, y: p.y + ny * th });
    bottom.push({ x: p.x - nx * th, y: p.y - ny * th });
  }

  return top.concat(bottom.reverse());
}

function enforceClearance(centerlines, bands, dp) {
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 1; i < centerlines.length; i++) {
      const upper = centerlines[i - 1];
      const lower = centerlines[i];
      const upperBand = bands[i - 1];
      const lowerBand = bands[i];

      for (let j = 0; j < lower.length; j++) {
        const upperBottom = upper[j].y + thicknessAt(upper[j], upperBand, dp) * 0.5;
        const lowerTop = lower[j].y - thicknessAt(lower[j], lowerBand, dp) * 0.5;
        const gap = lowerTop - upperBottom;

        if (gap < dp.minGap) {
          lower[j].y += (dp.minGap - gap) * 0.72;
        }
      }
    }
  }
}

function drawPolygon(poly) {
  beginShape();
  poly.forEach(p => vertex(p.x, p.y));
  endShape(CLOSE);
}

function smoothstep(edge0, edge1, x) {
  const t = constrain((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function keyPressed() {
  if (key === ' ') isPaused = !isPaused;
  if (key === 'r' || key === 'R') seedValue = int(random(100000));
  if (key === 's' || key === 'S') saveCanvas('qt_ensin_base_wave_v02', 'png');
}
