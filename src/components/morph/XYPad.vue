<script setup lang="ts">
import { computed, ref } from 'vue';

const props = defineProps<{
  sweepUi: number;
  edgeUi: number;
}>();

const emit = defineEmits<{
  (e: 'update', value: { sweepUi: number; edgeUi: number }): void;
}>();

const pad = ref<HTMLDivElement | null>(null);
const dragging = ref(false);

const sweepDisplay = computed(() => Math.round(props.sweepUi));
const edgeDisplay = computed(() => Math.round(props.edgeUi));

const knobStyle = computed(() => {
  const m = padMetrics();
  if (!m) return { left: '50%', top: '50%' };
  const left = m.pad + (props.sweepUi / 100) * Math.max(1, m.width - m.pad * 2);
  const top = m.pad + (1 - props.edgeUi / 100) * Math.max(1, m.height - m.pad * 2);
  return { left: `${left}px`, top: `${top}px` };
});

function padMetrics(): { width: number; height: number; pad: number; rect: DOMRect } | null {
  const el = pad.value;
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  const side = Math.min(rect.width, rect.height);
  const padPx = Math.max(28, side * 0.12);
  return { width: rect.width, height: rect.height, pad: padPx, rect };
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

function update(event: PointerEvent): void {
  const m = padMetrics();
  if (!m) return;
  event.preventDefault();
  const x = clamp(event.clientX - m.rect.left, m.pad, m.width - m.pad);
  const y = clamp(event.clientY - m.rect.top, m.pad, m.height - m.pad);
  const ux = ((x - m.pad) / Math.max(1, m.width - m.pad * 2)) * 100;
  const uy = (1 - (y - m.pad) / Math.max(1, m.height - m.pad * 2)) * 100;
  emit('update', { sweepUi: ux, edgeUi: uy });
}

function onPointerDown(event: PointerEvent): void {
  dragging.value = true;
  pad.value?.setPointerCapture?.(event.pointerId);
  update(event);
}
function onPointerMove(event: PointerEvent): void {
  if (!dragging.value) return;
  update(event);
}
function onPointerUp(event: PointerEvent): void {
  dragging.value = false;
  if (pad.value && pad.value.hasPointerCapture?.(event.pointerId)) {
    pad.value.releasePointerCapture(event.pointerId);
  }
}
</script>

<template>
  <div
    ref="pad"
    class="xy-pad neu-inset"
    :class="{ 'is-dragging': dragging }"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
    @lostpointercapture="onPointerUp"
  >
    <div class="xy-label top-left">EDGE</div>
    <div class="xy-label bottom-right">SWEEP</div>
    <div class="xy-grid" />
    <div class="xy-knob" :style="knobStyle" />
    <span class="xy-readout left">{{ sweepDisplay }}</span>
    <span class="xy-readout top">{{ edgeDisplay }}</span>
  </div>
</template>
