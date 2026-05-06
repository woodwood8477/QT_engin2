<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { useEngineStore } from '@/stores/engineStore';
import KnobDial from './KnobDial.vue';

const store = useEngineStore();
const { state } = storeToRefs(store);
</script>

<template>
  <div class="ui-page active">
    <div class="motion-panel neu-panel">
      <div class="motion-knob-grid">
        <KnobDial
          label="AMOUNT"
          :model-value="state.motionAmount"
          @update:modelValue="(v: number) => store.setMotionParam('motionAmount', v)"
        />
        <KnobDial
          label="SPEED"
          :model-value="state.motionSpeed"
          @update:modelValue="(v: number) => store.setMotionParam('motionSpeed', v)"
        />
        <KnobDial
          label="RANDOM"
          :model-value="state.motionRandom"
          @update:modelValue="(v: number) => store.setMotionParam('motionRandom', v)"
        />
      </div>
    </div>
  </div>
</template>
