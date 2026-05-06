<script setup lang="ts">
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useEngineStore } from '@/stores/engineStore';
import FlashButton from '@/components/common/FlashButton.vue';

const props = defineProps<{
  onPlayToggle: () => void;
  onMotionToggle: () => void;
}>();

const store = useEngineStore();
const { state } = storeToRefs(store);

const playLabel = computed(() => (state.value.playing ? 'Ⅱ' : '▶'));
const motionLabel = computed(() => (state.value.motion ? 'STOP' : 'MOTION'));
const volPct = computed(() => Math.round(state.value.volume * 100));

function onVol(event: Event): void {
  const target = event.target as HTMLInputElement;
  store.setVolumeUi(Number(target.value));
}
</script>

<template>
  <div class="transport-strip neu-panel">
    <FlashButton
      variant="round-button"
      :active="state.playing"
      :class="{ 'is-paused': state.playing }"
      aria-label="Play chord"
      @click="props.onPlayToggle"
    >
      {{ playLabel }}
    </FlashButton>

    <div class="vol-control">
      <div class="mini-label-row">
        <span>VOL</span>
        <span>{{ volPct }}%</span>
      </div>
      <input
        id="ctrlVol"
        type="range"
        min="0"
        max="100"
        step="1"
        :value="volPct"
        @input="onVol"
        aria-label="Volume"
      />
    </div>

    <FlashButton
      variant="mode-button"
      :active="state.motion"
      :class="{ 'is-active': state.motion }"
      @click="props.onMotionToggle"
    >
      {{ motionLabel }}
    </FlashButton>

    <FlashButton variant="reset-button" @click="store.reset">RESET</FlashButton>
  </div>
</template>
