<script setup lang="ts">
import FlashButton from './FlashButton.vue';

defineProps<{
  label: string;
  display: string;
}>();

const emit = defineEmits<{
  (e: 'step', delta: number): void;
}>();
</script>

<template>
  <div class="note-block">
    <span class="note-label">{{ label }}</span>
    <span class="display-pill">{{ display }}</span>
    <FlashButton variant="pill-button step-button" @click="emit('step', -1)">−</FlashButton>
    <FlashButton variant="pill-button step-button" @click="emit('step', 1)">＋</FlashButton>
  </div>
</template>
