<script setup lang="ts">
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useEngineStore } from '@/stores/engineStore';
import KnobDial from './KnobDial.vue';

const store = useEngineStore();
const { state } = storeToRefs(store);

const amount = computed(() =>
  state.value.motion ? store.motionPreview.motionAmount : state.value.motionAmount
);
const speed = computed(() =>
  state.value.motion ? store.motionPreview.motionSpeed : state.value.motionSpeed
);
const random = computed(() =>
  state.value.motion ? store.motionPreview.motionRandom : state.value.motionRandom
);
</script>

<template>
  <div class="ui-page active">
    <div class="motion-panel neu-panel">
      <div class="motion-knob-grid">
        <KnobDial
          label="AMOUNT"
          :model-value="amount"
          :pulse-value="amount"
          @update:modelValue="(v: number) => store.setMotionParam('motionAmount', v)"
        />
        <KnobDial
          label="SPEED"
          :model-value="speed"
          :pulse-value="speed"
          @update:modelValue="(v: number) => store.setMotionParam('motionSpeed', v)"
        />
        <KnobDial
          label="RANDOM"
          :model-value="random"
          :pulse-value="random"
          @update:modelValue="(v: number) => store.setMotionParam('motionRandom', v)"
        />
      </div>
    </div>
  </div>
</template>
