/**
 * QT_ensin Wave Logo Engine v7.1
 * - RIPPLE removed from public morph UI.
 * - XY pad drag stabilized with pointer capture + partial sync.
 * - Gaussian morph range expanded: sweep/edge create larger, cleaner transformations.
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
  { label: 'MAJ', name: 'Major',      intervals: [0, 4, 7], tone: 0.18, wide: 0.46, dense: 0.10, curl: 0.28 },
  { label: 'MIN', name: 'Minor',      intervals: [0, 3, 7], tone: 0.32, wide: 0.22, dense: 0.28, curl: 0.22 },
  { label: 'DIM', name: 'Diminished', intervals: [0, 3, 6], tone: 0.72, wide: -0.18, dense: 0.58, curl: 0.52 },
  { label: 'CLS', name: 'Cluster',    intervals: [0, 1, 2], tone: 1.00, wide: -0.52, dense: 1.00, curl: 0.78 }
];

function defaultState(chord = 0) {
  const presets = [
    { sweep: 0.50, edge: 0.50, bloom: 0.48, tension: 0.62 },
    { sweep: 0.62, edge: 0.34, bloom: 0.36, tension: 0.42 },
    { sweep: 0.30, edge: 0.22, bloom: 0.58, tension: 0.72 },
    { sweep: 0.68, edge: 0.74, bloom: 0.42, tension: 0.54 }
  ];
  return {
    playing: st ? st.playing : false,
    motion: st ? st.motion : false,
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
  if (playButton) playButton.mousePressed(toggleTransport);
  if (resetButton) resetButton.mousePressed(resetAll);
  if (motionButton) motionButton.mousePressed(toggleMotion);

  document.querySelectorAll('.tab-button').forEach(btn => {
    btn.addEventListener('click', () => setPage(btn.dataset.page || 'morph'));
  });

  [ctrlBloom, ctrlTension, ctrlVol].forEach(el => {
    if (el) el.input(() => { syncStateFromUI(); refreshAudio(false); });
  });

  if (chordSelect) chordSelect.changed(() => setChord(int(chordSelect.value())));

  document.querySelectorAll('.preset-button').forEach(btn => {
    btn.addEventListener('click', () => setChord(parseInt(btn.dataset.preset, 10) || 0));
  });

  document.querySelectorAll('[data-note-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.noteAction;
      if (action === 'down') changeRoot(-1);
      if (action === 'up') changeRoot(1);
    });
  });

  document.querySelectorAll('[data-oct-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.octAction;
      if (action === 'down') changeOct(-1);
      if (action === 'up') changeOct(1);
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

function setPage(page) {
  activePage = page === 'harmony' ? 'harmony' : 'morph';
  document.querySelectorAll('.tab-button').forEach(btn => btn.classList.toggle('active', btn.dataset.page === activePage));
  document.querySelectorAll('.ui-page').forEach(el => el.classList.toggle('active', el.id === `${activePage}Page`));
}

function debugConnections() {
  const required = [chordSelect, ctrlSweep, ctrlEdge, ctrlBloom, ctrlTension, ctrlVol, playButton, resetButton, motionButton];
  const ok = required.every(Boolean) && !!xyPad && !!xyKnob;
  console.log('[QT_ensin2] UI connected:', ok);
  console.log('[QT_ensin2] WebAudio available:', !!(window.AudioContext || window.webkitAudioContext));
  console.log('[QT_ensin2] version: v7.1 morph-wide');
}

function windowResized() {
  const side = getCanvasSide();
  resizeCanvas(side, side);
  syncUIFromState();
}

function getCanvasSide() {
  const isMobile = window.innerWidth <= 960;
  if (isMobile) {
    const safeH = Math.max(360, window.innerHeight || 720);
    return Math.max(250, Math.min(380, window.innerWidth * 0.62, safeH * 0.30));
  }
  const availableW = window.innerWidth - 560;
  const availableH = window.innerHeight;
  return Math.max(320, Math.min(690, availableW * 0.68, availableH * 0.74));
}

function setChord(i) {
  const keepPlaying = st.playing;
  const keepMotion = st.motion;
  const keepVol = st.volume;
  const keepRoot = st.root;
  const keepOct = st.oct;
  st = defaultState(i);
  st.playing = keepPlaying;
  st.motion = keepMotion;
  st.volume = keepVol;
  st.root = keepRoot;
  st.oct = keepOct;
  syncUIFromState();
  refreshAudio(true);
}

function resetAll() {
  const keepPlaying = st.playing;
  const keepVol = st.volume;
  st = defaultState(st.chord);
  st.playing = keepPlaying;
  st.motion = false;
  st.volume = keepVol;
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
  st.bloom = map(parseFloat(ctrlBloom.value()), 10, 80, 0, 1);
  st.tension = map(parseFloat(ctrlTension.value()), 30, 150, 0, 1);
  st.volume = map(parseFloat(ctrlVol.value()), 0, 100, 0, 1);
  syncReadouts();
}

function syncUIFromState() {
  if (chordSelect) chordSelect.value(st.chord);
  ctrlSweep.value(map(st.sweep, 0, 1, -1.5, 1.5));
  ctrlEdge.value(map(st.edge, 0, 1, 0.4, 2.5));
  ctrlBloom.value(map(st.bloom, 0, 1, 10, 80));
  ctrlTension.value(map(st.tension, 0, 1, 30, 150));
  ctrlVol.value(map(st.volume, 0, 1, 0, 100));

  if (presetTitle) presetTitle.textContent = `${NOTE_NAMES[st.root]} ${CHORDS[st.chord].name}`;
  if (rangeText) rangeText.textContent = buildRangeText();
  document.querySelectorAll('.preset-button').forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.dataset.preset, 10) === st.chord);
  });
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
  updateMorphReadouts(sweepVal, edgeVal);
  valDisplays.bloom.html(String(int(ctrlBloom.value())));
  valDisplays.tension.html(String(int(ctrlTension.value())));
  if (valVol) valVol.textContent = `${int(st.volume * 100)}%`;
  updateXYKnob(sweepVal, edgeVal);
}

function updateMorphReadouts(sweepVal, edgeVal) {
  if (valDisplays.sweep) valDisplays.sweep.html(sweepVal.toFixed(1));
  if (valDisplays.edge) valDisplays.edge.html(edgeVal.toFixed(1));
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

function handleXYPointerDown(e) {
  xyDragging = true;
  if (xyPad && e.pointerId !== undefined) xyPad.setPointerCapture(e.pointerId);
  updateXYFromPointer(e, true);
}

function handleXYPointerMove(e) {
  if (!xyDragging) return;
  updateXYFromPointer(e, false);
}

function handleXYPointerUp(e) {
  xyDragging = false;
  if (xyPad && e && e.pointerId !== undefined && xyPad.hasPointerCapture(e.pointerId)) {
    xyPad.releasePointerCapture(e.pointerId);
  }
}

function updateXYFromPointer(e, fastAudio) {
  if (!xyPad) return;
  e.preventDefault();
  const rect = xyPad.getBoundingClientRect();
  const pad = 38;
  const x = constrain(e.clientX - rect.left, pad, rect.width - pad);
  const y = constrain(e.clientY - rect.top, pad, rect.height - pad);
  const nx = (x - pad) / Math.max(1, rect.width - pad * 2);
  const ny = 1 - ((y - pad) / Math.max(1, rect.height - pad * 2));
  st.sweep = constrain(nx, 0, 1);
  st.edge = constrain(ny, 0, 1);

  const sweepVal = map(st.sweep, 0, 1, -1.5, 1.5);
  const edgeVal = map(st.edge, 0, 1, 0.4, 2.5);
  ctrlSweep.value(sweepVal);
  ctrlEdge.value(edgeVal);
  updateMorphReadouts(sweepVal, edgeVal);
  updateXYKnob(sweepVal, edgeVal);

  const now = millis();
  if (now - lastAudioUiUpdate > 35) {
    lastAudioUiUpdate = now;
    refreshAudio(fastAudio);
  }
}

function updateXYKnob(sweep, edge) {
  if (!xyKnob || !xyPad) return;
  const nx = map(sweep, -1.5, 1.5, 0, 1);
  const ny = 1 - map(edge, 0.4, 2.5, 0, 1);
  const pad = 38;
  xyKnob.style.left = `${pad + nx * Math.max(1, xyPad.clientWidth - pad * 2)}px`;
  xyKnob.style.top = `${pad + ny * Math.max(1, xyPad.clientHeight - pad * 2)}px`;
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
  const iv = ints[i] ?? base[i];
  const prev = i === 0 ? ints[1] - ints[0] : ints[i] - ints[i - 1];
  const next = i === 2 ? ints[2] - ints[1] : ints[i + 1] - ints[i];
  return {
    iv,
    ratio: Math.pow(2, iv / 12),
    pitchOffset: iv - base[i],
    gapPrev: prev,
    gapNext: next,
    avgGap: (prev + next) * 0.5,
    closeGap: Math.min(Math.abs(prev), Math.abs(next)),
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
  if (!ctx) {
    console.warn('[QT_ensin2] WebAudio not available');
    return;
  }
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
  console.log('[QT_ensin2] audio ready', ctx.state);
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
  const energy = Math.abs(sx) * 0.45 + Math.abs(edgeBip) * 0.30 + st.tension * 0.45;
  const tau = fast ? 0.025 : 0.10;
  const cutoff = constrain(220 * Math.pow(2, st.edge * 5.2) + st.bloom * 1700 + st.tension * 1500, 180, 13500);
  const q = constrain(0.45 + st.edge * 7.5 + st.tension * 4.5 + c.dense * 2.5, 0.35, 16);
  const wet = constrain(0.015 + Math.pow(st.bloom, 1.35) * 0.62 + Math.abs(sx) * 0.08, 0.01, 0.82);
  const dry = constrain(1.04 - wet * 0.35 - st.tension * 0.10, 0.45, 1.08);
  setParam(audio.master.gain, st.volume * (0.58 + energy * 0.24), 0.035);
  setParam(audio.filter.frequency, cutoff, tau);
  setParam(audio.filter.Q, q, tau);
  setParam(audio.dry.gain, dry, tau);
  setParam(audio.wet.gain, wet, tau * 1.4);
  setParam(audio.delay.delayTime, constrain(0.025 + st.bloom * 0.34 + Math.abs(sx) * 0.12, 0.015, 0.58), tau * 1.7);
  setParam(audio.feedback.gain, constrain(0.04 + st.bloom * 0.54 + st.tension * 0.12, 0.02, 0.74), tau * 1.7);

  audio.voices.forEach((v, i) => {
    const tri = triadProfile(i), side = i - 1, f = midiToHz(notes[i]);
    const det = sx * (18 + st.edge * 22) * side + edgeBip * side * 9 + tri.tone * st.tension * side * 12;
    const ratio = constrain(1.03 + st.edge * 1.25 + st.bloom * 0.42 + st.tension * 0.22 + tri.ratio * 0.08 + side * sx * 0.035, 1.02, 3.2);
    const amp = (0.060 + st.edge * 0.026 + st.bloom * 0.055 + st.tension * 0.035 + tri.density * 0.014) / Math.sqrt(1.15);
    setParam(v.osc.frequency, f, tau);
    setParam(v.osc2.frequency, f * ratio, tau * 1.15);
    setParam(v.osc.detune, det, tau);
    setParam(v.osc2.detune, det * 0.62 + edgeBip * 8, tau);
    setParam(v.gain.gain, amp, 0.06);
    if (v.pan) setParam(v.pan.pan, constrain(side * 0.12 + sx * 0.62, -0.92, 0.92), 0.10);
  });
}

function stopAudio() {
  if (!audio) return;
  audio.voices.forEach(v => setParam(v.gain.gain, 0, 0.06));
  setParam(audio.master.gain, 0, 0.10);
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
  return { x: side * 0.5, y: side * 0.5, s: side / 600 };
}

function drawGaussianBand(index, time) {
  const tri = triadProfile(index);
  const sweep = (st.sweep - 0.5) * 2;
  const edge = st.edge;
  const edgeBip = (edge - 0.5) * 2;
  const compression = 1.0 - edge * 0.20;
  const spread = 1.0 + Math.abs(sweep) * 0.22;
  const ampBase = 62 + st.tension * 124 + edge * 36;
  const spacing = 70 + CHORDS[st.chord].intervals[2] * 3.1 + tri.wide * 7 - tri.density * 7 + st.tension * 18;
  const bandAmp = ampBase * (0.76 + index * 0.12 + tri.ratio * 0.12 + tri.tone * 0.10);
  const bandVar = constrain(0.48 + edge * 2.25 + tri.wide * 0.18 - tri.density * 0.10, 0.34, 2.95);
  const phaseShift = (index - 1) * sweep * 0.86 + tri.pitchOffset * 0.075 + tri.curl * 0.075;
  const skew = sweep * (0.18 + index * 0.035);

  fill('#1a1a1a');
  beginShape();
  const pts = [], steps = 168;
  for (let j = 0; j <= steps; j++) {
    const u = j / steps;
    const x = lerp(-160, 168, u) * spread + sweep * 18;
    const nx = map(u, 0, 1, -1.32 - sweep * 0.42, 3.05 + sweep * 0.58) * compression;
    const sxLocal = nx - phaseShift;
    const yBase = (index - 1) * spacing + sweep * (index - 1) * 9;
    const peak = bandAmp * Math.exp(-(sxLocal * sxLocal) / Math.max(0.22, bandVar));
    const dipAmp = ampBase * (0.19 + st.tension * 0.15 + tri.tone * 0.08 + edge * 0.06);
    const leftDip = dipAmp * Math.exp(-Math.pow(sxLocal + 1.18 - tri.density * 0.08 - sweep * 0.18, 2) / (0.46 + edge * 0.25));
    const rightDip = dipAmp * Math.exp(-Math.pow(sxLocal - 1.42 - tri.wide * 0.16 + sweep * 0.16, 2) / (0.58 + edge * 0.42));
    const shoulder = edgeBip * 16 * Math.exp(-Math.pow(sxLocal - 0.78, 2) / 0.82);
    const motionY = st.motion ? sin(time * (1.0 + tri.ratio * 0.54) + index * 1.9 + nx) * (6.0 + st.tension * 13.0 + tri.tone * 7.0 + edge * 6.0) : 0;
    const curlY = tri.curl * sin(u * PI) * (index - 1) * 13 * (0.25 + st.tension + edge * 0.20);
    const cy = yBase - peak + leftDip + rightDip + shoulder + motionY + curlY - tri.pitchOffset * 5.8 + skew * x * 0.10;
    const baseThick = 9 + index * 1.3 + st.bloom * 9 + edge * 3;
    const peakThick = (20 + st.bloom * 50 + edge * 12) * (index === 1 ? 1.12 : 0.88) * (1 + tri.density * 0.10);
    const thickness = baseThick + peakThick * Math.exp(-(sxLocal * sxLocal) / (bandVar * (1.18 + edge * 0.55)));
    pts.push({ x, cy, th: thickness });
    vertex(x, cy - thickness / 2);
  }
  for (let j = pts.length - 1; j >= 0; j--) vertex(pts[j].x, pts[j].cy + pts[j].th / 2);
  endShape(CLOSE);
}
