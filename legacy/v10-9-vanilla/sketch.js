/**
 * QT_ensin Wave Logo Engine v10.8
 * Direct logo ink color; no canvas inversion rim.
 */

let chordSelect, ctrlSweep, ctrlEdge, ctrlBloom, ctrlTension, ctrlVol, ctrlMotionAmount, ctrlMotionSpeed, ctrlMotionRandom;
let valDisplays = {}, knobEls = {};
let playButton, resetButton, motionButton, xyPad, xyKnob, presetTitle, rangeText, valVol;
let st, audio = null, activePage = 'morph', xyDragging = false, knobDragging = null, lastAudioUpdate = 0;

const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const CHORDS = [
  {label:'MAJ', name:'Major Triad', intervals:[0,4,7], tone:.16, wide:.26, dense:.10, curl:.12},
  {label:'MIN', name:'Minor Triad', intervals:[0,3,7], tone:.28, wide:.10, dense:.22, curl:.16},
  {label:'AUG', name:'Augmented Triad', intervals:[0,4,8], tone:.48, wide:.36, dense:.18, curl:.26},
  {label:'DIM', name:'Diminished Triad', intervals:[0,3,6], tone:.64, wide:-.12, dense:.48, curl:.34},
  {label:'SUS4', name:'Sus4 Triad', intervals:[0,5,7], tone:.38, wide:.20, dense:.30, curl:.20},
  {label:'SUS2', name:'Sus2 Triad', intervals:[0,2,7], tone:.40, wide:.06, dense:.38, curl:.22}
];

const MORPH_BASE = {sweep:.50, edge:.50, bloom:.44, tension:1.00};
const MORPH_RANGE = {sweep:.75, edge:.75, bloom:.75, tension:.75};
const C = (v,a,b)=>Math.max(a,Math.min(b,v));
const C01 = v=>C(v,0,1);
const uiToMorph = (k,v)=>MORPH_BASE[k]+((C(Number(v)||0,0,100)-50)/50)*MORPH_RANGE[k];
const morphToUi = (k,v)=>C(50+((v-MORPH_BASE[k])/MORPH_RANGE[k])*50,0,100);
const morphN = (k,p)=>C((p[k]-MORPH_BASE[k])/MORPH_RANGE[k],-1.5,1.5);
const hz = m => 440 * Math.pow(2, (m - 69) / 12);
const fmt = v => Math.abs(v - Math.round(v)) < .055 ? String(Math.round(v)) : v.toFixed(1);
const noteName = m => {
  const r = Math.round(m), pc = ((r % 12) + 12) % 12, oct = Math.floor(r / 12) - 1;
  const cents = Math.round((m - r) * 100);
  return Math.abs(cents) < 3 ? `${NOTE_NAMES[pc]}${oct}` : `${NOTE_NAMES[pc]}${oct}${cents > 0 ? '+' : ''}${cents}`;
};

function defaultState(chord = 0){
  const presets = [
    {...MORPH_BASE},
    {sweep:uiToMorph('sweep',55), edge:uiToMorph('edge',42), bloom:uiToMorph('bloom',43), tension:uiToMorph('tension',45)},
    {sweep:uiToMorph('sweep',58), edge:uiToMorph('edge',56), bloom:uiToMorph('bloom',55), tension:uiToMorph('tension',54)},
    {sweep:uiToMorph('sweep',38), edge:uiToMorph('edge',36), bloom:uiToMorph('bloom',48), tension:uiToMorph('tension',58)},
    {sweep:uiToMorph('sweep',54), edge:uiToMorph('edge',46), bloom:uiToMorph('bloom',46), tension:uiToMorph('tension',52)},
    {sweep:uiToMorph('sweep',43), edge:uiToMorph('edge',48), bloom:uiToMorph('bloom',42), tension:uiToMorph('tension',48)}
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
  console.log('[QT_ensin2] v10.8 direct ink, no invert rim');
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
  knobEls = {motionAmount: document.getElementById('knobMotionAmount'), motionSpeed: document.getElementById('knobMotionSpeed'), motionRandom: document.getElementById('knobMotionRandom')};
  playButton = select('#playButton');
  resetButton = select('#resetButton');
  motionButton = select('#motionButton');
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
  document.querySelectorAll('.tab-button').forEach(b=>bindButton(b,()=>setPage(b.dataset.page || 'morph')));
  [ctrlSweep, ctrlEdge, ctrlBloom, ctrlTension, ctrlVol, ctrlMotionAmount, ctrlMotionSpeed, ctrlMotionRandom].forEach(el=>{ if(el) el.input(()=>{ syncStateFromUI(); refreshAudio(false); }); });
  if(chordSelect) chordSelect.changed(()=>setChord(int(chordSelect.value())));
  document.querySelectorAll('.preset-button').forEach(b=>bindButton(b,()=>setChord(parseInt(b.dataset.preset,10)||0)));
  document.querySelectorAll('[data-note-action]').forEach(b=>bindButton(b,()=>{ if(b.dataset.noteAction==='down') changeRoot(-1); if(b.dataset.noteAction==='up') changeRoot(1); }));
  document.querySelectorAll('[data-oct-action]').forEach(b=>bindButton(b,()=>{ if(b.dataset.octAction==='down') changeOct(-1); if(b.dataset.octAction==='up') changeOct(1); }));
  bindKnob('motionAmount'); bindKnob('motionSpeed'); bindKnob('motionRandom');
  if(xyPad){
    xyPad.addEventListener('pointerdown', e=>{ xyDragging=true; xyPad.classList.add('is-dragging'); xyPad.setPointerCapture?.(e.pointerId); updateXYFromPointer(e,true); });
    xyPad.addEventListener('pointermove', e=>{ if(xyDragging) updateXYFromPointer(e,false); });
    ['pointerup','pointercancel','lostpointercapture'].forEach(ev=>xyPad.addEventListener(ev,()=>{ xyDragging=false; xyPad.classList.remove('is-dragging'); }));
  }
}
function bindKnob(key){
  const el = knobEls[key]; if(!el) return;
  el.addEventListener('pointerdown', e => { knobDragging=key; el.setPointerCapture?.(e.pointerId); updateKnobFromPointer(key,e); });
  el.addEventListener('pointermove', e => { if(knobDragging===key) updateKnobFromPointer(key,e); });
  ['pointerup','pointercancel'].forEach(ev=>el.addEventListener(ev,e=>{ if(knobDragging===key) knobDragging=null; try{el.releasePointerCapture?.(e.pointerId)}catch(_){}}));
}
function angleToKnobValue(deg){ let d=deg; if(d<135)d+=360; d=C(d,225,495); return C01((d-225)/270); }
function updateKnobFromPointer(key, e){
  e.preventDefault(); const el=knobEls[key]; if(!el) return; const r=el.getBoundingClientRect(); const cx=r.left+r.width/2, cy=r.top+r.height/2;
  let deg=Math.atan2(e.clientY-cy,e.clientX-cx)*180/Math.PI+90; if(deg<0)deg+=360;
  const v=angleToKnobValue(deg); st[key]=v;
  const slider=key==='motionAmount'?ctrlMotionAmount:key==='motionSpeed'?ctrlMotionSpeed:ctrlMotionRandom; if(slider) slider.value(v*100);
  syncReadouts(); refreshAudio(false);
}

function setPage(page){
  activePage = page === 'harmony' ? 'harmony' : page === 'motion' ? 'motion' : 'morph';
  document.querySelectorAll('.tab-button').forEach(b=>b.classList.toggle('active', b.dataset.page === activePage));
  document.querySelectorAll('.ui-page').forEach(el=>el.classList.toggle('active', el.id === `${activePage}Page`));
}
function getCanvasSide(){ const mobile=window.innerWidth<=960; if(mobile){ const h=Math.max(360,window.innerHeight||720); return Math.max(268,Math.min(410,window.innerWidth*.68,h*.335)); } return Math.max(320,Math.min(690,(window.innerWidth-560)*.68,window.innerHeight*.74)); }
function windowResized(){ resizeCanvas(getCanvasSide(), getCanvasSide()); syncUIFromState(); }

function syncStateFromUI(){
  if(!st) return;
  if(!st.motion){ st.sweep=uiToMorph('sweep',ctrlSweep.value()); st.edge=uiToMorph('edge',ctrlEdge.value()); st.bloom=uiToMorph('bloom',ctrlBloom.value()); st.tension=uiToMorph('tension',ctrlTension.value()); }
  st.volume = map(parseFloat(ctrlVol.value()), 0, 100, 0, 1);
  st.motionAmount = map(parseFloat(ctrlMotionAmount.value()), 0, 100, 0, 1);
  st.motionSpeed = map(parseFloat(ctrlMotionSpeed.value()), 0, 100, 0, 1);
  st.motionRandom = map(parseFloat(ctrlMotionRandom.value()), 0, 100, 0, 1);
  syncReadouts();
}
function syncUIFromState(){
  if(chordSelect) chordSelect.value(st.chord);
  displayMorphParams(shapeParams());
  ctrlVol.value(map(st.volume,0,1,0,100));
  if(ctrlMotionAmount) ctrlMotionAmount.value(map(st.motionAmount,0,1,0,100));
  if(ctrlMotionSpeed) ctrlMotionSpeed.value(map(st.motionSpeed,0,1,0,100));
  if(ctrlMotionRandom) ctrlMotionRandom.value(map(st.motionRandom,0,1,0,100));
  document.querySelectorAll('.preset-button').forEach(b=>b.classList.toggle('active',parseInt(b.dataset.preset,10)===st.chord));
  const nd=document.querySelector('[data-note-display]'), od=document.querySelector('[data-oct-display]'); if(nd) nd.textContent=NOTE_NAMES[st.root]; if(od) od.textContent=String(st.oct);
  syncReadouts(); syncTransportUi();
}
function displayMorphParams(p){
  const us=morphToUi('sweep',p.sweep), ue=morphToUi('edge',p.edge), ub=morphToUi('bloom',p.bloom), ut=morphToUi('tension',p.tension);
  ctrlSweep.value(us); ctrlEdge.value(ue); ctrlBloom.value(ub); ctrlTension.value(ut);
  if(valDisplays.sweep) valDisplays.sweep.html(String(int(us)));
  if(valDisplays.edge) valDisplays.edge.html(String(int(ue)));
  if(valDisplays.bloom) valDisplays.bloom.html(String(int(ub)));
  if(valDisplays.tension) valDisplays.tension.html(String(int(ut)));
  updateXYKnob(us, ue);
}
function knobAngle(v){ return 225 + C01(v)*270; }
function setKnobVisual(key, value, pulseValue){ const el=knobEls[key]; if(!el) return; el.style.setProperty('--angle',`${knobAngle(value)}deg`); el.style.setProperty('--pulse-angle',`${knobAngle(C01(pulseValue))}deg`); }
function setMotionText(key, val){ const d=key==='motionAmount'?valDisplays.amount:key==='motionSpeed'?valDisplays.speed:valDisplays.random; if(d) d.html(String(int(C01(val)*100))); }
function syncReadouts(){
  if(!st.motion) displayMorphParams(shapeParams());
  setMotionText('motionAmount', st.motionAmount); setMotionText('motionSpeed', st.motionSpeed); setMotionText('motionRandom', st.motionRandom);
  setKnobVisual('motionAmount',st.motionAmount,st.motionAmount); setKnobVisual('motionSpeed',st.motionSpeed,st.motionSpeed); setKnobVisual('motionRandom',st.motionRandom,st.motionRandom);
  if(valVol) valVol.textContent=`${int(st.volume*100)}%`; if(presetTitle) presetTitle.textContent=`${NOTE_NAMES[st.root]} ${CHORDS[st.chord].name}`; if(rangeText) rangeText.textContent=buildRangeText(st.motion?millis()*.001:0);
}
function updateMotionUi(t,p){
  displayMorphParams(p);
  const base=shapeParams();
  const delta=C01((abs(p.sweep-base.sweep)+abs(p.edge-base.edge)+abs(p.bloom-base.bloom)+abs(p.tension-base.tension))*1.8);
  const liveA=C01(st.motionAmount*.55+delta*.65+.08*sin(t*(1.1+st.motionSpeed*4.0)));
  const liveS=C01(.5+.5*sin(t*(1.2+st.motionSpeed*6.0)+randomWave(t,6.2)*st.motionRandom));
  const liveR=C01(.5+.5*randomWave(t*(1.4+st.motionSpeed*2.8),8.8));
  setKnobVisual('motionAmount',liveA,liveA); setKnobVisual('motionSpeed',liveS,liveS); setKnobVisual('motionRandom',liveR,liveR);
  setMotionText('motionAmount',liveA); setMotionText('motionSpeed',liveS); setMotionText('motionRandom',liveR);
  if(ctrlMotionAmount) ctrlMotionAmount.value(liveA*100); if(ctrlMotionSpeed) ctrlMotionSpeed.value(liveS*100); if(ctrlMotionRandom) ctrlMotionRandom.value(liveR*100);
}
function syncTransportUi(){
  if(playButton){ playButton.html(st.playing?'Ⅱ':'▶'); playButton.elt.classList.toggle('is-paused',st.playing); }
  if(motionButton){ motionButton.html(st.motion?'STOP':'MOTION'); motionButton.elt.classList.toggle('is-active',st.motion); }
  document.body.classList.toggle('motion-running',!!st.motion);
}

function xyPadMetrics(){ if(!xyPad) return null; const rect=xyPad.getBoundingClientRect(); const side=Math.min(rect.width,rect.height); return {rect,pad:Math.max(28,side*.12)}; }
function updateXYFromPointer(e,fast){ const m=xyPadMetrics(); if(!m) return; e.preventDefault(); const {rect,pad}=m, x=C(e.clientX-rect.left,pad,rect.width-pad), y=C(e.clientY-rect.top,pad,rect.height-pad); const ux=((x-pad)/Math.max(1,rect.width-pad*2))*100, uy=(1-(y-pad)/Math.max(1,rect.height-pad*2))*100; st.sweep=uiToMorph('sweep',ux); st.edge=uiToMorph('edge',uy); syncUIFromState(); if(millis()-lastAudioUpdate>28){lastAudioUpdate=millis(); refreshAudio(fast);} }
function updateXYKnob(uiSweep,uiEdge){ const m=xyPadMetrics(); if(!xyKnob||!m) return; const {rect,pad}=m; xyKnob.style.left=`${pad+C(uiSweep,0,100)/100*Math.max(1,rect.width-pad*2)}px`; xyKnob.style.top=`${pad+(1-C(uiEdge,0,100)/100)*Math.max(1,rect.height-pad*2)}px`; }

function shapeParams(){ return {sweep:st.sweep, edge:st.edge, bloom:st.bloom, tension:st.tension}; }
function randomWave(t,seed){ const n1=noise(seed,t*.34)*2-1, n2=noise(seed+10.1,t*.82)*2-1, lfo=sin(t*(.52+seed*.027)+seed*2.1)*.35; return C(n1*.58+n2*.30+lfo*.12,-1,1); }
function effectiveParams(t){
  const base=shapeParams(); if(!st||!st.motion) return base;
  const ch=CHORDS[st.chord], amt=st.motionAmount, rnd=st.motionRandom, spd=st.motionSpeed, rate=.18+spd*5.2;
  const drift1=randomWave(t*rate,1.1), drift2=randomWave(t*rate,2.3), drift3=randomWave(t*rate,3.7), drift4=randomWave(t*rate,4.9);
  const wave1=sin(t*(.92+ch.tone*.62)*rate+drift2*rnd*3.2), wave2=sin(t*(1.28+ch.dense*.76)*rate+1.7+drift3*rnd*3.6), wave3=sin(t*(.82+ch.curl*.58)*rate+2.4+drift1*rnd*3.9), wave4=sin(t*(1.56+ch.wide*.46)*rate+.4+drift4*rnd*3.2);
  const depth=(.20+C01((base.tension-MORPH_BASE.tension+MORPH_RANGE.tension)/(MORPH_RANGE.tension*2))*.54)*amt;
  return {
    sweep:C(MORPH_BASE.sweep+(morphN('sweep',base)+wave1*depth+drift1*rnd*.50)*MORPH_RANGE.sweep, MORPH_BASE.sweep-MORPH_RANGE.sweep, MORPH_BASE.sweep+MORPH_RANGE.sweep),
    edge:C(MORPH_BASE.edge+(morphN('edge',base)+wave2*depth*1.06+drift2*rnd*.48)*MORPH_RANGE.edge, MORPH_BASE.edge-MORPH_RANGE.edge, MORPH_BASE.edge+MORPH_RANGE.edge),
    bloom:C(MORPH_BASE.bloom+(morphN('bloom',base)+wave3*depth*1.05+drift3*rnd*.48)*MORPH_RANGE.bloom, MORPH_BASE.bloom-MORPH_RANGE.bloom, MORPH_BASE.bloom+MORPH_RANGE.bloom),
    tension:C(MORPH_BASE.tension+(morphN('tension',base)+wave4*depth*1.02+drift4*rnd*.46)*MORPH_RANGE.tension, MORPH_BASE.tension-MORPH_RANGE.tension, MORPH_BASE.tension+MORPH_RANGE.tension)
  };
}
function bakeMotion(){ if(st.motion){ const p=effectiveParams(millis()*.001); Object.assign(st,p,{motion:false}); syncUIFromState(); } }
function currentIntervals(t=0){ const ch=CHORDS[st.chord], p=effectiveParams(t), s=morphN('sweep',p), e=morphN('edge',p), base=ch.intervals, mid=base[1]; const spread=C(1+s*.34+e*.10,.46,1.86); const raw=[0,1,2].map(i=>mid+(base[i]-mid)*spread+(i-1)*s*.85+(i-1)*e*.35); return raw.map(v=>v-raw[0]); }
function currentNotes(t=0){ const root=(st.oct+1)*12+st.root; return currentIntervals(t).map(iv=>root+iv); }
function buildRangeText(t=0){ const ns=currentNotes(t), iv=currentIntervals(t); return `${ns.map(noteName).join(' · ')} / ${iv.map(fmt).join(' · ')}`; }
function neutralPeakDrive(p){ if(!st||st.motion)return 1; return C01((st.chord===0?0:1)+Math.abs(morphN('sweep',p))*.95+Math.abs(morphN('edge',p))*.85+Math.abs(morphN('bloom',p))*.35+Math.abs(morphN('tension',p))*.42); }
function triadProfile(i,t=0){ const ch=CHORDS[st.chord], ints=currentIntervals(t), base=ch.intervals, iv=ints[i], mn=Math.min(...ints), mx=Math.max(...ints), span=Math.max(1,mx-mn); const n=(iv-mn)/span, bn=(base[i]-base[0])/Math.max(1,base[2]-base[0]), rawPeak=lerp(-.5,.5,n)+(n-bn)*.18, align=neutralPeakDrive(effectiveParams(t)); return {iv, ratio:Math.pow(2,iv/12), notePos:n, peakCenter:lerp(0,rawPeak,align), pitchOffset:iv-base[i], tone:ch.tone, wide:ch.wide, density:ch.dense, curl:ch.curl}; }

function setChord(i){ const keep={playing:st.playing,volume:st.volume,root:st.root,oct:st.oct,motionAmount:st.motionAmount,motionSpeed:st.motionSpeed,motionRandom:st.motionRandom}; st=defaultState(C(i,0,CHORDS.length-1)); Object.assign(st,keep); syncUIFromState(); refreshAudio(true); }
function resetAll(){ const keep={playing:st.playing,volume:st.volume,chord:st.chord,root:st.root,oct:st.oct,motionAmount:st.motionAmount,motionSpeed:st.motionSpeed,motionRandom:st.motionRandom}; st=defaultState(keep.chord); Object.assign(st,keep,{motion:false}); syncUIFromState(); refreshAudio(true); }
function changeRoot(d){ st.root=(st.root+d+12)%12; syncUIFromState(); refreshAudio(true); }
function changeOct(d){ st.oct=C(st.oct+d,2,6); syncUIFromState(); refreshAudio(true); }
function toggleMotion(){ if(st.motion){ bakeMotion(); refreshAudio(true); return; } ensureAudio(); if(!audio) return; if(audio.ctx && audio.ctx.state==='suspended') audio.ctx.resume(); st.playing=true; st.motion=true; syncTransportUi(); refreshAudio(true); }
function toggleTransport(){ ensureAudio(); if(!audio) return; if(st.playing){ bakeMotion(); st.playing=false; syncTransportUi(); stopAudio(); } else { st.playing=true; syncTransportUi(); refreshAudio(true); } }

function createAudioContext(){ const Ctx=window.AudioContext||window.webkitAudioContext; return Ctx?new Ctx():null; }
function ensureAudio(){ if(audio){ if(audio.ctx.state==='suspended') audio.ctx.resume(); return; } const ctx=createAudioContext(); if(!ctx) return; if(ctx.state==='suspended') ctx.resume(); const input=ctx.createGain(), filter=ctx.createBiquadFilter(), dry=ctx.createGain(), wet=ctx.createGain(), delay=ctx.createDelay(1), feedback=ctx.createGain(), master=ctx.createGain(); filter.type='lowpass'; master.gain.value=0; input.connect(filter); filter.connect(dry); dry.connect(master); filter.connect(wet); wet.connect(delay); delay.connect(master); delay.connect(feedback); feedback.connect(delay); master.connect(ctx.destination); const voices=[]; for(let i=0;i<3;i++){ const osc=ctx.createOscillator(), osc2=ctx.createOscillator(), gain=ctx.createGain(), pan=ctx.createStereoPanner?ctx.createStereoPanner():null; osc.type='sine'; osc2.type='triangle'; gain.gain.value=0; osc.connect(gain); osc2.connect(gain); if(pan){gain.connect(pan);pan.connect(input)}else gain.connect(input); osc.start(); osc2.start(); voices.push({osc,osc2,gain,pan}); } audio={ctx,input,filter,dry,wet,delay,feedback,master,voices}; }
function setParam(p,v,tau=.08){ if(!p||!audio) return; const now=audio.ctx.currentTime; p.cancelScheduledValues(now); p.setTargetAtTime(Number.isFinite(v)?v:0,now,Math.max(.012,tau)); }
function refreshAudio(fast=false){ if(!audio||!st.playing) return; const t=st.motion?millis()*.001:0, p=effectiveParams(t), notes=currentNotes(t), ch=CHORDS[st.chord], sx=morphN('sweep',p), ex=morphN('edge',p), tn=C01((p.tension-(MORPH_BASE.tension-MORPH_RANGE.tension))/(MORPH_RANGE.tension*2)), bn=C01((p.bloom-(MORPH_BASE.bloom-MORPH_RANGE.bloom))/(MORPH_RANGE.bloom*2)); const energy=Math.abs(sx)*.5+Math.abs(ex)*.36+tn*.54, tau=fast?.018:.075; const cutoff=C(190*Math.pow(2,(.5+ex*.42)*5.0)+bn*1900+tn*1800,120,13800), q=C(.38+(.5+ex*.42)*7.2+tn*4.8+ch.dense*2.6,.35,16), wet=C(.01+Math.pow(bn,1.32)*.56+Math.abs(sx)*.075,.01,.76); setParam(audio.master.gain,st.volume*(.22+energy*.13),.03); setParam(audio.filter.frequency,cutoff,tau); setParam(audio.filter.Q,q,tau); setParam(audio.dry.gain,1,tau); setParam(audio.wet.gain,wet,tau*1.25); setParam(audio.delay.delayTime,C(.018+bn*.32+Math.abs(sx)*.11,.012,.54),tau*1.4); setParam(audio.feedback.gain,C(.025+bn*.45+tn*.13,.015,.68),tau*1.5); audio.voices.forEach((v,i)=>{ const side=i-1, tri=triadProfile(i,t), f=hz(notes[i]), det=sx*(16+ex*18)*side+ex*side*7+tri.tone*tn*side*10, ratio=C(1.02+(.5+ex*.42)*.95+bn*.30+tn*.18+tri.ratio*.06+side*sx*.03,1.02,2.75), amp=(.034+(.5+ex*.42)*.017+bn*.036+tn*.022+tri.density*.010)/Math.sqrt(1.15); setParam(v.osc.frequency,f,tau); setParam(v.osc2.frequency,f*ratio,tau*1.1); setParam(v.osc.detune,det,tau); setParam(v.osc2.detune,det*.62+ex*6,tau); setParam(v.gain.gain,amp,.045); if(v.pan) setParam(v.pan.pan,C(side*.12+sx*.52,-.9,.9),.07); }); }
function stopAudio(){ if(!audio) return; audio.voices.forEach(v=>setParam(v.gain.gain,0,.05)); setParam(audio.master.gain,0,.09); }

function draw(){ clear(); const t=st.motion?millis()*.001:0, p=effectiveParams(t); if(st.motion){ refreshAudio(false); if(rangeText) rangeText.textContent=buildRangeText(t); updateMotionUi(t,p); } const frame=logoFrame(); push(); translate(frame.x,frame.y); scale(frame.s); for(let i=0;i<3;i++) drawGaussianBand(i,t,p); pop(); }
function logoFrame(){ const side=min(width,height), safe=window.innerWidth<=960?.90:.86; return {x:side*.5,y:side*.55,s:(side/600)*safe}; }
function logoInk(){ return document.getElementById('darkToggle')?.checked ? '#f2f2f2' : '#050505'; }
function drawGaussianBand(index,time,p){ const tri=triadProfile(index,time), sn=morphN('sweep',p), en=morphN('edge',p), bn=morphN('bloom',p), tn=morphN('tension',p), edgeLevel=C(.5+en*.42,-.08,1.18), tensionLevel=C(.72+tn*.55,.15,1.65), bloomLevel=C(.50+bn*.42,.04,1.22), ints=currentIntervals(time), span=Math.max(1,ints[2]-ints[0]); const ampBase=72+tensionLevel*132+edgeLevel*38, spacing=82+span*2.5+tri.wide*5-tri.density*5+tensionLevel*23, bandAmp=ampBase*(.76+index*.12+tri.ratio*.10+tri.tone*.08), bandVar=C(.46+edgeLevel*1.62+tri.wide*.10-tri.density*.06,.34,2.50), phaseShift=tri.peakCenter+tri.curl*.04*neutralPeakDrive(p), skew=sn*(.13+index*.025); fill(logoInk()); beginShape(); const pts=[],steps=174; for(let j=0;j<=steps;j++){ const u=j/steps,x=lerp(-168,168,u),nx=map(u,0,1,-1.48-sn*.42,3.08+sn*.48),sxLocal=nx-phaseShift,yBase=(index-1)*spacing+sn*(index-1)*8; const peak=bandAmp*Math.exp(-(sxLocal*sxLocal)/Math.max(.20,bandVar)),dipAmp=ampBase*(.14+tensionLevel*.10+tri.tone*.06+edgeLevel*.04),leftDip=dipAmp*Math.exp(-Math.pow(sxLocal+1.10-tri.density*.05-sn*.12,2)/(.46+edgeLevel*.20)),rightDip=dipAmp*Math.exp(-Math.pow(sxLocal-1.36-tri.wide*.12+sn*.12,2)/(.56+edgeLevel*.36)),shoulder=en*14*Math.exp(-Math.pow(sxLocal-.72,2)/.80),curlY=tri.curl*sin(u*PI)*(index-1)*9*(.25+tensionLevel+edgeLevel*.20),cy=yBase-peak+leftDip+rightDip+shoulder+curlY+skew*x*.08,baseThick=3.0+index*.85+Math.pow(bloomLevel,1.85)*11+edgeLevel*1.8,peakThick=(20+Math.pow(bloomLevel,1.28)*86+edgeLevel*18+tensionLevel*12)*(index===1?1.15:.90)*(1+tri.density*.08),th=baseThick+peakThick*Math.exp(-(sxLocal*sxLocal)/(bandVar*(.86+edgeLevel*.34))); pts.push({x,cy,th}); vertex(x,cy-th/2); } for(let j=pts.length-1;j>=0;j--) vertex(pts[j].x,pts[j].cy+pts[j].th/2); endShape(CLOSE); }
