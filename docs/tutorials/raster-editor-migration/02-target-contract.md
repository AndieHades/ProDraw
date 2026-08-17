# Target Contract

## Document

`RasterDocument` owns id, name, width/height, DPI, color space, ordered layer
tree, active layer and schema version. A paint layer owns a `RasterSurface`
contract backed by lazy fixed-size RGBA tiles. Transparent untouched tiles are
not allocated. Background colour is document metadata until rasterized.

History stores before/after patches only for changed tiles plus structural
commands for layer-tree edits. Memory budget and eviction policy are explicit.

## Drawing

Pointer adapters emit coalesced `StrokeSample` values: document coordinates,
time, pressure, tilt, twist and pointer kind. Pure stroke planning interpolates
spacing and dynamics. The drawing owner stamps antialiased shape/grain into the
active surface, emits dirty bounds and commits one history transaction per stroke.

Mouse pressure fallback is 1; touch paints only in the selected interaction
mode; pen barrel/eraser commands are configurable.

Stabilization is a pure stateful pipeline over actual coalesced samples. It
exposes StreamLine, trajectory stabilization, motion filtering/expression and
pressure smoothing. Pointer-up flushes the tail to the final actual sample;
dots and short strokes remain visible. Predicted samples may reduce display lag
but are preview-only and are replaced by actual samples before commit.

## Brush preset

A preset stores identity/source/compatibility, shape/grain resources and editable
dynamics. Procreate import maps all supported archive fields and records ignored
fields. Missing Procreate stock resources use named procedural fallbacks and a
visible compatibility status; one broken brush never blocks the catalog.

Bundled brushes load through an explicit manifest generated/validated at build
time. Catalog presence, decoding and an actual RGBA stroke are separate tests.

The library uses ordered brush sets like Procreate: a set rail and the selected
set's brush list/grid. Sets and brushes support create, rename, duplicate,
delete, drag/reorder and pack import/export. Smart views expose Recent and
Favorites without changing canonical ownership. The repository `main` folder
seeds a non-destructive `Main` set exactly once.

On Windows, normal sets are folder-backed under the app-data brush root. Native
brush files live in their selected set directory; create/duplicate write there,
move changes the physical owner directory and set rename updates the directory
atomically. The catalog never treats immutable repository assets as writable.

Smudge is a first-class tool that selects a brush from the same library. Each
dab samples local RGBA pigment and applies strength, pickup/pull, dilution/flow
and pressure dynamics along the stabilized stroke. It respects selection,
mask, alpha lock, layer lock and tile bounds, and commits one history transaction
per gesture. Smudge never resamples or deforms the whole layer as a side effect.

## Canvas presets

Presets are data with pixel width/height and optional physical size/DPI:

- Game screens: 1920×1080, 1920×1200, 2560×1440, 2560×1600, 3840×2160.
- Print at 300 DPI: A5 1748×2480 and A4 2480×3508, both orientations.
- Social: Instagram 1:1 1080×1080, Instagram 3:4 1080×1440 and Reels/Stories 1080×1920.
- Art: 2048×2048 and 4096×4096; custom validates side and pixel budget.

## Image-quality invariant

Viewport zoom/rotation is a matrix over source tiles and cannot enter history.
Display rendering uses device-pixel ratio and never writes preview pixels back.

Transform keeps one immutable source selection/surface; every preview re-renders
source → current matrix. Apply performs one resample using `nearest`, `bilinear`
or `lanczos3`. Cancel restores without any pixel write.

Liquify stores a floating-point displacement field and immutable source bounds.
Each interaction changes displacement only; preview samples the original source.
Apply performs one high-quality source → displaced output pass.

## Desktop and persistence

Electron provides a narrow platform adapter for dialogs, filesystem, clipboard
and packaged lifecycle. Runtime systems never import Electron. Web remains a
development/test adapter. Current-format documents save atomically; a corrupt
document/brush is isolated and reported without losing the rest of the library.

## Observable minimum at cutover

The user can create any required preset, choose a bundled brush, draw pressure-
sensitive colour on a layer, add/reorder/hide layers, undo/redo, pan/zoom/rotate
the view, save/reopen and export exact-size PNG from the Windows build.
