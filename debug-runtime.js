// QT_ensin debug runtime v7.8
// Captures WebAudio state on iOS/Safari and exposes a visible status badge.
(function(){
  const NativeAudioContext = window.AudioContext || window.webkitAudioContext;
  if (NativeAudioContext && !window.__qtAudioWrapped) {
    const WrappedAudioContext = function(...args) {
      const ctx = new NativeAudioContext(...args);
      window.__qtAudioContext = ctx;
      return ctx;
    };
    WrappedAudioContext.prototype = NativeAudioContext.prototype;
    window.AudioContext = WrappedAudioContext;
    window.webkitAudioContext = WrappedAudioContext;
    window.__qtAudioWrapped = true;
  }

  function statusText() {
    const ctx = window.__qtAudioContext;
    const play = document.getElementById('playButton');
    const vol = document.getElementById('ctrlVol');
    const state = ctx ? ctx.state : 'not started';
    const playState = play ? play.textContent.trim() : '?';
    const volState = vol ? `${vol.value}%` : '?';
    return `AUDIO: ${state} / PLAY: ${playState} / VOL: ${volState}`;
  }

  function setStatus(extra) {
    const el = document.getElementById('debug-status');
    if (!el) return;
    el.textContent = extra ? `${statusText()} / ${extra}` : statusText();
    el.dataset.audio = (window.__qtAudioContext && window.__qtAudioContext.state) || 'none';
  }

  async function tryResumeFromGesture() {
    const ctx = window.__qtAudioContext;
    if (!ctx) {
      setStatus('tap PLAY to create context');
      return;
    }
    try {
      if (ctx.state === 'suspended') await ctx.resume();
      setStatus('resume checked');
    } catch (err) {
      setStatus(`resume error: ${err && err.name ? err.name : 'unknown'}`);
    }
  }

  document.addEventListener('pointerup', function(e) {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.closest('#playButton') || target.closest('.preset-button') || target.closest('[data-note-action]') || target.closest('[data-oct-action]')) {
      setTimeout(tryResumeFromGesture, 0);
      setTimeout(() => setStatus('gesture checked'), 180);
    }
  }, true);

  window.addEventListener('pageshow', () => setStatus('page shown'));
  window.addEventListener('focus', () => setStatus('focus'));
  setInterval(() => setStatus(), 500);
})();
