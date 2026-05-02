# QuanTrios METAFONT experiment

This is a source-first typography experiment for the QT project.

The current GitHub Pages root is already used by the main QT engine, so this experiment lives under a subpage:

```text
/experiments/quantrios-metafont/
```

## Purpose

This directory tests whether the `QuanTrios` wordmark can be described as a small METAFONT source instead of as dense SVG outline data.

The intention is to keep the primary glyph data closer to a skeletal / centerline model:

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

## Files

- `QuanTrios.mf` — METAFONT source for `Q u a n T r i o s`
- `QuanTrios_test.tex` — minimal TeX specimen source
- `index.html` — static GitHub Pages specimen page

## Local test

Install a TeX distribution that includes METAFONT, then run:

```bash
mf QuanTrios.mf
tex QuanTrios_test.tex
```

This produces bitmap font output and TeX metrics. It is not the final format for the QT engine.

## Design notes

The important parameters are near the top of `QuanTrios.mf`:

```metafont
u# := 1pt#;
stem# := .46pt#;
cap# := 8pt#;
xh# := 5pt#;
desc# := 1.2pt#;
```

For the QT engine, the next step should not be to force METAFONT directly into the live p5.js engine. The better next step is to port this skeletal glyph logic into JavaScript as a centerline renderer, then drive those parameters from the existing audio controls.
