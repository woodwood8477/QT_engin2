# QuanTrios METAFONT experiment

This is a source-first typography experiment for the QT project.

The current GitHub Pages root is already used by the main QT engine, so this experiment lives under a subpage:

```text
/experiments/quantrios-metafont/
```

## Current development status

The font is not considered visually successful yet. Development is continuing from a focused repair proof rather than from the previous full alphabet proof.

Current primary diagnostic page:

```text
/experiments/quantrios-metafont/focused-proof.html
```

The QT engine root `METAFONT` button now points directly to this focused proof. The old directory `index.html` still exists and may still show the previous full alphabet / fallback-mixed proof until it can be safely replaced.

## Purpose

This directory tests whether the `QuanTrios` wordmark can be described as a small METAFONT / centerline source instead of as dense SVG outline data.

The intention is to keep the primary glyph data close to a skeletal / centerline model:

```text
centerline path
+ shared pen width
+ geometric parameters
= glyph image
```

This is useful as a conceptual bridge toward:

- centerline-based logo generation
- sound-reactive typography
- SVG export from a smaller source model
- later outline or variable-font experiments

## Current repair focus

Do not treat fallback glyphs as finished glyphs. The current repair target is limited to native centerline glyphs for:

```text
QuanTrios
OQoa
AVW
nur
Tis
```

The immediate visual target is to move these centerline glyphs closer to a Futura-like geometric sans reference without tracing or storing Futura outlines.

Priority order:

1. Retune `Q`, `a`, and `s`.
2. Align `n`, `u`, and `r` as one stem-arch family.
3. Retune `A`, `V`, and `W` apex / terminal / weight balance.
4. Rework spacing and advance widths for `QuanTrios`.
5. Reintroduce alphabet coverage only after the family rules are stable.

## Files

- `QuanTrios.mf` — METAFONT source for the broader glyph experiment.
- `QuanTrios_test.tex` — minimal TeX specimen source.
- `focused-proof.html` — current primary repair proof for native centerline glyphs.
- `centerline-proof-v2.css` — extracted style layer for the next refactor.
- `index.html` — older full proof; should be promoted/replaced after the focused proof is stable.

## Local test

Install a TeX distribution that includes METAFONT, then run:

```bash
mf QuanTrios.mf
tex QuanTrios_test.tex
```

This produces bitmap font output and TeX metrics. It is not the final format for the QT engine.

## Design notes

For the QT engine, the next step should not be to force METAFONT directly into the live p5.js engine. The better path is to port the skeletal glyph logic into JavaScript as a centerline renderer, then drive those parameters from the existing audio controls.

Hard constraints:

- Do not copy, trace, or store Futura outlines.
- Keep native glyphs centerline-controlled.
- Keep fallback/reference drawing clearly separate from native centerline drawing.
- Prefer reusable family rules over one-off glyph patches.
