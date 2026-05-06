<script setup lang="ts">
import { ref } from 'vue';

defineProps<{
  type?: 'button' | 'submit';
  ariaLabel?: string;
  variant?: string;
  active?: boolean;
}>();

const emit = defineEmits<{
  (e: 'click'): void;
}>();

const flashing = ref(false);
let timer: number | null = null;

function onClick(event: MouseEvent): void {
  event.preventDefault();
  flashing.value = false;
  void (event.currentTarget as HTMLElement | null)?.offsetWidth;
  flashing.value = true;
  if (timer !== null) clearTimeout(timer);
  timer = window.setTimeout(() => {
    flashing.value = false;
    timer = null;
  }, 240);
  emit('click');
}
</script>

<template>
  <button
    :type="type ?? 'button'"
    :class="[variant, { 'button-flash': flashing, active }]"
    :aria-label="ariaLabel"
    @click="onClick"
  >
    <slot />
  </button>
</template>
