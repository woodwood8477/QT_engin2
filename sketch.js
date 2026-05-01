let chordSelect, ctrlSweep, ctrlEdge, ctrlBloom, ctrlTension, ctrlRipple;
let valDisplays = {};

// プリセットも、あの鋭い形がベースになるよう数値を調整しました
const presets = [
  { sweep: 0.0,  edge: 1.8, bloom: 55, tension: 120, ripple: 0.0 },  // Major
  { sweep: 0.3,  edge: 1.4, bloom: 45, tension: 90,  ripple: 2.0 },  // Minor
  { sweep: -0.5, edge: 2.2, bloom: 65, tension: 140, ripple: 5.0 },  // Diminished
  { sweep: 0.6,  edge: 1.0, bloom: 50, tension: 100, ripple: 8.0 }   // Cluster
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

  // 全体を少し下へオフセット（上に伸びるため）
  push();
  translate(0, 50);

  for (let i = 0; i < 3; i++) {
    drawAsymmetricBand(i, time, p_sweep, p_edge, p_bloom, p_tension, p_ripple);
  }
  
  pop();
}

function drawAsymmetricBand(index, time, sweep, edge, bloom, tension, ripple) {
  fill('#1a1a1a'); 
  beginShape();

  let pts = [];
  let steps = 150; 
  let spacing = 65; // 縦の密度
  
  // 帯ごとの個性（下に行くほど太く、上に行くほど高く）
  let bandAmp = tension * (index === 0 ? 1.3 : (index === 1 ? 1.0 : 0.8));
  let bandVar = edge * (index === 2 ? 1.2 : 1.0); 
  
  let phaseShift = (index - 1) * sweep;
  
  let rippleFreq = 6.0 + index * 2; 
  let currentRippleAmp = (index === 0) ? ripple : (index === 1 ? ripple * 0.3 : 0);

  // X軸の描画範囲をギュッと中央に絞る（横に広がらないようにする）
  let logoWidth = 240; 
  let startX = width / 2 - logoWidth * 0.4;
  let endX = width / 2 + logoWidth * 0.6;

  for (let j = 0; j <= steps; j++) {
    let x = map(j, 0, steps, startX, endX); 
    
    // 計算用のX座標を非対称にする（左を短く、右を長く）
    let nx = map(j, 0, steps, -2.5, 4.0); 
    let sx = nx - phaseShift;

    // 【重要】非対称（Skew）のロジック
    // ピークより左側（負）は急勾配に、右側（正）はなだらかにする
    let skewFactor = sx < 0 ? 1.8 : 0.6; 
    let warpedX = sx * skewFactor;

    let yBase = (height / 2) + (index - 1) * spacing;

    // 鋭い山のピーク
    let peak = bandAmp * Math.exp(-(warpedX * warpedX) / bandVar);
    
    // 右側（尻尾）が少し跳ね上がるような微小な谷
    let rightDip = (tension * 0.15) * Math.exp(-Math.pow(sx - 2.5, 2) / 1.0);
    
    let modulation = sin(sx * rippleFreq) * currentRippleAmp * Math.exp(-(sx * sx) / 3.0);
    let liveY = sin(time * 2.0 + index + nx) * 1.5; 

    // Y座標の合成（上に伸びるのでマイナス）
    let cy = yBase - peak + rightDip - modulation + liveY;

    // 【厚みの計算】ピークが最も太く、尻尾は鋭く細くなる
    let baseThick = 4 * (index === 2 ? 1.5 : 1.0); // 根本の最低限の太さ
    let peakThick = bloom * (index === 2 ? 0.8 : (index === 1 ? 1.0 : 1.2));
    // 厚みも非対称にする
    let thickWarp = sx < 0 ? sx * 1.2 : sx * 0.8;
    let thickness = baseThick + peakThick * Math.exp(-(thickWarp * thickWarp) / (bandVar * 1.2));

    pts.push({ x: x, cy: cy, th: thickness });
    
    // 上辺
    vertex(x, cy - thickness / 2);
  }

  // 下辺を逆順に
  for (let j = pts.length - 1; j >= 0; j--) {
    vertex(pts[j].x, pts[j].cy + pts[j].th / 2);
  }

  endShape(CLOSE);
}
