/**
 * QT_ensin Wave Logo Engine v6.3
 * Audio: p5.sound triad oscillator
 * Geometry: chord interval driven Gaussian wave bands
 * UI: QT_engin responsive no-scroll controller
 */

let chordSelect, ctrlSweep, ctrlEdge, ctrlBloom, ctrlTension, ctrlRipple, ctrlVol;
let valDisplays = {};
let playButton, resetButton, motionButton, xyPad, xyKnob, presetTitle, rangeText, valVol;
let motionEnabled = false;
let audioReady = false;
let isSounding = false;
let oscs = [];
let envs = [];
let currentPresetIndex = 0;

const rootFreq = 440;
const chordPresets = [
  { name: 'A Major', short: 'MAJ', semis: [0, 4, 7], sweep: 0.0,  edge: 1.15, bloom: 42, tension: 116, ripple: 0.0 },
  { name: 'A Minor', short: 'MIN', semis: [0, 3, 7], sweep: 0.35, edge: 0.95, bloom: 36, tension: 86,  ripple: 4.0 },
  { name: 'A Diminished', short: 'DIM', semis: [0, 3, 6], sweep: -0.55, edge: 0.75, bloom: 50, tension: 128, ripple: 12.0 },
  { name: 'A Cluster', short: 'CLS', semis: [0, 1, 2], sweep: 0.50, edge: 1.55, bloom: 38, tension: 98,  ripple: 18.0 }
];

function setup() {
  const side = getCanvasSide();
  const canvas = createCanvas(side, side);
  canvas.parent('canvas-container');
  noStroke();

  chordSelect = select('#chordSelect');
  ctrlSweep   = select('#ctrlSweep');
  ctrlEdge    = select('#ctrlEdge');
  ctrlBloom   = select('#ctrlBloom');
  ctrlTension = select('#ctrlTension');
  ctrlRipple  = select('#ctrlRipple');
  ctrlVol     = select('#ctrlVol');

  valDisplays = {
    sweep:   select('#valSweep'),
    edge:    select('#valEdge'),
    bloom:   select('#valBloom'),
    tension: select('#valTension'),
    ripple:  select('#valRipple')
  };

  playButton = select('#playButton');
  resetButton = select('#resetButton');
  motionButton = select('#motionButton');
  xyPad = document.querySelector('.xy-pad');
  xyKnob = document.querySelector('#xyKnob');
  presetTitle = document.querySelector('#presetTitle');
  rangeText = document.querySelector('#rangeText');
  valVol = document.querySelector('#valVol');

  chordSelect.changed(() => applyPreset(int(chordSelect.value()), true));

  [ctrlSweep, ctrlEdge, ctrlBloom, ctrlTension, ctrlRipple, ctrlVol].forEach(el => {
    if (el) el.input(updateDisplays);
  });

  if (playButton) playButton.mousePressed(toggleSound);
  if (resetButton) resetButton.mousePressed(() => applyPreset(currentPresetIndex, true));
  if (motionButton) {
    motionButton.mousePressed(() => {
      motionEnabled = !motionEnabled;
      motionButton.elt.classList.toggle('is-active', motionEnabled);
      motionButton.html(motionEnabled ? 'MOTION' : 'STATIC');
    });
    motionButton.elt.classList.toggle('is-active', motionEnabled);
    motionButton.html(motionEnabled ? 'MOTION' : 'STATIC');
  }

  document.querySelectorAll('.preset-button').forEach(btn => {
    btn.addEventListener('click', () => {
      const presetIndex = parseInt(btn.dataset.preset, 10) || 0;
      applyPreset(presetIndex, true);
      document.querySelectorAll('.preset-button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  if (xyPad) {
    xyPad.addEventListener('pointerdown', handleXYPointer);
    xyPad.addEventListener('pointermove', handleXYPointer);
  }

  applyPreset(0, false);
  debugConnections();
}

function debugConnections() {
  const required = [chordSelect, ctrlSweep, ctrlEdge, ctrlBloom, ctrlTension, ctrlRipple, ctrlVol, playButton, resetButton, motionButton];
  const ok = required.every(Boolean) && xyPad && xyKnob && presetTitle && rangeText;
  console.log(`[QT_ensin debug] UI connected: ${ok ? 'OK' : 'MISSING'}`);
  console.log('[QT_ensin debug] chord engine:', chordPresets.map(p => `${p.short}:${p.semis.join('-')}`).join(' / '));
}

function windowResized() {
  resizeCanvas(getCanvasSide(), getCanvasSide());
  updateDisplays();
}

function getCanvasSide() {
  const isMobile = window.innerWidth <= 960;
  const availableW = isMobile ? window.innerWidth : window.innerWidth - 500;
  const availableH = isMobile ? window.innerHeight * 0.42 : window.innerHeight;
  return Math.max(280, Math.min(680, availableW * 0.66, availableH * 0.72));
}

function applyPreset(index, shouldTriggerSound) {
  currentPresetIndex = index;
  const p = chordPresets[index] || chordPresets[0];
  chordSelect.value(index);
  ctrlSweep.value(p.sweep);
  ctrlEdge.value(p.edge);
  ctrlBloom.value(p.bloom);
  ctrlTension.value(p.tension);
  ctrlRipple.value(p.ripple);
  if (presetTitle) presetTitle.textContent = p.name;
  if (rangeText) rangeText.textContent = buildRangeText(p);
  updateDisplays();
  if (shouldTriggerSound && isSounding) playChord();
}

function buildRangeText(p) {
  const names = p.semis.map(semi => midiName(69 + semi));
  return `${names.join(' · ')} / ${p.semis.join(' · ')}`;
}

function midiName(midi) {
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const name = names[midi % 12];
  const oct = Math.floor(midi / 12) - 1;
  return `${name}${oct}`;
}

function chordRatios() {
  return (chordPresets[currentPresetIndex] || chordPresets[0]).semis.map(semi => Math.pow(2, semi / 12));
}

function getIntervalModel() {
  const p = chordPresets[currentPresetIndex] || chordPresets[0];
  const semis = p.semis;
  const span = semis[2] - semis[0];
  const third = semis[1] - semis[0];
  const top = semis[2] - semis[1];
  const symmetry = 1 - Math.min(1, Math.abs(third - top) / 5);
  const tension = Math.min(1, (Math.abs(third - 4) + Math.abs(top - 3)) / 6);
  return { semis, span, third, top, symmetry, tension };
}

function handleXYPointer(e) {
  if (!e.buttons && e.type !== 'pointerdown') return;
  const rect = xyPad.getBoundingClientRect();
  const pad = 34;
  const x = constrain(e.clientX - rect.left, pad, rect.width - pad);
  const y = constrain(e.clientY - rect.top, pad, rect.height - pad);
  const nx = (x - pad) / (rect.width - pad * 2);
  const ny = 1 - ((y - pad) / (rect.height - pad * 2));

  ctrlSweep.value(map(nx, 0, 1, -1.5, 1.5));
  ctrlEdge.value(map(ny, 0, 1, 0.4, 2.5));
  updateDisplays();
}

function updateDisplays() {
  const sweep = parseFloat(ctrlSweep.value());
  const edge = parseFloat(ctrlEdge.value());
  const bloom = parseFloat(ctrlBloom.value());
  const tension = parseFloat(ctrlTension.value());
  const ripple = parseFloat(ctrlRipple.value());
  const vol = ctrlVol ? parseFloat(ctrlVol.value()) : 78;

  valDisplays.sweep.html(sweep.toFixed(1));
  valDisplays.edge.html(edge.toFixed(1));
  valDisplays.bloom.html(String(int(bloom)));
  valDisplays.tension.html(String(int(tension)));
  valDisplays.ripple.html(ripple.toFixed(1));
  if (valVol) valVol.textContent = `${int(vol)}%`;
  updateXYKnob(sweep, edge);
}

function updateXYKnob(sweep, edge) {
  if (!xyKnob || !xyPad) return;
  const nx = map(sweep, -1.5, 1.5, 0, 1);
  const ny = 1 - map(edge, 0.4, 2.5, 0, 1);
  const pad = 34;
  const x = pad + nx * Math.max(1, xyPad.clientWidth - pad * 2);
  const y = pad + ny * Math.max(1, xyPad.clientHeight - pad * 2);
  xyKnob.style.left = `${x}px`;
  xyKnob.style.top = `${y}px`;
}

function ensureAudio() {
  if (audioReady) return;
  userStartAudio();
  oscs = [];
  envs = [];
  for (let i = 0; i < 3; i++) {
    const osc = new p5.Oscillator('sine');
    const env = new p5.Envelope();
    env.setADSR(0.018, 0.18, 0.62, 0.72);
    env.setRange(0.24, 0.0);
    osc.amp(env);
    osc.start();
    oscs.push(osc);
    envs.push(env);
  }
  audioReady = true;
}

function toggleSound() {
  ensureAudio();
  isSounding = !isSounding;
  playButton.html(isSounding ? 'Ⅱ' : '▶');
  playButton.elt.classList.toggle('is-paused', isSounding);
  if (isSounding) playChord();
  else stopChord();
}

function playChord() {
  ensureAudio();
  const ratios = chordRatios();
  const interval = getIntervalModel();
  const vol = (ctrlVol ? parseFloat(ctrlVol.value()) : 78) / 100;
  ratios.forEach((ratio, i) => {
    const detune = (i - 1) * interval.tension * 1.5;
    oscs[i].freq(rootFreq * ratio + detune, 0.05);
    envs[i].setRange(vol * (i === 0 ? 0.22 : 0.17), 0.0);
    envs[i].play();
  });
}

function stopChord() {
  if (!audioReady) return;
  envs.forEach(env => env.triggerRelease());
}

function draw() {
  clear();
  const time = motionEnabled ? millis() * 0.001 : 0;
  const p_sweep   = parseFloat(ctrlSweep.value());
  const p_edge    = parseFloat(ctrlEdge.value());
  const p_bloom   = parseFloat(ctrlBloom.value());
  const p_tension = parseFloat(ctrlTension.value());
  const p_ripple  = parseFloat(ctrlRipple.value());
  const interval = getIntervalModel();

  push();
  translate(0, height * 0.035);
  for (let i = 0; i < 3; i++) {
    drawGaussianBand(i, time, p_sweep, p_edge, p_bloom, p_tension, p_ripple, interval);
  }
  pop();
}

function drawGaussianBand(index, time, sweep, edge, bloom, tension, ripple, interval) {
  fill('#1a1a1a');
  beginShape();

  const pts = [];
  const steps = 160;
  const spacing = 86 + interval.span * 3.0;
  const ratio = chordRatios()[index];
  const semitone = interval.semis[index];

  const chordAmp = 0.84 + ratio * 0.18 + index * 0.03;
  const intervalPush = (semitone / Math.max(1, interval.span)) * 0.18;
  const bandAmp = tension * (0.86 + index * 0.12) * chordAmp;
  const bandVar = edge * (1.0 + interval.tension * 0.38 + index * 0.08);
  const phaseShift = (index - 1) * sweep + (semitone - interval.semis[1]) * 0.045;
  const rippleFreq = 5.0 + index + interval.tension * 3.0;
  const currentRippleAmp = ripple * (index === 0 ? 0.75 : index === 1 ? 0.35 : 0.15);

  for (let j = 0; j <= steps; j++) {
    const x = map(j, 0, steps, width * 0.12, width * 0.88);
    const nx = map(j, 0, steps, -1.65, 3.75);
    const sx = nx - phaseShift;
    const yBase = (height / 2) + (index - 1) * spacing;

    const peak = bandAmp * Math.exp(-(sx * sx) / bandVar);
    const dipAmp = tension * (0.28 + interval.tension * 0.10);
    const leftDip = dipAmp * Math.exp(-Math.pow(sx + 1.38, 2) / 0.62);
    const rightDip = dipAmp * Math.exp(-Math.pow(sx - 1.60, 2) / 0.80);
    const modulation = sin(sx * rippleFreq) * currentRippleAmp * Math.exp(-(sx * sx) / 2.0);
    const liveY = motionEnabled ? sin(time * (1.2 + ratio * 0.45) + index * 2 + nx) * (5.0 + interval.tension * 5.0) : 0;
    const breathe = motionEnabled ? sin(time * 0.72 + index) * (2.0 + interval.symmetry * 2.2) : 0;

    const cy = yBase - peak - modulation + leftDip + rightDip + liveY + breathe - intervalPush * tension;
    const baseThick = 12 * (index === 2 ? 1.16 : (index === 0 ? 0.82 : 1.0));
    const peakThick = bloom * (index === 2 ? 0.96 : (index === 1 ? 1.14 : 0.82));
    const thickness = baseThick + peakThick * Math.exp(-(sx * sx) / (bandVar * 1.45));

    pts.push({ x, cy, th: thickness });
    vertex(x, cy - thickness / 2);
  }

  for (let j = pts.length - 1; j >= 0; j--) {
    vertex(pts[j].x, pts[j].cy + pts[j].th / 2);
  }

  endShape(CLOSE);
}
