<script setup lang="ts">
import p5 from 'p5';
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useEngineStore } from '@/stores/engineStore';
import { AudioEngine } from '@/engine/audio';
import { drawScene, getCanvasSide } from '@/engine/render';
import { effectiveParams, randomWave } from '@/engine/motion';
import { clamp01 } from '@/engine/chords';

const store = useEngineStore();
const { state, darkMode } = storeToRefs(store);

const container = ref<HTMLDivElement | null>(null);
let instance: p5 | null = null;
const audio = new AudioEngine();
let lastAudioUpdate = 0;

watch(
  () => [
    state.value.chord,
    state.value.root,
    state.value.oct,
    state.value.sweep,
    state.value.edge,
    state.value.bloom,
    state.value.tension,
    state.value.volume,
    state.value.motionAmount,
    state.value.motionSpeed,
    state.value.motionRandom
  ],
  () => {
    if (!state.value.playing || !instance) return;
    const now = performance.now();
    if (now - lastAudioUpdate < 28) return;
    lastAudioUpdate = now;
    audio.refresh(instance, state.value, true, instance.millis() * 0.001);
  }
);

watch(
  () => state.value.playing,
  (playing) => {
    if (!instance) return;
    if (playing) {
      audio.ensure();
      audio.refresh(instance, state.value, true, instance.millis() * 0.001);
    } else {
      audio.stop();
    }
  }
);

watch(
  () => state.value.motion,
  (motion) => {
    document.body.classList.toggle('motion-running', motion);
  },
  { immediate: true }
);

onMounted(() => {
  if (!container.value) return;
  const host = container.value;
  instance = new p5((p: p5) => {
    p.setup = () => {
      const side = getCanvasSide();
      p.createCanvas(side, side);
      p.pixelDensity(Math.min(window.devicePixelRatio || 1, 2));
      p.noStroke();
    };
    p.draw = () => {
      if (!instance) return;
      drawScene(p, state.value, darkMode.value);
      if (state.value.motion) {
        const t = p.millis() * 0.001;
        const params = effectiveParams(p, state.value, t);
        const base = state.value;
        const delta = clamp01(
          (Math.abs(params.sweep - base.sweep) +
            Math.abs(params.edge - base.edge) +
            Math.abs(params.bloom - base.bloom) +
            Math.abs(params.tension - base.tension)) *
            1.8
        );
        const liveAmount = clamp01(
          base.motionAmount * 0.55 +
            delta * 0.65 +
            0.08 * Math.sin(t * (1.1 + base.motionSpeed * 4.0))
        );
        const liveSpeed = clamp01(
          0.5 +
            0.5 *
              Math.sin(
                t * (1.2 + base.motionSpeed * 6.0) + randomWave(p, t, 6.2) * base.motionRandom
              )
        );
        const liveRandom = clamp01(
          0.5 + 0.5 * randomWave(p, t * (1.4 + base.motionSpeed * 2.8), 8.8)
        );
        store.updateMotionPreview({
          ...params,
          motionAmount: liveAmount,
          motionSpeed: liveSpeed,
          motionRandom: liveRandom
        });
        if (state.value.playing) {
          audio.refresh(p, state.value, false, t);
        }
      }
    };
    p.windowResized = () => {
      const side = getCanvasSide();
      p.resizeCanvas(side, side);
    };
  }, host);
});

onBeforeUnmount(() => {
  audio.stop();
  if (instance) {
    instance.remove();
    instance = null;
  }
});

defineExpose({
  bakeMotion(): void {
    if (!instance) return;
    const t = instance.millis() * 0.001;
    const params = effectiveParams(instance, state.value, t);
    store.bakeMorph(params);
  },
  ensureAudio(): void {
    audio.ensure();
  }
});
</script>

<template>
  <div ref="container" id="canvas-container" />
</template>
