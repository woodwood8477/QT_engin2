<script setup lang="ts">
import FlashButton from '@/components/common/FlashButton.vue';
import { CHORDS } from '@/engine/chords';

defineProps<{
  active: number;
}>();

const emit = defineEmits<{
  (e: 'select', index: number): void;
}>();

const items = CHORDS.map((c, i) => ({ index: i, label: c.label }));
</script>

<template>
  <div class="preset-grid chord-grid" aria-hidden="true">
    <FlashButton
      v-for="item in items"
      :key="item.index"
      variant="preset-button"
      :active="active === item.index"
      @click="emit('select', item.index)"
    >
      {{ item.label }}
    </FlashButton>
  </div>
</template>
