/**
 * QT_ensin Wave Logo Engine v7.7
 * - Default STATIC shape restored to a calmer logo baseline.
 * - Six triads only: MAJ / MIN / AUG / DIM / SUS4 / SUS2.
 * - Chord intervals still move the peak positions, but within a logo-safe range.
 * - Motion remains aggressive only when MOTION is enabled.
 * - Button flash + XY knob-center lime glow are transient only.
 */

let chordSelect, ctrlSweep, ctrlEdge, ctrlBloom, ctrlTension, ctrlVol;
let valDisplays = {};
let playButton, resetButton, motionButton, xyPad, xyKnob, presetTitle, rangeText, valVol;
let st;
let audio = null;
let activePage = 'morph';
let xyDragging = false;
let lastAudioUiUpdate = 0;

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const CHORDS = [
  { label: 'MAJ',  name: 'Major Triad',      intervals: [0, 4, 7], tone: 0.16, wide: 0.26, dense: 0.10, curl: 0.12 },
  { label: 'MIN',  name: 'Minor Triad',      intervals: [0, 3, 7], tone: 0.28, wide: 0.10, dense: 0.22, curl: 0.16 },
  { label: 'AUG',  name: 'Augmented Triad',  intervals: [0, 4, 8], tone: 0.48, wide: 0.36, dense: 0.18, curl: 0.26 },
  { label: 'DIM',  name: 'Diminished Triad', intervals: [0, 3, 6], tone: 0.64, wide: -0.12, dense: 0.48, curl: 0.34 },
  { label: 'SUS4', name: 'Sus4 Triad',       intervals: [0, 5, 7], tone: 0.38, wide: 0.20, dense: 0.30, curl: 0.20 },
  { label: 'SUS2', name: 'Sus2 Triad',       intervals: [0, 2, 7], tone: 0.40, wide: 0.06, dense: 0.38, curl: 0.22 }
];

function defaultState(chord = 0) {
  const presets = [
    { sweep: 0.50, edge: 0.48, bloom: 0.40, tension: 0.38 },
    { sweep: 0.55, edge: 0.40, bloom: 0.34, tension: 0.36 },
    { sweep: 0.59, edge: 0.52, bloom: 0.44, tension: 0.44 },
    { sweep: 0.38, edge: 0.32, bloom: 0.40, tension: 0.50 },
    { sweep: 0.54, edge: 0.42, bloom: 0.38, tension: 0.42 },
    { sweep: 0.43, edge: 0.44, bloom: 0.36, tension: 0.40 }
  ];
  return {
    playing: st ? st.playing : false,
    motion: false,
    volume: st ? st.volume : 0.78,
    chord,
    root: st ? st.root : 9,
    oct: st ? st.oct : 4,
    ...presets[chord]
  };
}

function setup() {
  const side = getCanvasSide();
  const canvas = createCanvas(side, side);
  canvas.parent('canvas-container');
  pixelDensity(Math.min(window.devicePixelRatio || 1, 2));
  noStroke();

  bindDom();
  st = defaultState(0);
  bindUiEvents();
  setPage('morph');
  syncUIFromState();
  debugConnections();
}

function bindDom() {
  chordSelect = select('#chordSelect');
  ctrlSweep   = select('#ctrlSweep');
  ctrlEdge    = select('#ctrlEdge');
  ctrlBloom   = select('#ctrlBloom');
  ctrlTension = select('#ctrlTension');
  ctrlVol     = select('#ctrlVol');

  valDisplays = {
    sweep: select('#valSweep'), edge: select('#valEdge'), bloom: select('#valBloom'), tension: select('#valTension')
  };

  playButton = select('#playButton');
  resetButton = select('#resetButton');
  motionButton = select('#motionButton');
  xyPad = document.querySelector('.xy-pad');
  xyKnob = document.querySelector('#xyKnob');
  presetTitle = document.querySelector('#presetTitle');
  rangeText = document.querySelector('#rangeText');
  valVol = document.querySelector('#valVol');
}

function bindUiEvents() {
  bindButton(playButton?.elt, toggleTransport);
  bindButton(resetButton?.elt, resetAll);
  bindButton(motionButton?.elt, toggleMotion);

  document.querySelectorAll('.tab-button').forEach(btn => bindButton(btn, () => setPage(btn.dataset.page || 'morph')));

  [ctrlBloom, ctrlTension, ctrlVol].forEach(el => {
    if (el) el.input(() => { syncStateFromUI(); refreshAudio(false); });
  });

  if (chordSelect) chordSelect.changed(() => setChord(int(chordSelect.value())));

  document.querySelectorAll('.preset-button').forEach(btn => {
    bindButton(btn, () => setChord(parseInt(btn.dataset.preset, 10) || 0));
  });

  document.querySelectorAll('[data-note-action]').forEach(btn => {
    bindButton(btn, () => {
      if (btn.dataset.noteAction === 'down') changeRoot(-1);
      if (btn.dataset.noteAction === 'up') changeRoot(1);
    });
  });

  document.querySelectorAll('[data-oct-action]').forEach(btn => {
    bindButton(btn, () => {
      if (btn.dataset.octAction === 'down') changeOct(-1);
      if (btn.dataset.octAction === 'up') changeOct(1);
    });
  });

  if (xyPad) {
    xyPad.addEventListener('pointerdown', handleXYPointerDown);
    xyPad.addEventListener('pointermove', handleXYPointerMove);
    xyPad.addEventListener('pointerup', handleXYPointerUp);
    xyPad.addEventListener('pointercancel', handleXYPointerUp);
    xyPad.addEventListener('lostpointercapture', handleXYPointerUp);
  }
}

function bindButton(el, handler) {
  if (!el) return;
  el.addEventListener('click', (e) => {
    e.preventDefault();
    flashButton(el);
    handler();
  });
}

function flashButton(el) {
  if (!el) return;
  el.classList.remove('button-flash');
  void el.offsetWidth;
  el.classList.add('button-flash');
  setTimeout(() => el.classList.remove('button-flash'), 240);
}

function setPage(page) {
  activePage = page === 'harmony' ? 'harmony' : 'morph';
  document.querySelectorAll('.tab-button').forEach(btn => btn.classList.toggle('active', btn.dataset.page === activePage));
  document.querySelectorAll('.ui-page').forEach(el => el.classList.toggle('active', el.id === `${activePage}Page`));
}

function debugConnections() {
  const required = [chordSelect, ctrlSweep, ctrlEdge, ctrlBloom, ctrlTension, ctrlVol, playButton, resetButton, motionButton];
  const ok = required.every(Boolean) && !!xyPad && !!xyKnob;
  console.log('[QT_ensin2] UI connected:', ok);
  console.log('[QT_ensin2] version: v7.7 normal-stable');
}

function windowResized() {
  resizeCanvas(getCanvasSide(), getCanvasSide());
  syncUIFromState();
}

function getCanvasSide() {
  const isMobile = window.innerWidth <= 960;
  if (isMobile) {
    const safeH = Math.max(360, window.innerHeight || 720);
    return Math.max(268, Math.min(410, window.innerWidth * 0.68, safeH * 0.335));
  }
  const availableW = window.innerWidth - 560;
  const availableH = window.innerHeight;
  return Math.max(320, Math.min(690, availableW * 0.68, availableH * 0.74));
}

function setChord(i) {
  const keepPlaying = st.playing;
  const keepVol = st.volume;
  const keepRoot = st.root;
  const keepOct = st.oct;
  st = defaultState(constrain(i, 0, CHORDS.length - 1));
  st.playing = keepPlaying;
  st.volume = keepVol;
  st.root = keepRoot;
  st.oct = keepOct;
  syncUIFromState();
  refreshAudio(true);
}

function resetAll() {
  const keepPlaying = st.playing;
  const keepVol = st.volume;
  const keepChord = st.chord;
  const keepRoot = st.root;
  const keepOct = st.oct;
  st = defaultState(keepChord);
  st.playing = keepPlaying;
  st.volume = keepVol;
  st.root = keepRoot;
  st.oct = keepOct;
  st.motion = false;
  syncUIFromState();
  refreshAudio(true);
}

function changeRoot(delta) {
  st.root = (st.root + delta + 12) % 12;
  syncUIFromState();
  refreshAudio(true);
}

function changeOct(delta) {
  st.oct = constrain(st.oct + delta, 2, 6);
  syncUIFromState();
  refreshAudio(true);
}

function toggleTransport() {
  ensureAudio();
  if (!audio) return;
  st.playing = !st.playing;
  syncTransportUi();
  if (st.playing) refreshAudio(true);
  else stopAudio();
}

function toggleMotion() {
  st.motion = !st.motion;
  syncTransportUi();
}

function syncStateFromUI() {
  st.sweep = map(parseFloat(ctrlSweep.value()), -1.5, 1.5, 0, 1);
  st.edge = map(parseFloat(ctrlEdge.value()), 0.4, 2.5, 0, 1);
  st.bloom = map(parseFloat(ctrlBloom.value()), 0, 100, 0, 1);
  st.tension = map(parseFloat(ctrlTension.value()), 0, 100, 0, 1);
  st.volume = map(parseFloat(ctrlVol.value()), 0, 100, 0, 1);
  syncReadouts();
}

function syncUIFromState() {
  if (chordSelect) chordSelect.value(st.chord);
  ctrlSweep.value(map(st.sweep, 0, 1, -1.5, 1.5));
  ctrlEdge.value(map(st.edge, 0, 1, 0.4, 2.5));
  ctrlBloom.value(map(st.bloom, 0, 1, 0, 100));
  ctrlTension.value(map(st.tension, 0, 1, 0, 100));
  ctrlVol.value(map(st.volume, 0, 1, 0, 100));

  if (presetTitle) presetTitle.textContent = `${NOTE_NAMES[st.root]} ${CHORDS[st.chord].name}`;
  if (rangeText) rangeText.textContent = buildRangeText();
  document.querySelectorAll('.preset-button').forEach(btn => btn.classList.toggle('active', parseInt(btn.dataset.preset, 10) === st.chord));
  const noteDisplay = document.querySelector('[data-note-display]');
  const octDisplay = document.querySelector('[data-oct-display]');
  if (noteDisplay) noteDisplay.textContent = NOTE_NAMES[st.root];
  if (octDisplay) octDisplay.textContent = String(st.oct);
  syncReadouts();
  syncTransportUi();
}

function syncReadouts() {
  const sweepVal = parseFloat(ctrlSweep.value());
  const edgeVal = parseFloat(ctrlEdge.value());
  if (valDisplays.sweep) valDisplays.sweep.html(sweepVal.toFixed(1));
  if (valDisplays.edge) valDisplays.edge.html(edgeVal.toFixed(1));
  if (valDisplays.bloom) valDisplays.bloom.html(String(int(ctrlBloom.value())));
  if (valDisplays.tension) valDisplays.tension.html(String(int(ctrlTension.value())));
  if (valVol) valVol.textContent = `${int(st.volume * 100)}%`;
  updateXYKnob(sweepVal, edgeVal);
}

function syncTransportUi() {
  if (playButton) {
    playButton.html(st.playing ? 'Ⅱ' : '▶');
    playButton.elt.classList.toggle('is-paused', st.playing);
  }
  if (motionButton) {
    motionButton.html(st.motion ? 'MOTION' : 'STATIC');
    motionButton.elt.classList.toggle('is-active', st.motion);
  }
}

function xyPadMetrics() {
  if (!xyPad) return null;
  const rect = xyPad.getBoundingClientRect();
  const side = Math.min(rect.width, rect.height);
  const pad = Math.max(28, side * 0.12);
  return { rect, pad };
}

function handleXYPointerDown(e) {
  xyDragging = true;
  xyPad.classList.add('is-dragging');
  if (xyPad && e.pointerId !== undefined) xyPad.setPointerCapture(e.pointerId);
  updateXYFromPointer(e, true);
}

function handleXYPointerMove(e) {
  if (!xyDragging) return;
  updateXYFromPointer(e, false);
}

function handleXYPointerUp(e) {
  xyDragging = false;
  if (xyPad) xyPad.classList.remove('is-dragging');
  if (xyPad && e && e.pointerId !== undefined && xyPad.hasPointerCapture(e.pointerId)) xyPad.releasePointerCapture(e.pointerId);
}

function updateXYFromPointer(e, fastAudio) {
  const m = xyPadMetrics();
  if (!m) return;
  e.preventDefault();
  const { rect, pad } = m;
  const x = constrain(e.clientX - rect.left, pad, rect.width - pad);
  const y = constrain(e.clientY - rect.top, pad, rect.height - pad);
  st.sweep = constrain((x - pad) / Math.max(1, rect.width - pad * 2), 0, 1);
  st.edge = constrain(1 - ((y - pad) / Math.max(1, rect.height - pad * 2)), 0, 1);
  const sweepVal = map(st.sweep, 0, 1, -1.5, 1.5);
  const edgeVal = map(st.edge, 0, 1, 0.4, 2.5);
  ctrlSweep.value(sweepVal);
  ctrlEdge.value(edgeVal);
  if (valDisplays.sweep) valDisplays.sweep.html(sweepVal.toFixed(1));
  if (valDisplays.edge) valDisplays.edge.html(edgeVal.toFixed(1));
  updateXYKnob(sweepVal, edgeVal);

  const now = millis();
  if (now - lastAudioUiUpdate > 28) {
    lastAudioUiUpdate = now;
    refreshAudio(fastAudio);
  }
}

function updateXYKnob(sweep, edge) {
  const m = xyPadMetrics();
  if (!xyKnob || !m) return;
  const { rect, pad } = m;
  const nx = map(sweep, -1.5, 1.5, 0, 1);
  const ny = 1 - map(edge, 0.4, 2.5, 0, 1);
  xyKnob.style.left = `${pad + nx * Math.max(1, rect.width - pad * 2)}px`;
  xyKnob.style.top = `${pad + ny * Math.max(1, rect.height - pad * 2)}px`;
}

function currentNotes() {
  const c = CHORDS[st.chord];
  const rootMidi = (st.oct + 1) * 12 + st.root;
  return c.intervals.map(iv => rootMidi + iv);
}

function midiToHz(m) { return 440 * Math.pow(2, (m - 69) / 12); }
function midiName(m) { return `${NOTE_NAMES[m % 12]}${Math.floor(m / 12) - 1}`; }
function buildRangeText() { const ns = currentNotes(); return `${ns.map(midiName).join(' · ')} / ${CHORDS[st.chord].intervals.join(' · ')}`; }

function triadProfile(i) {
  const c = CHORDS[st.chord];
  const ints = c.intervals;
  const base = [0, 4, 7];
  const iv = ints[i];
  const span = Math.max(1, ints[2] - ints[0]);
  const normalized = (iv - ints[0]) / span;
  const baseNorm = base[i] / 7;
  const prev = i === 0 ? ints[1] - ints[0] : ints[i] - ints[i - 1];
  const next = i === 2 ? ints[2] - ints[1] : ints[i + 1] - ints[i];
  return {
    iv,
    ratio: Math.pow(2, iv / 12),
    notePos: normalized,
    peakCenter: lerp(-0.50, 0.50, normalized) + (normalized - baseNorm) * 0.18,
    gapPrev: prev,
    gapNext: next,
    avgGap: (prev + next) * 0.5,
    pitchOffset: iv - base[i],
    tone: c.tone,
    wide: c.wide,
    density: c.dense,
    curl: c.curl
  };
}

function createAudioContext() {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  return new Ctx();
}

function ensureAudio() {
  if (audio) {
    if (audio.ctx.state === 'suspended') audio.ctx.resume();
    return;
  }
  const ctx = createAudioContext();
  if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume();

  const master = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  const dry = ctx.createGain();
  const wet = ctx.createGain();
  const delay = ctx.createDelay(1.0);
  const feedback = ctx.createGain();
  const input = ctx.createGain();
  master.gain.value = 0;
  filter.type = 'lowpass';
  input.connect(filter);
  filter.connect(dry); dry.connect(master);
  filter.connect(wet); wet.connect(delay); delay.connect(master); delay.connect(feedback); feedback.connect(delay);
  master.connect(ctx.destination);

  const voices = [];
  for (let i = 0; i < 3; i++) {
    const osc = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    osc.type = 'sine';
    osc2.type = 'triangle';
    gain.gain.value = 0;
    osc.connect(gain); osc2.connect(gain);
    if (pan) { gain.connect(pan); pan.connect(input); } else gain.connect(input);
    osc.start(); osc2.start();
    voices.push({ osc, osc2, gain, pan });
  }
  audio = { ctx, input, master, filter, dry, wet, delay, feedback, voices };
}

function setParam(p, v, tau = 0.08) {
  if (!p || !audio) return;
  const now = audio.ctx.currentTime;
  p.cancelScheduledValues(now);
  p.setTargetAtTime(Number.isFinite(v) ? v : 0, now, Math.max(0.012, tau));
}

function refreshAudio(fast) {
  if (!audio || !st.playing) return;
  if (audio.ctx.state === 'suspended') audio.ctx.resume();
  const c = CHORDS[st.chord];
  const notes = currentNotes();
  const sx = (st.sweep - 0.5) * 2;
  const edgeBip = (st.edge - 0.5) * 2;
  const energy = Math.abs(sx) * 0.55 + Math.abs(edgeBip) * 0.42 + st.tension * 0.68;
  const tau = fast ? 0.018 : 0.075;
  setParam(audio.master.gain, st.volume * (0.54 + energy * 0.30), 0.028);
  setParam(audio.filter.frequency, constrain(180 * Math.pow(2, st.edge * 5.8) + st.bloom * 2100 + st.tension * 2200, 140, 14500), tau);
  setParam(audio.filter.Q, constrain(0.40 + st.edge * 8.8 + st.tension * 6.2 + c.dense * 3.0, 0.35, 18), tau);
  const wet = constrain(0.01 + Math.pow(st.bloom, 1.35) * 0.72 + Math.abs(sx) * 0.10, 0.01, 0.88);
  setParam(audio.dry.gain, constrain(1.06 - wet * 0.30, 0.48, 1.08), tau);
  setParam(audio.wet.gain, wet, tau * 1.25);
  setParam(audio.delay.delayTime, constrain(0.018 + st.bloom * 0.38 + Math.abs(sx) * 0.15, 0.012, 0.62), tau * 1.4);
  setParam(audio.feedback.gain, constrain(0.03 + st.bloom * 0.58 + st.tension * 0.18, 0.02, 0.80), tau * 1.5);

  audio.voices.forEach((v, i) => {
    const tri = triadProfile(i), side = i - 1, f = midiToHz(notes[i]);
    const det = sx * (24 + st.edge * 28) * side + edgeBip * side * 12 + tri.tone * st.tension * side * 18;
    const ratio = constrain(1.02 + st.edge * 1.35 + st.bloom * 0.46 + st.tension * 0.30 + tri.ratio * 0.08 + side * sx * 0.04, 1.02, 3.4);
    const amp = (0.058 + st.edge * 0.030 + st.bloom * 0.065 + st.tension * 0.045 + tri.density * 0.018) / Math.sqrt(1.15);
    setParam(v.osc.frequency, f, tau);
    setParam(v.osc2.frequency, f * ratio, tau * 1.1);
    setParam(v.osc.detune, det, tau);
    setParam(v.osc2.detune, det * 0.62 + edgeBip * 10, tau);
    setParam(v.gain.gain, amp, 0.045);
    if (v.pan) setParam(v.pan.pan, constrain(side * 0.14 + sx * 0.68, -0.95, 0.95), 0.07);
  });
}

function stopAudio() {
  if (!audio) return;
  audio.voices.forEach(v => setParam(v.gain.gain, 0, 0.05));
  setParam(audio.master.gain, 0, 0.09);
}

function draw() {
  clear();
  const t = st.motion ? millis() * 0.001 : 0;
  const frame = logoFrame();
  push();
  translate(frame.x, frame.y);
  scale(frame.s);
  for (let i = 0; i < 3; i++) drawGaussianBand(i, t);
  pop();
}

function logoFrame() {
  const side = min(width, height);
  const isMobile = window.innerWidth <= 960;
  const safe = isMobile ? 0.90 : 0.86;
  return { x: side * 0.5, y: side * 0.55, s: (side / 600) * safe };
}

function drawGaussianBand(index, time) {
  const tri = triadProfile(index);
  const sweep = (st.sweep - 0.5) * 2;
  const edge = st.edge;
  const edgeBip = (edge - 0.5) * 2;
  const tense = st.tension;
  const bloom = st.bloom;
  const ampBase = 46 + tense * 104 + edge * 32;
  const spacing = 76 + CHORDS[st.chord].intervals[2] * 2.2 + tri.wide * 5 - tri.density * 5 + tense * 18;
  const bandAmp = ampBase * (0.68 + index * 0.11 + tri.ratio * 0.10 + tri.tone * 0.08);
  const bandVar = constrain(0.62 + edge * 2.10 + tri.wide * 0.10 - tri.density * 0.06, 0.42, 2.72);
  const phaseShift = tri.peakCenter + (index - 1) * sweep * 0.50 + tri.curl * 0.04;
  const skew = sweep * (0.13 + index * 0.025);

  fill('#1a1a1a');
  beginShape();
  const pts = [], steps = 174;
  for (let j = 0; j <= steps; j++) {
    const u = j / steps;
    const x = lerp(-168, 168, u);
    const nx = map(u, 0, 1, -1.48 - sweep * 0.42, 3.08 + sweep * 0.48);
    const sxLocal = nx - phaseShift;
    const yBase = (index - 1) * spacing + sweep * (index - 1) * 8;
    const peak = bandAmp * Math.exp(-(sxLocal * sxLocal) / Math.max(0.22, bandVar));
    const dipAmp = ampBase * (0.17 + tense * 0.15 + tri.tone * 0.06 + edge * 0.05);
    const leftDip = dipAmp * Math.exp(-Math.pow(sxLocal + 1.10 - tri.density * 0.05 - sweep * 0.12, 2) / (0.46 + edge * 0.20));
    const rightDip = dipAmp * Math.exp(-Math.pow(sxLocal - 1.36 - tri.wide * 0.12 + sweep * 0.12, 2) / (0.56 + edge * 0.36));
    const shoulder = edgeBip * 14 * Math.exp(-Math.pow(sxLocal - 0.72, 2) / 0.80);
    const motionY = st.motion ? sin(time * (1.80 + tri.ratio * 0.85) + index * 2.3 + nx * 1.1) * (13.0 + tense * 26.0 + tri.tone * 10.0 + edge * 10.0) : 0;
    const motionX = st.motion ? sin(time * (1.12 + tri.ratio * 0.40) + index) * (5.0 + tense * 11.0) : 0;
    const curlY = tri.curl * sin(u * PI) * (index - 1) * 9 * (0.25 + tense + edge * 0.20);
    const cy = yBase - peak + leftDip + rightDip + shoulder + motionY + curlY + skew * x * 0.08;
    const baseThick = 4.2 + index * 1.0 + Math.pow(bloom, 1.85) * 16 + edge * 2.4;
    const peakThick = (9 + Math.pow(bloom, 1.28) * 72 + edge * 12) * (index === 1 ? 1.10 : 0.86) * (1 + tri.density * 0.08);
    const thickness = baseThick + peakThick * Math.exp(-(sxLocal * sxLocal) / (bandVar * (1.12 + edge * 0.52)));
    pts.push({ x: x + motionX, cy, th: thickness });
    vertex(x + motionX, cy - thickness / 2);
  }
  for (let j = pts.length - 1; j >= 0; j--) vertex(pts[j].x, pts[j].cy + pts[j].th / 2);
  endShape(CLOSE);
}
