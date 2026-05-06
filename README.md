# QT_engin2 — QuanTrios Wave Logo Engine

Vue 3 + TypeScript + p5.js + Web Audio API で動作する、インタラクティブな波形ロゴ + コードシンセサイザー + MOTION モジュレーター。

現行: **v11.0**（Vue edition、`package.json` の `version` 参照）  
旧 vanilla 実装（v10.9）は `legacy/v10-9-vanilla/` に保存しています。  
独立した `experiments/quantrios-metafont/` の METAFONT 実験はそのまま維持しています。

---

## 特徴

- **MORPH / MOTION / HARMONY の 3 ページ UI**
- **ダークモードトグル** (`#darkToggle`、CSS の `:has()` セレクタで切替)
- **MOTION エンジン**: AMOUNT / SPEED / RANDOM の 3 ノブで `effectiveParams(t)` をリアルタイム生成。MOTION OFF 時は `bakeMorph()` で現在値を固定
- **3 ボイス WebAudio**: sine + triangle、ローパスフィルター、ディレイ FX
- **p5 instance mode** によるグローバル汚染ゼロな描画
- **Pinia 単一ストア**でアプリ状態を集約管理
- **METAFONT サブページ** へのフローティングリンク常駐

---

## 操作

### MORPH ページ
| コントロール | 役割 |
| ---- | ---- |
| XY パッド | 横軸 = SWEEP、縦軸 = EDGE（共に 0..100 UI / 内部は MORPH_BASE±MORPH_RANGE） |
| BLOOM | 厚み・残響量 (0..100) |
| TENSION | 振幅・倍音強度 (0..100) |

### MOTION ページ
| コントロール | 役割 |
| ---- | ---- |
| AMOUNT | モーション深度 |
| SPEED | 揺らぎ速度 |
| RANDOM | ランダムドリフト量 |

### HARMONY ページ
| コントロール | 役割 |
| ---- | ---- |
| コード選択 | MAJ / MIN / AUG / DIM / SUS4 / SUS2 |
| ROOT | 12 半音 |
| OCT | 2..6 |

### トランスポート
| ボタン | 役割 |
| ---- | ---- |
| ▶ / Ⅱ | 再生 / 停止（停止時はモーションを bake） |
| VOL | マスター音量 |
| MOTION / STOP | MOTION ON/OFF（OFF 時は現在値を bake） |
| RESET | 現コードのプリセットへ戻す |

---

## セットアップ

```bash
npm install --legacy-peer-deps
npm run dev
npm run build
npm run type-check
npm run lint
npm run test
```

> `--legacy-peer-deps` は `vite@6` + `@vitejs/plugin-vue@5` のピア依存解決のため初回のみ必要です。

Node.js 20+ 推奨。

---

## ディレクトリ構成

```
QT_engin2/
├── index.html                         # Viteエントリ
├── src/
│   ├── main.ts                        # createApp + Pinia
│   ├── App.vue                        # ページ切替・トランスポート統合
│   ├── components/
│   │   ├── LogoCanvas.vue             # p5 instance mode
│   │   ├── ThemeSwitch.vue            # ダークモード
│   │   ├── MetafontLink.vue           # 左下フローティングリンク
│   │   ├── common/
│   │   │   ├── FlashButton.vue
│   │   │   ├── NeuSlider.vue
│   │   │   └── NoteStepper.vue
│   │   ├── morph/
│   │   │   ├── MorphPage.vue
│   │   │   └── XYPad.vue
│   │   ├── motion/
│   │   │   ├── MotionPage.vue
│   │   │   └── KnobDial.vue           # ノブダイアル
│   │   ├── harmony/
│   │   │   ├── HarmonyPage.vue
│   │   │   └── ChordGrid.vue
│   │   └── transport/
│   │       └── TransportStrip.vue
│   ├── engine/
│   │   ├── audio.ts                   # AudioEngineクラス
│   │   ├── chords.ts                  # CHORDS / NOTE_NAMES / Morphマッピング
│   │   ├── motion.ts                  # effectiveParams / triadProfile
│   │   └── render.ts                  # ガウシアンバンド描画
│   ├── stores/
│   │   └── engineStore.ts             # Pinia
│   ├── types/state.ts
│   └── styles/style.css
├── .github/workflows/deploy.yml       # GitHub Pages 自動デプロイ
├── biome.json
├── vite.config.ts
├── tsconfig*.json
├── experiments/quantrios-metafont/    # METAFONT 実験（main から継承、Vue とは独立）
└── legacy/
    ├── v10-9-vanilla/                 # 旧 v10.9 実装（vanilla JS + p5 グローバル）
    └── v6 SIGNAL_ENGINE                # さらに古い世代
```

---

## アーキテクチャ概観

- **状態モデル**: `EngineState` 1 つにすべて集約。MOTION 中はパラメーターを直接書き換えず、`effectiveParams(p, st, t)` で派生値を計算
- **MOTION 終了時**: `LogoCanvas` の `bakeMotion()` が `effectiveParams` の現在値を `state.{sweep,edge,bloom,tension}` に書き込む
- **描画**: `LogoCanvas.vue` が `new p5(sketch, host)` で instance mode を起動。`p.draw` 内で `drawScene(p, state, darkMode)` を呼ぶ
- **オーディオ**: `AudioEngine` クラスが 3 ボイス + フィルター + ディレイを保持。state 変更を `watch` で 28ms 間隔スロットルし `refresh()`、MOTION 中は `p.draw` ループ内でも追加同期
- **ダークモード**: Pinia の `darkMode` ref と `<input id="darkToggle">` を bind。CSS は `body:has(#darkToggle:checked)` で全変数を切り替え（ロゴインクは `logoInk(darkMode)` で直接 fill 色を変える）
- **METAFONT 実験ページ**: `experiments/quantrios-metafont/` をビルド成果物 `dist/experiments/` にコピーすることで、`/experiments/quantrios-metafont/` がそのまま動く

### MOTION 数式
- `effectiveParams(p, st, t)`: `MORPH_BASE` を中心に `wave[1..4]`（コード固有の周波数）と `drift[1..4]`（p5 noise + LFO）を depth 倍して足す
- `depth = (0.2 + tensionNorm * 0.54) * motionAmount`
- `rate = 0.18 + motionSpeed * 5.2`、`drift` は `motionRandom` 倍

---

## 主要依存

| パッケージ | 用途 |
| ---- | ---- |
| `vue` 3.5 / `pinia` | UI / 状態管理 |
| `p5` + `@types/p5` | キャンバス描画 |
| `@fontsource/outfit` | Outfit フォントをローカルバンドル |
| `vite` 6 / `vue-tsc` | ビルド・型 |
| `@biomejs/biome` | lint / format |
| `vitest` + `@vue/test-utils` + `jsdom` | テスト |

---

## デプロイ

`main` ブランチへの push で `.github/workflows/deploy.yml` が動作し、`vite build` の出力（`dist/`）と `experiments/` を GitHub Pages に自動配信します。

---

## バージョン履歴（抜粋）

| バージョン | 主な変更 |
| ---- | ---- |
| **v11.0** | Vue 3 + TypeScript + Pinia + Vite に全面移行 |
| v10.9 | Clean UI、MOTION 3ノブ、ダークモード、METAFONT 連携、direct ink |
| v10.x | MOTION ノブ、ダークモード、Centerline glyph 検証 |
| v9.x  | 統一ノブ UI、コンパクト UI、CSS-only テーマ切替 |
| v8.x  | MOTION 分離ページ化、グラフィック↔オーディオ連携 |
| v7.x  | 6 トライアド、XY pulse |

---

## ライセンス

未設定。
