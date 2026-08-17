# Target Contract

## Import Transaction

```text
PSD File
  -> validate kind, byte size and declared dimensions
  -> decode to immutable normalized document
  -> save current work
  -> activate decoded work with a fresh gallery id
  -> persist complete record
  -> hide gallery/open editor
```

Decode happens before current state changes. A failure before final persistence
writes no incomplete gallery record and restores the prior active document.
Every async step carries an operation token so an older import cannot replace a
newer New/Open/import action.

## Normalized Document

The decoder output contains document width, height, DPI, optional composite and
an ordered tree of groups and layers. A layer carries local bounds, RGBA bytes,
visibility, opacity, blend mode, clipping, lock flags, optional alpha mask and
normalized non-destructive effects. Unknown metadata is listed in warnings.

Groups retain nesting, order, open/closed state, visibility, opacity and blend
mode. Their order is derived from the decoded tree, not reconstructed from
names or flat section markers.

## Compatibility Rules

- Raster, text, vector and smart-object layers use their PSD-rendered bitmap.
- Bitmap and vector masks use the decoder-provided raster mask; mask offset,
  default colour, density, feather and disabled state are retained when present.
- Per-pixel alpha is exact for all non-zero byte values.
- Clipping and transparency protection map to ProDraw clipping/alpha lock.
- Blend modes use the complete normalized enum. A mode without a native Canvas
  operation uses the pure RGBA compositor rather than silently becoming normal.
- Equivalent ProDraw effects stay editable. Parsed effects without an equivalent
  remain serialized in PSD metadata and produce a localized compatibility entry.
- Pattern resources that the decoder cannot expose are named as unsupported;
  the PSD-provided document composite may be used for comparison, not as a
  hidden replacement for the editable layer tree.

## Limits

Byte size, dimensions, pixel count and layer count come from `src/config`.
Declared allocations are rejected before raster allocation. Decode errors and
compatibility warnings are data, not uncaught exceptions or console-only text.
