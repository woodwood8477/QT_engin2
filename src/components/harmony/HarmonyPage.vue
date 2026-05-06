<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { useEngineStore } from '@/stores/engineStore';
import NoteStepper from '@/components/common/NoteStepper.vue';
import ChordGrid from './ChordGrid.vue';

const store = useEngineStore();
const { state, rootName, presetTitle } = storeToRefs(store);

const props = defineProps<{
  rangeText: string;
}>();
void props;
</script>

<template>
  <div class="ui-page active">
    <div class="preset-panel neu-panel">
      <ChordGrid :active="state.chord" @select="(i: number) => store.setChord(i)" />

      <div class="note-row neu-inset">
        <NoteStepper
          label="ROOT"
          :display="rootName"
          @step="(d: number) => store.changeRoot(d)"
        />
        <NoteStepper
          label="OCT"
          :display="String(state.oct)"
          @step="(d: number) => store.changeOct(d)"
        />
      </div>

      <div class="range-card neu-inset">
        <strong>{{ presetTitle }}</strong>
        <span>{{ rangeText }}</span>
      </div>
    </div>
  </div>
</template>
