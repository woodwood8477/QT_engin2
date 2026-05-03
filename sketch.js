/**
 * QT_ensin Wave Logo Engine v8.7
 * Shape params and animation params are separated.
 * SHAPE: sweep / edge / bloom / tension / harmony.
 * MOTION: amount / speed / randomness.
 * effectiveParams(time) drives graphics and sound only while motion is on.
 * CAPTURE bakes current effective shape into base shape.
 */

let chordSelect, ctrlSweep, ctrlEdge, ctrlBloom, ctrlTension, ctrlVol, ctrlMotionAmount, ctrlMotionSpeed, ctrlMotionRandom;
let valDisplays = {};
let playButton, resetButton, motionButton, captureButton, xyPad, xyKnob, presetTitle, rangeText, valVol;
let st, audio = null, activePage = 'morph', xyDragging = false, lastAudioUpdate = 0;

const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const CHORDS = [
  {label:'MAJ', name:'Major Triad', intervals:[0,4,7], tone:.16, wide:.26, dense:.10, curl:.12},
  {label:'MIN', name:'Minor Triad', intervals:[0,3,7], tone:.28, wide:.10, dense:.22, curl:.16},
  {label:'AUG', name:'Augmented Triad', intervals:[0,4,8], tone:.48, wide:.36, dense:.18, curl:.26},
  {label:'DIM', name:'Diminished Triad', intervals:[0,3,6], tone:.64, wide:-.12, dense:.48, curl:.34},
  {label:'SUS4', name:'Sus4 Triad', intervals:[0,5,7], tone:.38, wide:.20, dense:.30, curl:.20},
  {label:'SUS2', name:'Sus2 Triad', intervals:[0,2,7], tone:.40, wide:.06, dense:.38, curl:.22}
];

const C = (v,a,b)=>Math.max(a,Math.min(b,v));
const C01 = v=>C(v,0,1);
const hz = m => 440 * Math.pow(2, (m - 69) / 12);
const fmt = v => Math.abs(v - Math.round(v)) < .055 ? String(Math.round(v)) : v.toFixed(1);
const noteName = m => {
  const r = Math.round(m), pc = ((r % 12) + 12) % 12, oct = Math.floor(r / 12) - 1;
  const cents = Math.round((m - r) * 100);
  return Math.abs(cents) < 3 ? `${NOTE_NAMES[pc]}${oct}` : `${NOTE_NAMES[pc]}${oct}${cents > 0 ? '+' : ''}${cents}`;
};

function defaultState(chord = 0){
  const presets = [
    {sweep:.50, edge:.48, bloom:.40, tension:.38},
    {sweep:.55, edge:.40, bloom:.34, tension:.36},
    {sweep:.59, edge:.52, bloom:.44, tension:.44},
    {sweep:.38, edge:.32, bloom:.40, tension:.50},
    {sweep:.54, edge:.42, bloom:.38, tension:.42},
    {sweep:.43, edge:.44, bloom:.36, tension:.40}
  ];
  return {
    chord,
    root: st ? st.root : 9,
    oct: st ? st.oct : 4,
    playing: st ? st.playing : false,
    motion: false,
    volume: st ? st.volume : .16,
    motionAmount: st ? st.motionAmount : .75,
    motionSpeed: st ? st.motionSpeed : .70,
    motionRandom: st ? st.motionRandom : .45,
    ...presets[chord]
  };
}

function setup(){
  const side = getCanvasSide();
  const canvas = createCanvas(side, side);
  canvas.parent('canvas-container');
  pixelDensity(Math.min(window.devicePixelRatio || 1, 2));
  noStroke();
  bindDom();
  st = defaultState(0);
  bindEvents();
  setPage('morph');
  syncUIFromState();
  console.log('[QT_ensin2] v8.7 shape/motion separated');
}

function bindDom(){
  chordSelect = select('#chordSelect');
  ctrlSweep = select('#ctrlSweep');
  ctrlEdge = select('#ctrlEdge');
  ctrlBloom = select('#ctrlBloom');
  ctrlTension = select('#ctrlTension');
  ctrlVol = select('#ctrlVol');
  ctrlMotionAmount = select('#ctrlMotionAmount');
  ctrlMotionSpeed = select('#ctrlMotionSpeed');
  ctrlMotionRandom = select('#ctrlMotionRandom');
  valDisplays = {
    sweep: select('#valSweep'), edge: select('#valEdge'), bloom: select('#valBloom'), tension: select('#valTension'),
    amount: select('#valMotionAmount'), speed: select('#valMotionSpeed'), random: select('#valMotionRandom')
  };
  playButton = select('#playButton');
  resetButton = select('#resetButton');
  motionButton = select('#motionButton');
  captureButton = select('#captureButton');
  xyPad = document.querySelector('.xy-pad');
  xyKnob = document.querySelector('#xyKnob');
  presetTitle = document.querySelector('#presetTitle');
  rangeText = document.querySelector('#rangeText');
  valVol = document.querySelector('#valVol');
}

function bindButton(el, fn){ if(!el) return; el.addEventListener('click', e => { e.preventDefault(); flashButton(el); fn(); }); }
function flashButton(el){ el.classList.remove('button-flash'); void el.offsetWidth; el.classList.add('button-flash'); setTimeout(()=>el.classList.remove('button-flash'),240); }

function bindEvents(){
  bindButton(playButton?.elt, toggleTransport);
  bindButton(resetButton?.elt, resetAll);
  bindButton(motionButton?.elt, toggleMotion);
  bindButton(captureButton?.elt, captureMotionShape);
  document.querySelectorAll('.tab-button').forEach(b=>bindButton(b,()=>setPage(b.dataset.page || 'morph')));
  [ctrlBloom, ctrlTension, ctrlVol, ctrlMotionAmount, ctrlMotionSpeed, ctrlMotionRandom].forEach(el=>{ if(el) el.input(()=>{ syncStateFromUI(); refreshAudio(false); }); });
  if(chordSelect) chordSelect.changed(()=>setChord(int(chordSelect.value())));
  document.querySelectorAll('.preset-button').forEach(b=>bindButton(b,()=>setChord(parseInt(b.dataset.preset,10)||0)));
  document.querySelectorAll('[data-note-action]').forEach(b=>bindButton(b,()=>{ if(b.dataset.noteAction==='down') changeRoot(-1); if(b.dataset.noteAction==='up') changeRoot(1); }));
  document.querySelectorAll('[data-oct-action]').forEach(b=>bindButton(b,()=>{ if(b.dataset.octAction==='down') changeOct(-1); if(b.dataset.octAction==='up') changeOct(1); }));
  if(xyPad){
    xyPad.addEventListener('pointerdown', e=>{ xyDragging=true; xyPad.classList.add('is-dragging'); xyPad.setPointerCapture?.(e.pointerId); updateXYFromPointer(e,true); });
    xyPad.addEventListener('pointermove', e=>{ if(xyDragging) updateXYFromPointer(e,false); });
    ['pointerup','pointercancel','lostpointercapture'].forEach(ev=>xyPad.addEventListener(ev,()=>{ xyDragging=false; xyPad.classList.remove('is-dragging'); }));
  }
}

function setPage(page){
  activePage = page === 'harmony' ? 'harmony' : 'morph';
  document.querySelectorAll('.tab-button').forEach(b=>b.classList.toggle('active', b.dataset.page === activePage));
  document.querySelectorAll('.ui-page').forEach(el=>el.classList.toggle('active', el.id === `${activePage}Page`));
}

function getCanvasSide(){
  const mobile = window.innerWidth <= 960;
  if(mobile){ const h = Math.max(360, window.innerHeight || 720); return Math.max(268, Math.min(410, window.innerWidth*.68, h*.335)); }
  return Math.max(320, Math.min(690, (window.innerWidth-560)*.68, window.innerHeight*.74));
}
function windowResized(){ resizeCanvas(getCanvasSide(), getCanvasSide()); syncUIFromState(); }

function syncStateFromUI(){
  if(!st) return;
  st.sweep = map(parseFloat(ctrlSweep.value()), -1.5, 1.5, 0, 1);
  st.edge = map(parseFloat(ctrlEdge.value()), .4, 2.5, 0, 1);
  st.bloom = map(parseFloat(ctrlBloom.value()), 0, 100, 0, 1);
  st.tension = map(parseFloat(ctrlTension.value()), 0, 100, 0, 1);
  st.volume = map(parseFloat(ctrlVol.value()), 0, 100, 0, 1);
  st.motionAmount = map(parseFloat(ctrlMotionAmount.value()), 0, 100, 0, 1);
  st.motionSpeed = map(parseFloat(ctrlMotionSpeed.value()), 0, 100, 0, 1);
  st.motionRandom = map(parseFloat(ctrlMotionRandom.value()), 0, 100, 0, 1);
  syncReadouts();
}

function syncUIFromState(){
  if(chordSelect) chordSelect.value(st.chord);
  ctrlSweep.value(map(st.sweep,0,1,-1.5,1.5));
  ctrlEdge.value(map(st.edge,0,1,.4,2.5));
  ctrlBloom.value(map(st.bloom,0,1,0,100));
  ctrlTension.value(map(st.tension,0,1,0,100));
  ctrlVol.value(map(st.volume,0,1,0,100));
  if(ctrlMotionAmount) ctrlMotionAmount.value(map(st.motionAmount,0,1,0,100));
  if(ctrlMotionSpeed) ctrlMotionSpeed.value(map(st.motionSpeed,0,1,0,100));
  if(ctrlMotionRandom) ctrlMotionRandom.value(map(st.motionRandom,0,1,0,100));
  document.querySelectorAll('.preset-button').forEach(b=>b.classList.toggle('active', parseInt(b.dataset.preset,10) === st.chord));
  const nd=document.querySelector('[data-note-display]'), od=document.querySelector('[data-oct-display]');
  if(nd) nd.textContent=NOTE_NAMES[st.root]; if(od) od.textContent=String(st.oct);
  syncReadouts();
  syncTransportUi();
}

function syncReadouts(){
  const sv=map(st.sweep,0,1,-1.5,1.5), ev=map(st.edge,0,1,.4,2.5), bv=map(st.bloom,0,1,0,100), tv=map(st.tension,0,1,0,100);
  if(valDisplays.sweep) valDisplays.sweep.html(sv.toFixed(1));
  if(valDisplays.edge) valDisplays.edge.html(ev.toFixed(1));
  if(valDisplays.bloom) valDisplays.bloom.html(String(int(bv)));
  if(valDisplays.tension) valDisplays.tension.html(String(int(tv)));
  if(valDisplays.amount) valDisplays.amount.html(String(int(st.motionAmount*100)));
  if(valDisplays.speed) valDisplays.speed.html(String(int(st.motionSpeed*100)));
  if(valDisplays.random) valDisplays.random.html(String(int(st.motionRandom*100)));
  if(valVol) valVol.textContent = `${int(st.volume*100)}%`;
  if(presetTitle) presetTitle.textContent = `${NOTE_NAMES[st.root]} ${CHORDS[st.chord].name}`;
  if(rangeText) rangeText.textContent = buildRangeText(st.motion ? millis()*.001 : 0);
  updateXYKnob(sv, ev);
}

function syncTransportUi(){
  if(playButton){ playButton.html(st.playing ? 'Ⅱ' : '▶'); playButton.elt.classList.toggle('is-paused', st.playing); }
  if(motionButton){ motionButton.html(st.motion ? 'MOTION' : 'MOTION'); motionButton.elt.classList.toggle('is-active', st.motion); }
}

function xyPadMetrics(){ if(!xyPad) return null; const rect=xyPad.getBoundingClientRect(); const side=Math.min(rect.width,rect.height); return {rect,pad:Math.max(28,side*.12)}; }
function updateXYFromPointer(e, fast){
  const m=xyPadMetrics(); if(!m) return; e.preventDefault();
  const {rect,pad}=m, x=C(e.clientX-rect.left,pad,rect.width-pad), y=C(e.clientY-rect.top,pad,rect.height-pad);
  st.sweep=C01((x-pad)/Math.max(1,rect.width-pad*2));
  st.edge=C01(1-(y-pad)/Math.max(1,rect.height-pad*2));
  syncUIFromState();
  if(millis()-lastAudioUpdate>28){ lastAudioUpdate=millis(); refreshAudio(fast); }
}
function updateXYKnob(sweep, edge){
  const m=xyPadMetrics(); if(!xyKnob||!m) return;
  const {rect,pad}=m;
  xyKnob.style.left=`${pad+map(sweep,-1.5,1.5,0,1)*Math.max(1,rect.width-pad*2)}px`;
  xyKnob.style.top=`${pad+(1-map(edge,.4,2.5,0,1))*Math.max(1,rect.height-pad*2)}px`;
}

function shapeParams(){ return {sweep:st.sweep, edge:st.edge, bloom:st.bloom, tension:st.tension}; }
function randomWave(t, seed){
  return .62*sin(t*(.71+seed*.13)+seed*2.7)+.27*sin(t*(1.37+seed*.07)+seed*5.1)+.11*sin(t*(2.41+seed*.03)+seed*8.3);
}
function effectiveParams(t){
  const base = shapeParams();
  if(!st || !st.motion) return base;
  const ch=CHORDS[st.chord], amt=st.motionAmount, rnd=st.motionRandom, rate=.45+st.motionSpeed*3.35;
  const a=sin(t*(1.45+ch.tone*.82)*rate)+randomWave(t*rate,1.1)*rnd;
  const b=sin(t*(2.12+ch.dense*.90)*rate+1.7)+randomWave(t*rate,2.3)*rnd;
  const c=sin(t*(1.02+ch.curl*.55)*rate+2.4)+randomWave(t*rate,3.7)*rnd;
  const d=sin(t*(2.72+ch.wide*.45)*rate+.4)+randomWave(t*rate,4.9)*rnd;
  const depth=(.13+base.tension*.32)*amt;
  return {
    sweep:C01(base.sweep+a*depth*1.05+b*.09*amt),
    edge:C01(base.edge+b*depth*.96+d*.085*amt),
    bloom:C01(base.bloom+c*depth*1.08+a*.075*amt),
    tension:C01(base.tension+d*depth*.92+b*.080*amt)
  };
}

function currentIntervals(t=0){
  const ch=CHORDS[st.chord], p=effectiveParams(t), s=(p.sweep-.5)*2, e=(p.edge-.5)*2, base=ch.intervals, mid=base[1];
  const spread=C(1+s*.34+e*.10,.56,1.65);
  const raw=[0,1,2].map(i=> mid+(base[i]-mid)*spread+(i-1)*s*.85+(i-1)*e*.35);
  return raw.map(v=>v-raw[0]);
}
function currentNotes(t=0){ const root=(st.oct+1)*12+st.root; return currentIntervals(t).map(iv=>root+iv); }
function buildRangeText(t=0){ const ns=currentNotes(t), iv=currentIntervals(t); return `${ns.map(noteName).join(' · ')} / ${iv.map(fmt).join(' · ')}`; }

function triadProfile(i,t=0){
  const ch=CHORDS[st.chord], ints=currentIntervals(t), base=ch.intervals, iv=ints[i], mn=Math.min(...ints), mx=Math.max(...ints), span=Math.max(1,mx-mn);
  const n=(iv-mn)/span, bn=(base[i]-base[0])/Math.max(1,base[2]-base[0]);
  return {iv, ratio:Math.pow(2,iv/12), notePos:n, peakCenter:lerp(-.5,.5,n)+(n-bn)*.18, pitchOffset:iv-base[i], tone:ch.tone, wide:ch.wide, density:ch.dense, curl:ch.curl};
}

function setChord(i){
  const keep={playing:st.playing,volume:st.volume,root:st.root,oct:st.oct,motionAmount:st.motionAmount,motionSpeed:st.motionSpeed,motionRandom:st.motionRandom};
  st=defaultState(C(i,0,CHORDS.length-1)); Object.assign(st,keep); syncUIFromState(); refreshAudio(true);
}
function resetAll(){
  const keep={playing:st.playing,volume:st.volume,chord:st.chord,root:st.root,oct:st.oct,motionAmount:st.motionAmount,motionSpeed:st.motionSpeed,motionRandom:st.motionRandom};
  st=defaultState(keep.chord); Object.assign(st,keep,{motion:false}); syncUIFromState(); refreshAudio(true);
}
function changeRoot(d){ st.root=(st.root+d+12)%12; syncUIFromState(); refreshAudio(true); }
function changeOct(d){ st.oct=C(st.oct+d,2,6); syncUIFromState(); refreshAudio(true); }
function toggleMotion(){ st.motion=!st.motion; syncTransportUi(); refreshAudio(true); syncReadouts(); }
function captureMotionShape(){ const p=effectiveParams(millis()*.001); Object.assign(st,p,{motion:false}); syncUIFromState(); refreshAudio(true); }
function toggleTransport(){ ensureAudio(); if(!audio) return; st.playing=!st.playing; syncTransportUi(); st.playing?refreshAudio(true):stopAudio(); }

function createAudioContext(){ const Ctx=window.AudioContext||window.webkitAudioContext; return Ctx?new Ctx():null; }
function ensureAudio(){
  if(audio){ if(audio.ctx.state==='suspended') audio.ctx.resume(); return; }
  const ctx=createAudioContext(); if(!ctx) return; if(ctx.state==='suspended') ctx.resume();
  const input=ctx.createGain(), filter=ctx.createBiquadFilter(), dry=ctx.createGain(), wet=ctx.createGain(), delay=ctx.createDelay(1), feedback=ctx.createGain(), master=ctx.createGain();
  filter.type='lowpass'; master.gain.value=0; input.connect(filter); filter.connect(dry); dry.connect(master); filter.connect(wet); wet.connect(delay); delay.connect(master); delay.connect(feedback); feedback.connect(delay); master.connect(ctx.destination);
  const voices=[]; for(let i=0;i<3;i++){ const osc=ctx.createOscillator(), osc2=ctx.createOscillator(), gain=ctx.createGain(), pan=ctx.createStereoPanner?ctx.createStereoPanner():null; osc.type='sine'; osc2.type='triangle'; gain.gain.value=0; osc.connect(gain); osc2.connect(gain); if(pan){gain.connect(pan);pan.connect(input)}else gain.connect(input); osc.start(); osc2.start(); voices.push({osc,osc2,gain,pan}); }
  audio={ctx,input,filter,dry,wet,delay,feedback,master,voices};
}
function setParam(p,v,tau=.08){ if(!p||!audio) return; const now=audio.ctx.currentTime; p.cancelScheduledValues(now); p.setTargetAtTime(Number.isFinite(v)?v:0,now,Math.max(.012,tau)); }
function refreshAudio(fast=false){
  if(!audio||!st.playing) return; const t=st.motion?millis()*.001:0, p=effectiveParams(t), notes=currentNotes(t), ch=CHORDS[st.chord], sx=(p.sweep-.5)*2, ex=(p.edge-.5)*2;
  const energy=Math.abs(sx)*.5+Math.abs(ex)*.36+p.tension*.54, tau=fast?.018:.075;
  const cutoff=C(170*Math.pow(2,p.edge*5.35)+p.bloom*1700+p.tension*1650,120,13500), q=C(.38+p.edge*7.2+p.tension*4.8+ch.dense*2.6,.35,16), wet=C(.01+Math.pow(p.bloom,1.32)*.56+Math.abs(sx)*.075,.01,.76);
  setParam(audio.master.gain, st.volume*(.22+energy*.13), .03); setParam(audio.filter.frequency,cutoff,tau); setParam(audio.filter.Q,q,tau); setParam(audio.dry.gain,1,tau); setParam(audio.wet.gain,wet,tau*1.25); setParam(audio.delay.delayTime,C(.018+p.bloom*.32+Math.abs(sx)*.11,.012,.54),tau*1.4); setParam(audio.feedback.gain,C(.025+p.bloom*.45+p.tension*.13,.015,.68),tau*1.5);
  audio.voices.forEach((v,i)=>{ const side=i-1, tri=triadProfile(i,t), f=hz(notes[i]), det=sx*(16+p.edge*18)*side+ex*side*7+tri.tone*p.tension*side*10, ratio=C(1.02+p.edge*.95+p.bloom*.30+p.tension*.18+tri.ratio*.06+side*sx*.03,1.02,2.75), amp=(.034+p.edge*.017+p.bloom*.036+p.tension*.022+tri.density*.010)/Math.sqrt(1.15); setParam(v.osc.frequency,f,tau); setParam(v.osc2.frequency,f*ratio,tau*1.1); setParam(v.osc.detune,det,tau); setParam(v.osc2.detune,det*.62+ex*6,tau); setParam(v.gain.gain,amp,.045); if(v.pan) setParam(v.pan.pan,C(side*.12+sx*.52,-.9,.9),.07); });
}
function stopAudio(){ if(!audio) return; audio.voices.forEach(v=>setParam(v.gain.gain,0,.05)); setParam(audio.master.gain,0,.09); }

function draw(){
  clear(); const t=st.motion?millis()*.001:0, p=effectiveParams(t); if(st.motion){ refreshAudio(false); if(rangeText) rangeText.textContent=buildRangeText(t); }
  const frame=logoFrame(); push(); translate(frame.x,frame.y); scale(frame.s); for(let i=0;i<3;i++) drawGaussianBand(i,t,p); pop();
}
function logoFrame(){ const side=min(width,height), safe=window.innerWidth<=960?.90:.86; return {x:side*.5,y:side*.55,s:(side/600)*safe}; }
function drawGaussianBand(index,time,p){
  const tri=triadProfile(index,time), sweep=(p.sweep-.5)*2, edge=p.edge, edgeBip=(edge-.5)*2, tense=p.tension, bloom=p.bloom, ints=currentIntervals(time), span=Math.max(1,ints[2]-ints[0]);
  const ampBase=46+tense*104+edge*32, spacing=76+span*2.2+tri.wide*5-tri.density*5+tense*18, bandAmp=ampBase*(.68+index*.11+tri.ratio*.10+tri.tone*.08), bandVar=C(.62+edge*2.10+tri.wide*.10-tri.density*.06,.42,2.72), phaseShift=tri.peakCenter+tri.curl*.04, skew=sweep*(.13+index*.025);
  fill('#1a1a1a'); beginShape(); const pts=[],steps=174;
  for(let j=0;j<=steps;j++){ const u=j/steps,x=lerp(-168,168,u),nx=map(u,0,1,-1.48-sweep*.42,3.08+sweep*.48),sxLocal=nx-phaseShift,yBase=(index-1)*spacing+sweep*(index-1)*8; const peak=bandAmp*Math.exp(-(sxLocal*sxLocal)/Math.max(.22,bandVar)),dipAmp=ampBase*(.17+tense*.15+tri.tone*.06+edge*.05),leftDip=dipAmp*Math.exp(-Math.pow(sxLocal+1.10-tri.density*.05-sweep*.12,2)/(.46+edge*.20)),rightDip=dipAmp*Math.exp(-Math.pow(sxLocal-1.36-tri.wide*.12+sweep*.12,2)/(.56+edge*.36)),shoulder=edgeBip*14*Math.exp(-Math.pow(sxLocal-.72,2)/.80),curlY=tri.curl*sin(u*PI)*(index-1)*9*(.25+tense+edge*.20),cy=yBase-peak+leftDip+rightDip+shoulder+curlY+skew*x*.08,baseThick=4.2+index*1.0+Math.pow(bloom,1.85)*16+edge*2.4,peakThick=(9+Math.pow(bloom,1.28)*72+edge*12)*(index===1?1.10:.86)*(1+tri.density*.08),th=baseThick+peakThick*Math.exp(-(sxLocal*sxLocal)/(bandVar*(1.12+edge*.52))); pts.push({x,cy,th}); vertex(x,cy-th/2); }
  for(let j=pts.length-1;j>=0;j--) vertex(pts[j].x,pts[j].cy+pts[j].th/2); endShape(CLOSE);
}
