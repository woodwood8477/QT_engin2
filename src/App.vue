<script setup lang="ts">
import { computed, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useEngineStore } from '@/stores/engineStore';
import LogoCanvas from '@/components/LogoCanvas.vue';
import ThemeSwitch from '@/components/ThemeSwitch.vue';
import MetafontLink from '@/components/MetafontLink.vue';
import MorphPage from '@/components/morph/MorphPage.vue';
import MotionPage from '@/components/motion/MotionPage.vue';
import HarmonyPage from '@/components/harmony/HarmonyPage.vue';
import TransportStrip from '@/components/transport/TransportStrip.vue';
import FlashButton from '@/components/common/FlashButton.vue';
import type { PageId } from '@/types/state';
import { fmt, noteName } from '@/engine/chords';

const store = useEngineStore();
const { state, activePage } = storeToRefs(store);

const isMorph = computed(() => activePage.value === 'morph');
const isMotion = computed(() => activePage.value === 'motion');
const isHarmony = computed(() => activePage.value === 'harmony');

const logoCanvas = ref<InstanceType<typeof LogoCanvas> | null>(null);

function setPage(page: PageId): void {
  store.setPage(page);
}

function onPlayToggle(): void {
  logoCanvas.value?.ensureAudio();
  if (state.value.motion) logoCanvas.value?.bakeMotion();
  if (state.value.playing) {
    store.setPlaying(false);
  } else {
    store.setPlaying(true);
  }
}

function onMotionToggle(): void {
  if (state.value.motion) {
    logoCanvas.value?.bakeMotion();
    store.setMotion(false);
  } else {
    logoCanvas.value?.ensureAudio();
    store.setPlaying(true);
    store.setMotion(true);
  }
}

const rangeText = computed(() => {
  const root = (state.value.oct + 1) * 12 + state.value.root;
  const ints: [number, number, number] = [0, 4, 7]; // 静的表示用（HARMONYページの参考表示）
  return `${ints
    .map((iv) => noteName(root + iv))
    .join(' · ')} / ${ints.map(fmt).join(' · ')}`;
});
</script>

<template>
  <main id="stage">
    <div id="logo-header">QuanTrios</div>
    <LogoCanvas ref="logoCanvas" />
  </main>

  <section id="qt-ui">
    <nav class="page-tabs" aria-label="Control pages">
      <FlashButton variant="tab-button" :active="isMorph" @click="setPage('morph')">
        MORPH
      </FlashButton>
      <FlashButton variant="tab-button" :active="isMotion" @click="setPage('motion')">
        MOTION
      </FlashButton>
      <FlashButton variant="tab-button" :active="isHarmony" @click="setPage('harmony')">
        HARMONY
      </FlashButton>
      <ThemeSwitch />
    </nav>

    <MorphPage v-show="isMorph" />
    <MotionPage v-show="isMotion" />
    <HarmonyPage v-show="isHarmony" :range-text="rangeText" />

    <TransportStrip
      :on-play-toggle="onPlayToggle"
      :on-motion-toggle="onMotionToggle"
    />
  </section>

  <MetafontLink />
</template>
