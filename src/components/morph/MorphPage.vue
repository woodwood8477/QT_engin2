<script setup lang="ts">
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useEngineStore } from '@/stores/engineStore';
import { morphToUi } from '@/engine/chords';
import NeuSlider from '@/components/common/NeuSlider.vue';
import XYPad from './XYPad.vue';

const store = useEngineStore();
const { state } = storeToRefs(store);

const sweepUi = computed(() => morphToUi('sweep', state.value.sweep));
const edgeUi = computed(() => morphToUi('edge', state.value.edge));
const bloomUi = computed(() => morphToUi('bloom', state.value.bloom));
const tensionUi = computed(() => morphToUi('tension', state.value.tension));

function onXYUpdate(value: { sweepUi: number; edgeUi: number }): void {
  store.setMorphFromUi('sweep', value.sweepUi);
  store.setMorphFromUi('edge', value.edgeUi);
}
</script>

<template>
  <div class="ui-page active">
    <div class="matrix-panel">
      <XYPad :sweep-ui="sweepUi" :edge-ui="edgeUi" @update="onXYUpdate" />
      <div class="side-controls">
        <NeuSlider
          label="BLOOM"
          input-id="ctrlBloom"
          :model-value="bloomUi"
          @update:modelValue="(v: number) => store.setMorphFromUi('bloom', v)"
        />
        <NeuSlider
          label="TENSION"
          input-id="ctrlTension"
          :model-value="tensionUi"
          @update:modelValue="(v: number) => store.setMorphFromUi('tension', v)"
        />
      </div>
    </div>
  </div>
</template>
