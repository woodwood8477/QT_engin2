<script setup lang="ts">
import { computed, ref } from 'vue';
import { clamp, clamp01 } from '@/engine/chords';

const props = defineProps<{
  label: string;
  modelValue: number;
  pulseValue?: number;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: number): void;
}>();

const dial = ref<HTMLDivElement | null>(null);
const dragging = ref(false);

const displayValue = computed(() => Math.round(clamp01(props.modelValue) * 100));
const angle = computed(() => 225 + clamp01(props.modelValue) * 270);
const pulseAngle = computed(() => 225 + clamp01(props.pulseValue ?? props.modelValue) * 270);

function angleToValue(deg: number): number {
  let d = deg;
  if (d < 135) d += 360;
  d = clamp(d, 225, 495);
  return clamp01((d - 225) / 270);
}

function update(event: PointerEvent): void {
  const el = dial.value;
  if (!el) return;
  event.preventDefault();
  const r = el.getBoundingClientRect();
  const cx = r.left + r.width / 2;
  const cy = r.top + r.height / 2;
  let deg = (Math.atan2(event.clientY - cy, event.clientX - cx) * 180) / Math.PI + 90;
  if (deg < 0) deg += 360;
  emit('update:modelValue', angleToValue(deg));
}

function onPointerDown(event: PointerEvent): void {
  dragging.value = true;
  dial.value?.setPointerCapture?.(event.pointerId);
  update(event);
}
function onPointerMove(event: PointerEvent): void {
  if (!dragging.value) return;
  update(event);
}
function onPointerUp(event: PointerEvent): void {
  dragging.value = false;
  if (dial.value && dial.value.hasPointerCapture?.(event.pointerId)) {
    dial.value.releasePointerCapture(event.pointerId);
  }
}

function onSliderInput(event: Event): void {
  const target = event.target as HTMLInputElement;
  emit('update:modelValue', clamp01(Number(target.value) / 100));
}
</script>

<template>
  <div class="knob-control">
    <div
      ref="dial"
      class="knob-dial"
      :style="{
        '--angle': `${angle}deg`,
        '--pulse-angle': `${pulseAngle}deg`
      }"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
    >
      <div class="knob-dot" />
      <div class="knob-activity" />
      <span class="knob-scale knob-zero">0</span>
      <span class="knob-scale knob-hundred">100</span>
      <div class="knob-value">{{ displayValue }}</div>
    </div>
    <div class="knob-name"><span>{{ label }}</span></div>
    <input
      class="motion-slider"
      type="range"
      min="0"
      max="100"
      step="1"
      :value="displayValue"
      @input="onSliderInput"
    />
  </div>
</template>
