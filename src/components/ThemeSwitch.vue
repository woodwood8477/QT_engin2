<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { useEngineStore } from '@/stores/engineStore';

const store = useEngineStore();
const { darkMode } = storeToRefs(store);

function onChange(event: Event): void {
  const target = event.target as HTMLInputElement;
  if (target.checked !== darkMode.value) store.toggleDarkMode();
}
</script>

<template>
  <label class="theme-switch" aria-label="Toggle dark mode">
    <input
      id="darkToggle"
      type="checkbox"
      :checked="darkMode"
      @change="onChange"
    />
    <span class="switch-track">
      <span class="switch-knob" />
    </span>
  </label>
</template>
