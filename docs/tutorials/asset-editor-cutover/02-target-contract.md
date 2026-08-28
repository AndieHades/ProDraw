# Target contract

The editor is an asset-preparation workspace. It opens and saves a document
without any brush catalog, source file, selected preset or decoder.

Pencil and Eraser remain as lightweight freehand raster tools. Each retains
configurable size and opacity and offers a hard round or square footprint.
Pencil writes the active color; Eraser clears alpha. The default size is 5 px
and the last selected built-in shape is restored. Neither has pressure, tilt,
smoothing, spacing, external preset, grain, source image, preview or cursor
asset behavior. Their size/shape boundary remains visible under the pointer while
a stroke is being drawn. They obey the existing editable-layer, selection,
tile-wrap, history and cancellation boundaries.
Choosing Pencil or Eraser while Free Transform is active applies the current
transform and closes its frame before the paint tool becomes active. The same
transition contract applies to toolbar buttons, hotkeys and pen-button routing.
While Free Transform remains active, its toolbar button is the only primary tool
shown as active; the remembered Pencil, Eraser, or shape tool is not highlighted.
The remembered paint-tool boundary is also hidden while Transform owns canvas
input and returns only after Transform closes.
Applying or cancelling Free Transform restores that remembered tool instead of
forcing Pencil; its toolbar icon becomes active again immediately.
While Free Transform remains active, dragging outside its frame with either the
left or right mouse button pans the canvas without applying or cancelling the
transform. Inside the frame, left drag controls Transform and right click opens
its context menu.

Dropping a PNG or PSD over either the gallery or the open editor creates and
opens a separate gallery document immediately. PNG keeps native RGBA pixels in
one editable layer; PSD keeps its imported editable tree. In the Windows app the
document remembers the dropped file path, and ordinary Save atomically writes
the visible full-canvas PNG composite or layered PSD back to that same path.
Gallery autosave remains a separate recovery copy and retains the source binding.

The colour picker samples the render composite rather than a source layer, so
it sees the visible colour under the pointer. A completed pick makes that
colour active and copies its uppercase HEX value to the clipboard.

The toolbar exposes `Отразить холст по горизонтали`. It changes every stored
raster layer, not only the viewport, and therefore the same mirrored pixels
are persisted and exported. Layer tree metadata is not changed.

The staged PNG-tree writer established by AE6 is now reached through either
whole-canvas or cropped PNG in the layer context menu, as specified by
[`LPX1`](../../project/layer-png-selection-export-plan.md). A folder or multiple
selection opens one directory session and writes every descendant layer while
preserving nested and empty folders. Whole-canvas leaves keep document size;
cropped leaves use individual final alpha bounds. Hidden layers render stored
pixels rather than an empty visibility-filtered canvas. Paths remain Windows-
safe and collision-resistant, writes stay sequential, and no per-file save
dialog is opened.
