/**
 * QT_ensin Base Wave Logo Engine v0.1
 *
 * Goal:
 * - Build a logo-base form from three large wave bands.
 * - Keep the form inside a square design frame.
 * - Avoid band collisions by enforcing clearance after centerline sampling.
 * - Bias the mass to one side instead of keeping it visually centered.
 *
 * Legacy v6 files are preserved under /legacy.
 */

let chordSelect, ctrlSweep, ctrlEdge, ctrlBloom, ctrlTension, ctrlRipple;
let valDisplays = {};
let isPaused = false;
let seedValue = 4721;

const presets = [
  { bias: 0.24, edge: 1.20, body: 36, wave: 128, ripple: 0.0 },
  { bias: 0.32, edge: 1.05, body: 34, wave: 138, ripple: 0.0 },
  { bias: 0.18, edge: 1.45, body: 32, wave: 168, ripple: 0.0 },
  { bias: 0.28, edge: 1.55, body: 46, wave: 118, ripple: 1.8 }
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
  const side = constrain(min(windowWidth - 420, windowHeight), 520, 820);
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
    squareFit: 0.78,
    sideAlign: 0.60,
    peakBiasX: ui.bias,
    amplitude: map(ui.wave, 60, 190, 115, 230),
    sharpness: map(ui.edge, 0.55, 2.30, 0.90, 2.45),
    thicknessBase: map(ui.body, 10, 72, 8, 20),
    thicknessPeak: map(ui.body, 10, 72, 18, 46),
    rippleAmp: map(ui.ripple, 0, 18, 0, 11),
    minGap: map(ui.body, 10, 72, 20, 34),
    leftSpan: 0.70,
    rightSpan: 1.24,
    tailLift: 0.10
  };
}

function buildBandSpecs() {
  return [
    { id: 0, yOffset: -126, peakOffsetX: -0.055, ampScale: 0.90, widthScale: 0.72, rippleScale: 0.34, tail: -0.10 },
    { id: 1, yOffset: 0,    peakOffsetX:  0.000, ampScale: 1.06, widthScale: 0.94, rippleScale: 0.20, tail:  0.00 },
    { id: 2, yOffset: 128,  peakOffsetX:  0.050, ampScale: 0.95, widthScale: 0.82, rippleScale: 0.12, tail:  0.08 }
  ];
}

function getSquareFrame() {
  const side = min(width, height) * 0.78;
  return {
    x: width * 0.5 - side * 0.5,
    y: height * 0.5 - side * 0.5,
    size: side
  };
}

function draw() {
  clear();
  if (isPaused) return drawLogo(millis() * 0.001, true);
  drawLogo(millis() * 0.001, false);
}

function drawLogo(time, freeze) {
  randomSeed(seedValue);
  noiseSeed(seedValue);

  const ui = readControls();
  const dp = buildDesignParams(ui);
  const bands = buildBandSpecs();
  const frame = getSquareFrame();

  let centerlines = bands.map(b => sampleCenterline(frame, b, dp, freeze ? 0 : time, 190));
  enforceBandClearance(centerlines, bands, dp);

  let polygons = centerlines.map((line, i) => buildBandPolygon(line, bands[i], dp));
  polygons = normalizePolygonsToFrame(polygons, frame, dp.sideAlign, 0.52);

  fill('#171717');
  noStroke();
  polygons.forEach(drawPolygon);
}

function sampleCenterline(frame, band, dp, t, steps) {
  const pts = [];
  const left = frame.x;
  const right = frame.x + frame.size;
  const baseY = frame.y + frame.size * 0.54 + band.yOffset;
  const peakU = constrain(0.50 + dp.peakBiasX + band.peakOffsetX, 0.20, 0.82);

  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    const x = lerp(left, right, u);
    const d = u - peakU;
    const warped = d < 0 ? d / dp.leftSpan : d / dp.rightSpan;

    const crest = dp.amplitude * band.ampScale * Math.exp(-(warped * warped) * (5.3 * dp.sharpness));
    const broadWave = sin((u * TWO_PI * 1.08) - 0.58) * dp.amplitude * 0.145;
    const returnWave = sin((u * TWO_PI * 0.72) + 1.18 + band.tail) * dp.amplitude * 0.075;
    const sideDipL = Math.exp(-sq((u - 0.20) / 0.17)) * dp.amplitude * 0.11;
    const sideDipR = Math.exp(-sq((u - 0.82) / 0.22)) * dp.amplitude * 0.09;
    const ripple = sin(u * TWO_PI * 5.8 + t * 1.15 + band.id * 0.73)
      * dp.rippleAmp * band.rippleScale
      * Math.exp(-(warped * warped) * 8.0);

    const y = baseY - crest + broadWave + returnWave + sideDipL + sideDipR + ripple;
    pts.push({ x, y, u, d: warped });
  }

  return pts;
}

function thicknessAt(p, band, dp) {
  const base = dp.thicknessBase * band.widthScale;
  const shoulder = Math.exp(-(p.d * p.d) * 4.1);
  const peak = dp.thicknessPeak * band.widthScale * shoulder;
  const endTaper = smoothstep(0.02, 0.16, p.u) * (1.0 - smoothstep(0.86, 0.99, p.u));
  return (base + peak) * map(endTaper, 0, 1, 0.58, 1.0);
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

function enforceBandClearance(centerlines, bands, dp) {
  for (let pass = 0; pass < 3; pass++) {
    for (let i = 1; i < centerlines.length; i++) {
      const upper = centerlines[i - 1];
      const lower = centerlines[i];
      const upperBand = bands[i - 1];
      const lowerBand = bands[i];

      for (let j = 0; j < lower.length; j++) {
        const upperTh = thicknessAt(upper[j], upperBand, dp) * 0.5;
        const lowerTh = thicknessAt(lower[j], lowerBand, dp) * 0.5;
        const gap = (lower[j].y - lowerTh) - (upper[j].y + upperTh);

        if (gap < dp.minGap) {
          const push = (dp.minGap - gap) * 0.56;
          lower[j].y += push;
          upper[j].y -= push * 0.18;
        }
      }
    }
  }
}

function normalizePolygonsToFrame(polygons, frame, alignX, alignY) {
  const b = getBounds(polygons);
  const scale = min(frame.size / b.w, frame.size / b.h) * 0.92;
  const sourceCx = (b.minX + b.maxX) * 0.5;
  const sourceCy = (b.minY + b.maxY) * 0.5;
  const targetCx = frame.x + frame.size * alignX;
  const targetCy = frame.y + frame.size * alignY;

  return polygons.map(poly => poly.map(p => ({
    x: (p.x - sourceCx) * scale + targetCx,
    y: (p.y - sourceCy) * scale + targetCy
  })));
}

function getBounds(polygons) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  polygons.forEach(poly => {
    poly.forEach(p => {
      minX = min(minX, p.x);
      minY = min(minY, p.y);
      maxX = max(maxX, p.x);
      maxY = max(maxY, p.y);
    });
  });

  return { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY };
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
  if (key === 's' || key === 'S') saveCanvas('qt_ensin_base_wave', 'png');
}
