# Futura Reference Lock

This file freezes the Futura reference method for `experiments/quantrios-metafont`. It is intentionally data-only: the Futura font file is not stored in the repository.

## Root cause being fixed

- The current proof labels the red layer as `local Futura / Helvetica reference`, so the reference can silently become Helvetica or another browser fallback.
- The current proof scales the red reference text to the native QT row width before drawing it. That hides advance-width error and turns the reference into a moving target.
- Recent commits are therefore tuning visible overlap rather than comparing against one frozen source of truth. This explains the repeated improve/regress cycle.

## Locked source

- Source measured locally: `/mnt/data/Futura.ttc`, collection index `0`.
- Font face: `Futura Medium` / PostScript name `Futura-Medium`.
- Units per em: `2048`.
- Cap reference: glyph `H` outline height = `1544` font units.
- x-height reference: glyph `x` outline height = `974` font units; x/cap = `0.630829`.
- Outline points are not copied or traced into the project. Only scalar measurements are recorded.

## Non-negotiable reference rules

1. Do not use Helvetica, Arial, or any generic fallback as the red reference.
2. Do not width-fit the reference text to the QT text. Natural Futura advance width must remain visible.
3. If the browser cannot confirm Futura is available, disable the red outline/text reference and show a warning; keep only numeric guide boxes from this lock file.
4. Any geometry change must state which locked metric it improves: advance, black-box width, left side bearing, right side bearing, vertical extrema, or centerline family.
5. Re-measure from the same TTC/index before changing this file. Do not edit numbers by eye.

## Metrics used by the canvas proof

Canvas model convention: uppercase ratios are normalized to `H` cap height; lowercase ratios are normalized to `x` height. Exception: `i` remains cap-normalized because the existing proof draws it through `capAdvance("i") / capBox("i")` to account for the dot.

| glyph | glyph name | norm | adv ratio | box width ratio | left ratio | right ratio | yMin ratio | yMax ratio | current adv | current box | adv delta | box delta |
|---:|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `O` | `O` | cap | 1.1852 | 1.0453 | 0.0699 | 1.1153 | -0.0181 | 1.0188 | 1.1739 | 1.0353 | +0.0113 | +0.0100 |
| `Q` | `Q` | cap | 1.1852 | 1.0674 | 0.0699 | 1.1373 | -0.0181 | 1.0188 | 1.1739 | 1.0571 | +0.0113 | +0.0103 |
| `A` | `A` | cap | 0.9825 | 0.9722 | 0.0052 | 0.9773 | 0.0000 | 1.0628 | 0.9730 | 0.9628 | +0.0095 | +0.0094 |
| `V` | `V` | cap | 0.8970 | 0.8873 | 0.0052 | 0.8925 | -0.0751 | 1.0000 | 0.8884 | 0.8787 | +0.0086 | +0.0086 |
| `W` | `W` | cap | 1.4067 | 1.3970 | 0.0052 | 1.4022 | -0.0641 | 1.0486 | 1.3931 | 1.3835 | +0.0136 | +0.0135 |
| `T` | `T` | cap | 0.6399 | 0.6101 | 0.0149 | 0.6250 | 0.0000 | 1.0000 | 0.6337 | 0.6043 | +0.0062 | +0.0058 |
| `i` | `i` | cap | 0.3303 | 0.1898 | 0.0699 | 0.2597 | 0.0000 | 0.9870 | 0.3271 | 0.1880 | +0.0032 | +0.0018 |
| `o` | `o` | xh | 1.2639 | 1.0667 | 0.0986 | 1.1653 | -0.0287 | 1.0277 | 1.2460 | 1.0516 | +0.0179 | +0.0151 |
| `a` | `a` | xh | 1.2608 | 1.0164 | 0.0986 | 1.1150 | -0.0287 | 1.0277 | 1.2429 | 1.0020 | +0.0179 | +0.0144 |
| `n` | `n` | xh | 1.1530 | 0.8614 | 0.1458 | 1.0072 | 0.0000 | 1.0277 | 1.1366 | 0.8493 | +0.0164 | +0.0121 |
| `u` | `u` | xh | 1.1458 | 0.8542 | 0.1458 | 1.0000 | -0.0287 | 1.0000 | 1.1295 | 0.8420 | +0.0163 | +0.0122 |
| `r` | `r` | xh | 0.7864 | 0.6540 | 0.1458 | 0.7998 | 0.0000 | 1.0277 | 0.7753 | 0.6447 | +0.0111 | +0.0093 |
| `s` | `s` | xh | 0.8532 | 0.7136 | 0.0780 | 0.7916 | -0.0287 | 1.0277 | 0.8412 | 0.7035 | +0.0120 | +0.0101 |

## JSON payload for `futuraModel`

```json
{
  "capUnits": 1544,
  "xhUnits": 974,
  "xhCapRatio": 0.630829,
  "adv": {
    "O": 1.1852,
    "Q": 1.1852,
    "A": 0.9825,
    "V": 0.8970,
    "W": 1.4067,
    "T": 0.6399,
    "i": 0.3303,
    "o": 1.2639,
    "a": 1.2608,
    "n": 1.1530,
    "u": 1.1458,
    "r": 0.7864,
    "s": 0.8532
  },
  "box": {
    "O": 1.0453,
    "Q": 1.0674,
    "A": 0.9722,
    "V": 0.8873,
    "W": 1.3970,
    "T": 0.6101,
    "i": 0.1898,
    "o": 1.0667,
    "a": 1.0164,
    "n": 0.8614,
    "u": 0.8542,
    "r": 0.6540,
    "s": 0.7136
  }
}
```

## Required proof-page correction

Replace the existing `measureRef(text, sample, state, targetWidth, kind)` behavior with a natural-size reference:

```js
function measureRef(text, sample, state, kind) {
  var baseSize = 100;
  var targetHeight = kind === "lower" ? state.xh : state.cap;
  ctx.save();
  ctx.font = baseSize + "px " + refFamily;
  var sampleBox = ctx.measureText(sample);
  var sampleHeight = sampleBox.actualBoundingBoxAscent || (kind === "lower" ? 52 : 72);
  var fontSize = baseSize * (targetHeight / sampleHeight);
  ctx.font = fontSize + "px " + refFamily;
  var finalBox = ctx.measureText(text);
  var ascent = finalBox.actualBoundingBoxAscent || (kind === "lower" ? fontSize * 0.52 : fontSize * 0.72);
  ctx.restore();
  return { fontSize: fontSize, ascent: ascent, width: finalBox.width };
}
```

and call it without `targetWidth`. The red reference must never be multiplied by `targetWidth / measuredWidth`.

Also replace the reference stack with Futura-only detection:

```js
var refFamily = '"Futura Medium","Futura"';
var hasFuturaReference = document.fonts && (
  document.fonts.check("16px Futura Medium") ||
  document.fonts.check("16px Futura")
);
```

If `hasFuturaReference` is false, do not draw red filled glyphs. The fallback should be explicit, not silent.
