/**
 * QuanTRIOS Logo Engine v6.0 - Neumorphism UI Integration
 * Concept: Modulated Gaussian Triad Waves
 */

let chordSelect, ctrlSweep, ctrlEdge, ctrlBloom, ctrlTension, ctrlRipple;
let valDisplays = {};

const presets = [
  { sweep: 0.0,  edge: 1.2, bloom: 45, tension: 85,  ripple: 0.0 },
  { sweep: 0.4,  edge: 0.9, bloom: 35, tension: 60,  ripple: 4.0 },
  { sweep: -0.8, edge: 0.6, bloom: 60, tension: 110, ripple: 18.0 },
  { sweep: 0.5,  edge: 1.5, bloom: 40, tension: 70,  ripple: 10.0 }
];

function setup() {
  let canvas = createCanvas(600, 600);
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

  chordSelect.changed(() => {
    let p = presets[chordSelect.value()];
    ctrlSweep.value(p.sweep);
    ctrlEdge.value(p.edge);
    ctrlBloom.value(p.bloom);
    ctrlTension.value(p.tension);
    ctrlRipple.value(p.ripple);
    updateDisplays();
  });

  [ctrlSweep, ctrlEdge, ctrlBloom, ctrlTension, ctrlRipple].forEach(el => {
    el.input(updateDisplays);
  });
}

function updateDisplays() {
  valDisplays.sweep.html(parseFloat(ctrlSweep.value()).toFixed(1));
  valDisplays.edge.html(parseFloat(ctrlEdge.value()).toFixed(1));
  valDisplays.bloom.html(ctrlBloom.value());
  valDisplays.tension.html(ctrlTension.value());
  valDisplays.ripple.html(parseFloat(ctrlRipple.value()).toFixed(1));
}

function draw() {
  clear(); 

  let time = millis() * 0.001;
  let p_sweep   = parseFloat(ctrlSweep.value());
  let p_edge    = parseFloat(ctrlEdge.value());
  let p_bloom   = parseFloat(ctrlBloom.value());
  let p_tension = parseFloat(ctrlTension.value());
  let p_ripple  = parseFloat(ctrlRipple.value());

  for (let i = 0; i < 3; i++) {
    drawGaussianBand(i, time, p_sweep, p_edge, p_bloom, p_tension, p_ripple);
  }
}

function drawGaussianBand(index, time, sweep, edge, bloom, tension, ripple) {
  fill('#1a1a1a');
  beginShape();

  let pts = [];
  let steps = 150;
  let spacing = 70;
  let bandAmp = tension * (index === 2 ? 1.2 : (index === 1 ? 0.95 : 0.75));
  let bandVar = edge * (index === 2 ? 1.3 : (index === 1 ? 1.0 : 1.1)); 
  let phaseShift = (index - 1) * sweep;
  let rippleFreq = 5.0 + index; 
  let currentRippleAmp = (index === 0) ? ripple : (index === 1 ? ripple * 0.2 : 0);

  for (let j = 0; j <= steps; j++) {
    let x = map(j, 0, steps, 50, width - 50); 
    let nx = map(j, 0, steps, -3, 3); 
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
