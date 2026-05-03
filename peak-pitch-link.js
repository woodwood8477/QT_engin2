// QT_ensin Wave Logo Engine v8.1 peak-pitch link patch
// Mountain peak position is treated as chord tone / pitch information.
(function () {
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function fmtInterval(v) {
    const r = Math.round(v);
    return Math.abs(v - r) < 0.055 ? String(r) : v.toFixed(1);
  }

  window.rawPeakInterval = function rawPeakInterval(index) {
    const c = CHORDS[st.chord];
    const base = c.intervals;
    const middle = base[1];
    const side = index - 1;
    const sweepBip = (st.sweep - 0.5) * 2;
    const edgeBip = (st.edge - 0.5) * 2;

    // MORPH moves the mountains. Those mountain positions are pitch positions.
    // sweep mainly stretches/compresses the triad; edge subtly tightens/opens it.
    const spread = clamp(1 + sweepBip * 0.34 + edgeBip * 0.10, 0.56, 1.65);
    return middle + (base[index] - middle) * spread + side * sweepBip * 0.85 + side * edgeBip * 0.35;
  };

  window.currentIntervals = function currentIntervals() {
    const raw = [0, 1, 2].map(i => rawPeakInterval(i));
    const rootAnchor = raw[0];
    return raw.map(v => v - rootAnchor);
  };

  window.currentNotes = function currentNotes() {
    const rootMidi = (st.oct + 1) * 12 + st.root;
    return currentIntervals().map(iv => rootMidi + iv);
  };

  window.midiName = function midiName(midiValue) {
    const rounded = Math.round(midiValue);
    const name = NOTE_NAMES[((rounded % 12) + 12) % 12];
    const oct = Math.floor(rounded / 12) - 1;
    const cents = Math.round((midiValue - rounded) * 100);
    if (Math.abs(cents) < 3) return `${name}${oct}`;
    return `${name}${oct}${cents > 0 ? '+' : ''}${cents}`;
  };

  window.buildRangeText = function buildRangeText() {
    const notes = currentNotes();
    const intervals = currentIntervals();
    return `${notes.map(midiName).join(' · ')} / ${intervals.map(fmtInterval).join(' · ')}`;
  };

  function updateHarmonyTextFromPeaks() {
    if (typeof rangeText !== 'undefined' && rangeText) rangeText.textContent = buildRangeText();
    if (typeof presetTitle !== 'undefined' && presetTitle) {
      presetTitle.textContent = `${NOTE_NAMES[st.root]} ${CHORDS[st.chord].name}`;
    }
  }

  const originalSyncReadouts = window.syncReadouts;
  window.syncReadouts = function syncReadoutsPeakPitch() {
    if (originalSyncReadouts) originalSyncReadouts();
    updateHarmonyTextFromPeaks();
  };

  const originalUpdateXYFromPointer = window.updateXYFromPointer;
  window.updateXYFromPointer = function updateXYFromPointerPeakPitch(e, fastAudio) {
    if (originalUpdateXYFromPointer) originalUpdateXYFromPointer(e, fastAudio);
    updateHarmonyTextFromPeaks();
  };

  window.triadProfile = function triadProfile(index) {
    const c = CHORDS[st.chord];
    const ints = currentIntervals();
    const base = c.intervals;
    const iv = ints[index];
    const minIv = Math.min(...ints);
    const maxIv = Math.max(...ints);
    const span = Math.max(1, maxIv - minIv);
    const normalized = (iv - minIv) / span;
    const baseSpan = Math.max(1, base[2] - base[0]);
    const baseNorm = (base[index] - base[0]) / baseSpan;
    const prev = index === 0 ? ints[1] - ints[0] : ints[index] - ints[index - 1];
    const next = index === 2 ? ints[2] - ints[1] : ints[index + 1] - ints[index];

    return {
      iv,
      ratio: Math.pow(2, iv / 12),
      notePos: normalized,
      // Visual peak center is now derived from the same interval used for audio pitch.
      peakCenter: lerp(-0.50, 0.50, normalized) + (normalized - baseNorm) * 0.18,
      gapPrev: prev,
      gapNext: next,
      avgGap: (prev + next) * 0.5,
      pitchOffset: iv - base[index],
      tone: c.tone,
      wide: c.wide,
      density: c.dense,
      curl: c.curl
    };
  };

  window.voiceAudioPlan = function voiceAudioPlan(index, notes, plan) {
    const tri = triadProfile(index);
    const side = index - 1;
    const f = midiToHz(notes[index]);
    const det = plan.sx * (24 + st.edge * 28) * side + plan.edgeBip * side * 12 + tri.tone * st.tension * side * 18;
    const ratio = clamp(1.02 + st.edge * 1.35 + st.bloom * 0.46 + st.tension * 0.30 + tri.ratio * 0.08 + side * plan.sx * 0.04, 1.02, 3.4);
    const amp = (0.058 + st.edge * 0.030 + st.bloom * 0.065 + st.tension * 0.045 + tri.density * 0.018) / Math.sqrt(1.15);
    const pan = clamp(side * 0.14 + plan.sx * 0.68, -0.95, 0.95);
    return { tri, side, f, det, ratio, amp, pan, midi: notes[index] };
  };

  window.updateAudioMotion = function updateAudioMotionPeakPitch(time) {
    if (!audio || !st.playing || !st.motion) return;
    const nowMs = millis();
    if (nowMs - lastAudioMotionUpdate < 30) return;
    lastAudioMotionUpdate = nowMs;
    if (audio.ctx.state === 'suspended') audio.ctx.resume();

    const notes = currentNotes();
    const plan = baseAudioPlan();
    let motionSum = 0;
    let speedSum = 0;
    let pulseSum = 0;

    audio.voices.forEach((v, i) => {
      const vp = voiceAudioPlan(i, notes, plan);
      const sig = motionSignal(i, time, vp.tri, 0.35 + i * 0.18);
      motionSum += sig.intensity;
      speedSum += sig.speed;
      pulseSum += sig.pulse;

      // Horizontal mountain motion is pitch motion.
      const motionSemi = sig.x * 0.040 + sig.pulse * st.tension * 0.085;
      const movedFreq = midiToHz(vp.midi + motionSemi);
      const detuneMotion = sig.y * 0.16 + sig.speed * 5.0 * vp.side;
      const panMotion = sig.x * 0.018 + sig.pulse * 0.035 * (0.4 + st.tension);
      const ampMotion = vp.amp * (1 + sig.intensity * 0.18 + sig.speed * 0.035);

      setParam(v.osc.frequency, movedFreq, 0.040);
      setParam(v.osc2.frequency, movedFreq * vp.ratio, 0.050);
      setParam(v.osc.detune, vp.det + detuneMotion, 0.040);
      setParam(v.osc2.detune, vp.det * 0.62 + plan.edgeBip * 10 + detuneMotion * 0.72, 0.050);
      setParam(v.gain.gain, clamp(ampMotion, 0, 0.22), 0.045);
      if (v.pan) setParam(v.pan.pan, clamp(vp.pan + panMotion, -0.98, 0.98), 0.052);
    });

    const avgMotion = clamp(motionSum / 3, 0, 1.25);
    const avgSpeed = clamp(speedSum / 3, 0, 1.65);
    const avgPulse = pulseSum / 3;
    const filterLift = 1 + avgMotion * 0.18 + avgSpeed * 0.05 + avgPulse * 0.025;
    setParam(audio.filter.frequency, clamp(plan.cutoff * filterLift, 120, 15000), 0.055);
    setParam(audio.filter.Q, clamp(plan.q + avgMotion * 2.6 + avgPulse * 1.2, 0.35, 20), 0.060);
    setParam(audio.wet.gain, clamp(plan.wet + avgMotion * 0.055 + avgSpeed * 0.025, 0.01, 0.95), 0.080);
    setParam(audio.feedback.gain, clamp(plan.feedback + avgMotion * 0.045, 0.02, 0.88), 0.095);
  };

  window.drawGaussianBand = function drawGaussianBandPeakPitch(index, time) {
    const tri = triadProfile(index);
    const sweep = (st.sweep - 0.5) * 2;
    const edge = st.edge;
    const edgeBip = (edge - 0.5) * 2;
    const tense = st.tension;
    const bloom = st.bloom;
    const intervals = currentIntervals();
    const span = Math.max(1, intervals[2] - intervals[0]);
    const ampBase = 46 + tense * 104 + edge * 32;
    const spacing = 76 + span * 2.2 + tri.wide * 5 - tri.density * 5 + tense * 18;
    const bandAmp = ampBase * (0.68 + index * 0.11 + tri.ratio * 0.10 + tri.tone * 0.08);
    const bandVar = clamp(0.62 + edge * 2.10 + tri.wide * 0.10 - tri.density * 0.06, 0.42, 2.72);
    // Do not add a second independent sweep term to the peak center.
    // The peak center already encodes the pitch/mountain position.
    const phaseShift = tri.peakCenter + tri.curl * 0.04;
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
      const sig = motionSignal(index, time, tri, nx);
      const curlY = tri.curl * sin(u * PI) * (index - 1) * 9 * (0.25 + tense + edge * 0.20);
      const cy = yBase - peak + leftDip + rightDip + shoulder + sig.y + curlY + skew * x * 0.08;
      const baseThick = 4.2 + index * 1.0 + Math.pow(bloom, 1.85) * 16 + edge * 2.4;
      const peakThick = (9 + Math.pow(bloom, 1.28) * 72 + edge * 12) * (index === 1 ? 1.10 : 0.86) * (1 + tri.density * 0.08);
      const thickness = baseThick + peakThick * Math.exp(-(sxLocal * sxLocal) / (bandVar * (1.12 + edge * 0.52)));
      pts.push({ x: x + sig.x, cy, th: thickness });
      vertex(x + sig.x, cy - thickness / 2);
    }
    for (let j = pts.length - 1; j >= 0; j--) vertex(pts[j].x, pts[j].cy + pts[j].th / 2);
    endShape(CLOSE);
  };

  console.log('[QT_ensin2] peak-pitch link patch loaded: v8.1');
})();
