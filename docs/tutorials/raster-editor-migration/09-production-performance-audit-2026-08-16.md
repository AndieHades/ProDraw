# Production Performance Audit: 2026-08-16

- Status: audit `complete`; `F3-R1..F3-R5` implemented and release gates passed
- Baseline: `main@cea5370`, restored-interface worktree
- Runtime inspected: `index.html` → `src/legacy-entry.js` → `src/app.js`
- Scope: brush selection/cursor, drawing history, effects, adjustments and
  other commands with the same whole-document latency defect

## Why the old F3 evidence is no longer sufficient

F3 proved budgets for the typed tile runtime. Interface recovery temporarily
reconnected the old grid-compatible systems so the user could keep the original
gallery, layers, palette and draggable panels. Their storage and interactive hot
paths are now sparse/bounded, but that compatibility shell remains the shipping
path and the old F3 gates do not execute it. F3 remains historical evidence for
the target engine; R2 acceptance stays open until `R2.11` removes the bridge.

Canvas dimensions used by every gate:

| Preset | Pixels at 300 DPI | Pixels |
| --- | ---: | ---: |
| A5 portrait | 1748×2480 | 4,335,040 |
| A4 portrait | 2480×3508 | 8,699,840 |

A4 is the larger stress fixture. A small 64×64 fixture remains mandatory so a
fixed command overhead cannot hide behind document-size comparisons.

## Confirmed defects

### `LPERF-01` — full-document history for local and metadata commands

There are 109 production `snapshot()` calls in 47 JS modules. A snapshot clones
every cell of every layer, including transparent cells. On one empty A4 layer,
`blank()` took about 103 ms and one `cloneGrid()` about 620 ms with roughly
62 MiB of additional heap. Ten sparse A4 layers can therefore create hundreds
of MiB for a rename, visibility toggle, effect parameter or first adjustment
dab.

Affected families include effects, layer/folder metadata and drag order,
Brightness/Contrast, Monochrome, Recolor, Fill, selection edits, transforms,
text properties and old tile operations. Pixel/tile-only features are retired
instead of receiving a second optimization implementation.

### `LPERF-02` — effects allocate and scan the canvas, not the artwork

On sparse A5 artwork occupying only 128×128 pixels:

| Operation | Measured time |
| --- | ---: |
| Open Stroke preview | 1.77 s |
| Stroke slider 1→8 | 3.06 s |
| `maskFromGrid` | 0.46–0.84 s |
| Stroke size 4 | up to 6.77 s |
| Glow size 16 | 0.32 s |
| Drop Shadow size 8 | 0.61 s |
| Monochrome layer | 0.31 s |
| First Monochrome adjustment dab | 0.16 s |

The legacy kernels create nested `boolean[H][W]`, full `Float32Array(W×H)`,
coordinate-object lists and full canvases/ImageData. Stroke rescans every
canvas pixel once per radius step. A draft effect also disabled the composite
cache, so an unrelated cursor move repeated the work.

### `LPERF-03` — cold brush selection competes with all previews

Opening the compact library scheduled production decoding for all 12 tiles.
PNG coverage extraction and 2048² Grain resampling ran on the UI thread, while
the selected brush waited behind background work.

| Cold selection | Ready | Longest UI task |
| --- | ---: | ---: |
| Lineart | 89–151 ms | up to 117 ms |
| Net Screentone | 0.72 s | 0.40 s |
| Gundersen | 1.22 s | 0.40 s |
| Pencil Waxy | 1.42 s | 0.53 s |

A 500 px exact cursor mask added about 116 ms for Big Soft. Presentation cursor
resolution may be bounded, but paint resolution and authored Shape/Grain may
not be reduced.

### `BRH-REG-01` — Lineart geometry was synthesized as a square

Lineart and Lineart Long do not embed `Shape.png`; they reference Procreate's
unavailable `Brush-Pocket-Brick.png`. A temporary superellipse approximation
made diagonal corners opaque and produced the square stamp visible in the
library and on canvas. The previous known-good behavior is a radial fallback,
and real raster pixel goldens must guard it because settings-only hashes did
not detect the regression.

## Repair plan (`F3-R`)

1. **Correctness before optimization.** Restore Lineart's radial fallback,
   retain honest missing-resource diagnostics and add real RGBA goldens.
2. **Presentation budget.** Bound only the contour cursor representation,
   cache it by brush/input bucket and preserve exact paint dabs.
3. **Brush scheduling.** Load a clicked brush with foreground priority; observe
   only visible preview tiles; cancel work on close; move archive decode and
   Grain preparation behind a worker-capable port and cache by archive hash.
4. **Local transactions.** Use touched-cell/tile patches for Brush, Eraser,
   Smudge, adjustment brushes, Monochrome/Recolor and other raster mutations.
   Effect/layer metadata uses descriptor patches and never clones RGBA.
5. **Bounded effects.** One flat alpha-region/tile contract owns Stroke, Glow
   and both shadows. Work is limited to content bounds plus effect halo; draft
   rendering is revision-cached and obsolete preview generations are dropped.
6. **Bulk commands.** Replace string-coordinate selections and whole-grid live
   backups with tiled masks, allocated-tile visitors and cancellable chunks.
7. **Cutover.** Keep the original DOM and drag/drop behavior, but make the typed
   `RasterSurface`/`RasterEdit`/`TileHistory` owners authoritative. Remove the
   temporary grid bridge only after parity tests prove every retained command.

Steps 1–6 and the bounded P1 remaps are implemented. Step 7 is now the active
`R2.11` cutover and remains the acceptance condition for R2.

## Implemented repair evidence

The first production recovery slice now covers the shared defects rather than
special-casing A5:

- Lineart and Lineart Long use the previous radial fallback when Procreate's
  private `Brush-Pocket-Brick.png` is unavailable. Real RGBA goldens reject the
  square-tip regression, and all 12 bundled brushes match the scalar renderer.
- Native 2048² Grain sources are retained. Screentone and Net use authored
  logical repeat scaling instead of the former blurred, two-times-coarse tile.
- The cursor is an unfilled contour of the same dab alpha used by painting;
  holes and disconnected islands remain visible, while its presentation mask
  is bounded and cached.
- Brush archives decode through a worker-capable platform port. Visible preview
  tiles are scheduled lazily, a clicked brush has foreground priority and
  closing the library cancels queued presentation work.
- Brush, Eraser, Smudge and adjustment input use cancel-safe pixel patches;
  metadata, effects, layer topology and ordinary raster transforms have scoped
  history entries instead of cloning every layer.
- Layer upload and simple-stack composite damage are bounded. Cursor-only
  frames reuse the composite; Preview 1:1 consumes that same result; used-color
  scans are revision cached and never run in the middle of a stroke.
- Stroke, Glow, Drop Shadow and Inner Shadow use content bounds plus halo. The
  A4 structural gate produced a 48×48 scratch region in about 3 ms instead of
  allocating an 8,699,840-pixel mask.
- Autosave begins only after a committed stroke, yields while cloning legacy
  rows, is cancelled by a newer edit and builds a maximum-512-side preview.

The post-repair residual audit reopened three P0 families before packaging:

1. Selection inversion and irregular masks must use compact rectangles,
   complement state and tiled bits, never millions of coordinate strings.
   Marching-ants dashes use a configurable larger, quieter visual cadence.
2. Live text rasterization must allocate ImageData only for the transformed,
   clipped text box; font and frame edits need text-reference history.
3. Free Transform preview must render content bounds plus effect halo and Apply,
   Cancel, Undo and Redo must swap raster references without a document clone.

All three are now closed by `F3-R1` and `F3-R2`. Full-canvas output work that is
inherently proportional to the requested result (for example exporting a
filled A4) remains allowed, but must be chunked or outside pointer/slider
frames. Tilemap/pixelizer-only paths are excluded because `CUT-01` removes them.

## Second residual pass and recovery boundaries

The second pass searched every remaining production `snapshot()`, dense grid
allocation and full-size canvas/readback. It separates interactive overhead
from work that must actually produce a filled output:

- `F3-R1` — compact selection is implemented. Invert stores a complement plus
  sparse 32×32 bit tiles; move/resize/copy/paste/flip/rotate use bounded COW and
  raster-reference history. Ants use 12 px dashes, 8 px gaps, 1.75 px width and
  a 1200 ms screen-space cycle; an inverted A4 fixture emits eight merged SVG
  segments instead of millions of coordinate strings.
- `F3-R2` — bounded text and transform are implemented. Text ImageData covers
  only the transformed box, edits copy only damaged rows, and explicit
  text-to-pixel, Free Transform Apply/Cancel and Undo/Redo preserve exact
  references without document snapshots.
- `F3-R3` — bounded effect surfaces are implemented. Layer, folder,
  move/floating/clipping preview and Convert to Layer exchange
  `{canvas, bounds, origin}`; only export/PSD explicitly materialize a complete
  output surface when the requested result requires it.
- `F3-R4` — sparse Array-compatible layer backing is implemented. A new blank
  A4 layer allocates zero rows/cells, while duplicate/paste retain exact bounds
  and use copy-on-write so later edits do not alias source pixels.
- `F3-R5` — Palette from Canvas samples the committed composite through a
  configurable preview bounded to 156×220 before ImageData readback and
  quantization.

The bounded P1 output-remap work is also implemented: layer/folder merge uses a
local bake plus structure history; crop/trim/rotate use document-remap patches,
and flip/center swap raster references. Sparse A4 focused timings were about
7–8 ms for Crop, 1–2 ms for Trim and about 2 ms for Rotate/Flip/Center.

The remaining architectural boundary is `R2.11`: typed tiled `RasterSurface`
replaces the grid bridge instead of accumulating feature-specific compatibility
paths. Fully filled output remains proportional to real produced pixels.

## Confirmed implementation checks

These are the focused, compatibility and aggregate results from the shared
repair run:

- 22 brush and 20 bounded effects/bulk/autosave/render checks passed.
- Focused recovery suites passed: selection 11, text 16, transform 11,
  text callers 22, palette 3, sparse backing 18, effect surfaces 21, document
  remap 8 and layer merge 12.
- The retained oracle passed 128 legacy unit tests, storage, 434 module
  integrations and module boot. The corrected selection-history case reran 2/2.
- Type check, lint, line limit, cycle, architecture, docs and interface-parity
  validators passed during the slice.
- The aggregate TypeScript suite passed 80 files/202 tests; the sequential
  performance suite passed 17 files/52 tests.
- `npm run validate` passed, including the production bundle. Fresh Windows
  packaging and packaged smoke passed with 12 brushes, 8 sources and alpha 255.
- Still pending: a physical Huion trace; automated PointerEvent pressure and
  tilt coverage cannot replace the connected-device acceptance check.

## Verification matrix

- **64×64 correctness:** byte-identical Apply/Undo/Redo, Cancel/no-op history,
  effect equivalence including holes/islands/edges, Lineart raster goldens.
- **Sparse A5:** effect work is proportional to content bounds plus halo;
  cursor-only frames perform zero effect/composite rebuilds.
- **Sparse A4, 10 layers:** metadata commands copy zero raster bytes; a local
  stroke/adjustment stores only touched patches; Stroke/Glow scratch allocation
  is independent of 8,699,840 canvas pixels.
- **Filled A4:** long work is chunked/cancellable, no main-thread slice exceeds
  the approved frame budget, and history remains under the byte budget.
- **Packaged Windows:** choose every bundled brush, draw on A4, move effect
  sliders, Apply/Cancel/Undo, run Monochrome and verify Huion input manually.

Wall-clock checks are paired with structural counters: processed pixels,
allocated scratch bytes, raster bytes copied into history, cache hits and
cancelled preview generations. A faster machine must not conceal O(canvas)
work.
