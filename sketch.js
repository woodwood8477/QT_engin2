/**
 * QuanTRIOS Logo Engine v6.0 - Neumorphism UI Integration
 * Concept: Modulated Gaussian Triad Waves
 */

// UI要素を格納する変数
let chordSelect, ctrlSweep, ctrlEdge, ctrlBloom, ctrlTension, ctrlRipple;
let valDisplays = {};

// 各和音のプリセットパラメータ
const presets = [
  { sweep: 0.0,  edge: 1.2, bloom: 45, tension: 85,  ripple: 0.0 },  // Major
  { sweep: 0.4,  edge: 0.9, bloom: 35, tension: 60,  ripple: 4.0 },  // Minor
  { sweep: -0.8, edge: 0.6, bloom: 60, tension: 110, ripple: 18.0 }, // Diminished
  { sweep: 0.5,  edge: 1.5, bloom: 40, tension: 70,  ripple: 10.0 }  // Cluster
];

function setup() {
  // キャンバスの作成。親要素にアタッチしてCSSでレイアウトを制御
  let canvas = createCanvas(600, 600);
  canvas.parent('canvas-container'); 
  noStroke(); // 線なし、面だけで描画

  // HTMLのDOM要素を取得
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

  // プリセット（ドロップダウン）変更時のイベント
  chordSelect.changed(() => {
    let p = presets[chordSelect.value()];
    ctrlSweep.value(p.sweep);
    ctrlEdge.value(p.edge);
    ctrlBloom.value(p.bloom);
    ctrlTension.value(p.tension);
    ctrlRipple.value(p.ripple);
    updateDisplays();
  });

  // 各スライダーを動かした時に数値を更新するイベントリスナーを登録
  [ctrlSweep, ctrlEdge, ctrlBloom, ctrlTension, ctrlRipple].forEach(el => {
    el.input(updateDisplays);
  });
}

// UIの数値表示を更新する関数
function updateDisplays() {
  valDisplays.sweep.html(parseFloat(ctrlSweep.value()).toFixed(1));
  valDisplays.edge.html(parseFloat(ctrlEdge.value()).toFixed(1));
  valDisplays.bloom.html(ctrlBloom.value());
  valDisplays.tension.html(ctrlTension.value());
  valDisplays.ripple.html(parseFloat(ctrlRipple.value()).toFixed(1));
}

function draw() {
  // 背景はクリアして透明にする。実際の背景色はCSS(index.html)の --bg-color が見えている
  clear(); 

  // 時間（アニメーション用）
  let time = millis() * 0.001;

  // 各スライダーの現在値を取得（文字列から数値に変換）
  let p_sweep   = parseFloat(ctrlSweep.value());
  let p_edge    = parseFloat(ctrlEdge.value());
  let p_bloom   = parseFloat(ctrlBloom.value());
  let p_tension = parseFloat(ctrlTension.value());
  let p_ripple  = parseFloat(ctrlRipple.value());

  // 3本の帯を描画（インデックス 0:上段Fifth, 1:中段Third, 2:下段Root）
  for (let i = 0; i < 3; i++) {
    drawGaussianBand(i, time, p_sweep, p_edge, p_bloom, p_tension, p_ripple);
  }
}

function drawGaussianBand(index, time, sweep, edge, bloom, tension, ripple) {
  fill('#1a1a1a'); // 帯の色（漆黒に近いグレー。背景とのコントラストを調整可能）
  beginShape();

  let pts = [];
  let steps = 150; // X軸の解像度（曲線の滑らかさ）
  let spacing = 70; // 帯の縦の間隔
  
  // 各帯の基本スケール調整（下段はどっしり、上段はシャープに）
  let bandAmp = tension * (index === 2 ? 1.2 : (index === 1 ? 0.95 : 0.75));
  let bandVar = edge * (index === 2 ? 1.3 : (index === 1 ? 1.0 : 1.1)); 
  
  // 位相（X軸）のズレ
  let phaseShift = (index - 1) * sweep;
  
  // Ripple（ノイズ）は上段（0番）に強く、中段（1番）に弱くかける
  let rippleFreq = 5.0 + index; 
  let currentRippleAmp = (index === 0) ? ripple : (index === 1 ? ripple * 0.2 : 0);

  // 1. 【上側の曲線】を左から右へ計算
  for (let j = 0; j <= steps; j++) {
    // キャンバスの左右に少し余白（padding: 50）を持たせてマッピング
    let x = map(j, 0, steps, 50, width - 50); 
    // ガウス関数の計算用：X座標を -3 〜 3 に正規化
    let nx = map(j, 0, steps, -3, 3); 
    let sx = nx - phaseShift;

    // 帯の基本のY座標
    let yBase = (height / 2) + (index - 1) * spacing;

    // メインの山のピーク
    let peak = bandAmp * Math.exp(-(sx * sx) / bandVar);
    
    // 両サイドの谷
    let dipAmp = tension * 0.35;
    let leftDip = dipAmp * Math.exp(-Math.pow(sx + 1.5, 2) / 0.6);
    let rightDip = dipAmp * Math.exp(-Math.pow(sx - 1.5, 2) / 0.6);
    
    // さざ波のモジュレーション（サイン波 × ガウス関数による減衰）
    let modulation = sin(sx * rippleFreq) * currentRippleAmp * Math.exp(-(sx * sx) / 2.0);

    // 微小な呼吸アニメーション（全体がゆっくり上下する）
    let liveY = sin(time * 1.5 + index * 2 + nx) * 2; 

    // Y座標の合成
    let cy = yBase - peak - modulation + leftDip + rightDip + liveY;

    // 【太さ（厚み）の計算】中央が太く、端が細くなるエンベロープ
    let baseThick = 12 * (index === 2 ? 1.2 : (index === 0 ? 0.8 : 1.0));
    let peakThick = bloom * (index === 2 ? 1.0 : (index === 1 ? 1.2 : 0.8));
    let thickness = baseThick + peakThick * Math.exp(-(sx * sx) / (bandVar * 1.5));

    // 後で下側の曲線を書くために、頂点データを保存
    pts.push({ x: x, cy: cy, th: thickness });
    
    // 上辺の頂点を打つ（中心から太さの半分を引く）
    vertex(x, cy - thickness / 2);
  }

  // 2. 【下側の曲線】を保存したデータを使って右から左へ計算
  for (let j = pts.length - 1; j >= 0; j--) {
    // 下辺の頂点を打つ（中心から太さの半分を足す）
    vertex(pts[j].x, pts[j].cy + pts[j].th / 2);
  }

  // 3. 形状を閉じて塗りつぶす
  endShape(CLOSE);
}
