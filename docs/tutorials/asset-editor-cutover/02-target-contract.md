# Target contract

The editor is an asset-preparation workspace. It opens and saves a document
without any brush catalog, source file, selected preset or decoder.

Pencil and Eraser remain as lightweight freehand raster tools. Each retains
configurable size and opacity and offers a hard round or square footprint.
Pencil writes the active color; Eraser clears alpha. The default size is 5 px
and the last selected built-in shape is restored. Neither has pressure, tilt,
smoothing, spacing, external preset, grain, source image, preview or cursor
behavior. They obey the existing editable-layer, selection, tile-wrap, history
and cancellation boundaries.

The colour picker samples the render composite rather than a source layer, so
it sees the visible colour under the pointer. A completed pick makes that
colour active and copies its uppercase HEX value to the clipboard.

The toolbar exposes `Отразить холст по горизонтали`. It changes every stored
raster layer, not only the viewport, and therefore the same mirrored pixels
are persisted and exported. Layer tree metadata is not changed.

The layer-folder context menu exposes a PNG tree export. One directory choice
creates one collision-safe folder named after the selected folder. Every raster
layer in that subtree, including hidden and empty layers, is written as a PNG
with the exact document width and height. Hidden layers render their stored
pixels rather than an empty visibility-filtered canvas. Nested and empty layer
folders become matching directories, with Windows-safe collision-resistant
names. Rendering and writes are sequential; no per-file save dialog is opened.
