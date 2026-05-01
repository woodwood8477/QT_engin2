/**
 * QT_ensin Wave Logo Engine v6.2
 * Rendering: v6.1 left-aligned scaled Gaussian bands
 * UI: QT_engin responsive controller, fully wired and no-scroll
 */

let chordSelect, ctrlSweep, ctrlEdge, ctrlBloom, ctrlTension, ctrlRipple;
let valDisplays = {};
let playButton, resetButton, xyPad, xyKnob, presetTitle;
let isPlaying = true;

const presets = [
  { name: 'A Major', sweep: 0.0,  edge: 1.2, bloom: 45, tension: 100, ripple: 0.0 },
  { name: 'A Minor', sweep: 0.4,  edge: 0.9, bloom: 35, tension: 70,  ripple: 4.0 },
  { name: 'A Tense', sweep: -0.8, edge: 0.6, bloom: 55, tension: 120, ripple: 18.0 },
  { name: 'A Cluster', sweep: 0.5,  edge: 1.5, bloom: 40, tension: 85,  ripple: 10.0 }
];

function setup() {
  const side = getCanvasSide();
  let canvas = createCanvas(side, side);
  canvas.parent('canvas-container');
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

  playButton = select('#playButton');
  resetButton = select('#resetButton');
  xyPad = document.querySelector('.xy-pad');
  xyKnob = document.querySelector('#xyKnob');
  presetTitle = document.querySelector('#presetTitle');

  chordSelect.changed(() => applyPreset(int(chordSelect.value())));

  [ctrlSweep, ctrlEdge, ctrlBloom, ctrlTension, ctrlRipple].forEach(el => {
    el.input(updateDisplays);
  });

  if (playButton) {
    playButton.mousePressed(() => {
      isPlaying = !isPlaying;
      playButton.html(isPlaying ? '▶' : 'Ⅱ');
      playButton.elt.classList.toggle('is-paused', !isPlaying);
    });
  }

  if (resetButton) {
    resetButton.mousePressed(() => applyPreset(int(chordSelect.value())));
  }

  document.querySelectorAll('.preset-button').forEach(btn => {
    btn.addEventListener('click', () => {
      const presetIndex = parseInt(btn.dataset.preset, 10) || 0;
      chordSelect.value(presetIndex);
      applyPreset(presetIndex);
      document.querySelectorAll('.preset-button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  if (xyPad) {
    xyPad.addEventListener('pointerdown', handleXYPointer);
    xyPad.addEventListener('pointermove', handleXYPointer);
  }

  applyPreset(0);
}

function windowResized() {
  const side = getCanvasSide();
  resizeCanvas(side, side);
}

function getCanvasSide() {
  const isMobile = window.innerWidth <= 960;
  const availableW = isMobile ? window.innerWidth : window.innerWidth - 520;
  const availableH = isMobile ? window.innerHeight * 0.45 : window.innerHeight;
  return Math.max(280, Math.min(680, availableW * 0.72, availableH * 0.76));
}

function applyPreset(index) {
  const p = presets[index] || presets[0];
  ctrlSweep.value(p.sweep);
  ctrlEdge.value(p.edge);
  ctrlBloom.value(p.bloom);
  ctrlTension.value(p.tension);
  ctrlRipple.value(p.ripple);
  if (presetTitle) presetTitle.textContent = p.name;
  updateDisplays();
}

function handleXYPointer(e) {
  if (!e.buttons && e.type !== 'pointerdown') return;
  const rect = xyPad.getBoundingClientRect();
  const pad = 38;
  const x = constrain(e.clientX - rect.left, pad, rect.width - pad);
  const y = constrain(e.clientY - rect.top, pad, rect.height - pad);
  const nx = (x - pad) / (rect.width - pad * 2);
  const ny = 1 - ((y - pad) / (rect.height - pad * 2));

  const sweep = map(nx, 0, 1, -1.5, 1.5);
  const edge = map(ny, 0, 1, 0.4, 2.5);

  ctrlSweep.value(sweep);
  ctrlEdge.value(edge);
  updateDisplays();
}

function updateDisplays() {
  const sweep = parseFloat(ctrlSweep.value());
  const edge = parseFloat(ctrlEdge.value());
  const bloom = parseFloat(ctrlBloom.value());
  const tension = parseFloat(ctrlTension.value());
  const ripple = parseFloat(ctrlRipple.value());

  valDisplays.sweep.html(sweep.toFixed(1));
  valDisplays.edge.html(edge.toFixed(1));
  valDisplays.bloom.html(String(int(bloom)));
  valDisplays.tension.html(String(int(tension)));
  valDisplays.ripple.html(ripple.toFixed(1));

  updateXYKnob(sweep, edge);
}

function updateXYKnob(sweep, edge) {
  if (!xyKnob || !xyPad) return;
  const nx = map(sweep, -1.5, 1.5, 0, 1);
  const ny = 1 - map(edge, 0.4, 2.5, 0, 1);
  const pad = 38;
  const x = pad + nx * (xyPad.clientWidth - pad * 2);
  const y = pad + ny * (xyPad.clientHeight - pad * 2);
  xyKnob.style.left = `${x}px`;
  xyKnob.style.top = `${y}px`;
}

function draw() {
  clear();
  let time = isPlaying ? millis() * 0.001 : 0;

  let p_sweep   = parseFloat(ctrlSweep.value());
  let p_edge    = parseFloat(ctrlEdge.value());
  let p_bloom   = parseFloat(ctrlBloom.value());
  let p_tension = parseFloat(ctrlTension.value());
  let p_ripple  = parseFloat(ctrlRipple.value());

  push();
  translate(0, 30);

  for (let i = 0; i < 3; i++) {
    drawGaussianBand(i, time, p_sweep, p_edge, p_bloom, p_tension, p_ripple);
  }

  pop();
}

function drawGaussianBand(index, time, sweep, edge, bloom, tension, ripple) {
  fill('#1a1a1a');
  beginShape();

  let pts = [];
  let steps = 150;
  let spacing = 90;

  let bandAmp = tension * (index === 2 ? 1.3 : (index === 1 ? 1.05 : 0.85));
  let bandVar = edge * (index === 2 ? 1.3 : (index === 1 ? 1.0 : 1.1));

  let phaseShift = (index - 1) * sweep;

  let rippleFreq = 5.0 + index;
  let currentRippleAmp = (index === 0) ? ripple : (index === 1 ? ripple * 0.2 : 0);

  for (let j = 0; j <= steps; j++) {
    let x = map(j, 0, steps, 30, width - 30);
    let nx = map(j, 0, steps, -1.8, 4.2);
    let sx = nx - phaseShift;

    let yBase = (height / 2) + (index - 1) * spacing;

    let peak = bandAmp * Math.exp(-(sx * sx) / bandVar);

    let dipAmp = tension * 0.35;
    let leftDip = dipAmp * Math.exp(-Math.pow(sx + 1.5, 2) / 0.6);
    let rightDip = dipAmp * Math.exp(-Math.pow(sx - 1.5, 2) / 0.6);

    let modulation = sin(sx * rippleFreq) * currentRippleAmp * Math.exp(-(sx * sx) / 2.0);
    let liveY = sin(time * 1.5 + index * 2 + nx) * 2;

    let cy = yBase - peak - modulation + leftDip + rightDip + liveY;

    let baseThick = 12 * (index === 2 ? 1.2 : (index === 0 ? 0.8 : 1.0));
    let peakThick = bloom * (index === 2 ? 1.0 : (index === 1 ? 1.2 : 0.8));
    let thickness = baseThick + peakThick * Math.exp(-(sx * sx) / (bandVar * 1.5));

    pts.push({ x: x, cy: cy, th: thickness });
    vertex(x, cy - thickness / 2);
  }

  for (let j = pts.length - 1; j >= 0; j--) {
    vertex(pts[j].x, pts[j].cy + pts[j].th / 2);
  }

  endShape(CLOSE);
}
