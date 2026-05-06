<script setup lang="ts">
defineProps<{
  label: string;
  modelValue: number;
  min?: number;
  max?: number;
  step?: number;
  display?: string;
  inputId?: string;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: number): void;
}>();

function onInput(event: Event): void {
  const target = event.target as HTMLInputElement;
  emit('update:modelValue', Number(target.value));
}
</script>

<template>
  <div class="small-control neu-panel">
    <div class="slider-header">
      <span>{{ label }}</span>
      <span class="val-display">{{ display ?? Math.round(modelValue) }}</span>
    </div>
    <input
      :id="inputId"
      type="range"
      :min="min ?? 0"
      :max="max ?? 100"
      :step="step ?? 1"
      :value="modelValue"
      @input="onInput"
    />
  </div>
</template>
