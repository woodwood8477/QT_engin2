import { defineStore } from 'pinia';
import { computed, reactive, ref } from 'vue';
import type { EngineState, MorphKey, MotionKey, PageId } from '@/types/state';
import {
  CHORDS,
  NOTE_NAMES,
  clamp,
  clamp01,
  defaultMorphForChord,
  uiToMorph
} from '@/engine/chords';

function makeDefaultState(chord: number, prev?: EngineState): EngineState {
  const morph = defaultMorphForChord(chord);
  return {
    chord,
    root: prev?.root ?? 9,
    oct: prev?.oct ?? 4,
    playing: prev?.playing ?? false,
    motion: false,
    volume: prev?.volume ?? 0.16,
    motionAmount: prev?.motionAmount ?? 0.75,
    motionSpeed: prev?.motionSpeed ?? 0.7,
    motionRandom: prev?.motionRandom ?? 0.45,
    sweep: morph.sweep,
    edge: morph.edge,
    bloom: morph.bloom,
    tension: morph.tension
  };
}

interface MotionPreview {
  sweep: number;
  edge: number;
  bloom: number;
  tension: number;
  motionAmount: number;
  motionSpeed: number;
  motionRandom: number;
}

export const useEngineStore = defineStore('engine', () => {
  const state = reactive<EngineState>(makeDefaultState(0));
  const activePage = ref<PageId>('morph');
  const darkMode = ref(false);
  const motionPreview = reactive<MotionPreview>({
    sweep: state.sweep,
    edge: state.edge,
    bloom: state.bloom,
    tension: state.tension,
    motionAmount: state.motionAmount,
    motionSpeed: state.motionSpeed,
    motionRandom: state.motionRandom
  });

  function updateMotionPreview(values: Partial<MotionPreview>): void {
    Object.assign(motionPreview, values);
  }

  const chordDef = computed(() => CHORDS[state.chord]);
  const rootName = computed(() => NOTE_NAMES[state.root]);
  const presetTitle = computed(() => `${rootName.value} ${chordDef.value.name}`);

  function setPage(page: PageId): void {
    activePage.value = page === 'harmony' ? 'harmony' : page === 'motion' ? 'motion' : 'morph';
  }

  function toggleDarkMode(): void {
    darkMode.value = !darkMode.value;
  }

  function setChord(i: number): void {
    const idx = clamp(i, 0, CHORDS.length - 1);
    const next = makeDefaultState(idx, state);
    Object.assign(state, next);
  }

  function reset(): void {
    const next = makeDefaultState(state.chord, state);
    next.motion = false;
    Object.assign(state, next);
  }

  function changeRoot(delta: number): void {
    state.root = (state.root + delta + 12) % 12;
  }

  function changeOct(delta: number): void {
    state.oct = clamp(state.oct + delta, 2, 6);
  }

  function setMorphFromUi(key: MorphKey, ui: number): void {
    if (state.motion) return;
    state[key] = uiToMorph(key, ui);
  }

  function setVolumeUi(ui: number): void {
    state.volume = clamp01(Number(ui) / 100);
  }

  function setMotionParam(key: MotionKey, value01: number): void {
    state[key] = clamp01(value01);
  }

  function togglePlaying(): void {
    state.playing = !state.playing;
  }

  function setPlaying(playing: boolean): void {
    state.playing = playing;
  }

  function setMotion(active: boolean): void {
    state.motion = active;
  }

  /**
   * MOTION 中のリアルタイム値を state へ固定する。Motionトグル OFF 時に呼ぶ。
   * effective params の計算は LogoCanvas 側で実行し、結果を渡してもらう。
   */
  function bakeMorph(snapshot: { sweep: number; edge: number; bloom: number; tension: number }): void {
    state.sweep = snapshot.sweep;
    state.edge = snapshot.edge;
    state.bloom = snapshot.bloom;
    state.tension = snapshot.tension;
  }

  return {
    state,
    activePage,
    darkMode,
    motionPreview,
    chordDef,
    rootName,
    presetTitle,
    setPage,
    toggleDarkMode,
    setChord,
    reset,
    changeRoot,
    changeOct,
    setMorphFromUi,
    setVolumeUi,
    setMotionParam,
    togglePlaying,
    setPlaying,
    setMotion,
    bakeMorph,
    updateMotionPreview
  };
});
