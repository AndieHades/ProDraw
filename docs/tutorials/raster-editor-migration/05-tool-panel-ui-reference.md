# Movable Tool Panel UI Reference

Source: user-authored Windows workspace order, 2026-08-16. This is the canonical
tool-panel order; old DOM order and the legacy pixel toolbar are not oracles.

## Shell contract

- The panel is compact, movable and always arranged as two equal tool cells per
  row. Its drag grip is a separate header strip and never consumes a tool cell.
- Dragging the grip moves the complete panel, including Text. Reload/restart
  restores a clamped position; resizing the window cannot strand it off-screen.
- Every tool is rendered from one ordered registry. Text cannot be injected into
  a special first slot or positioned outside the panel like the legacy button.
- Pixel Perfect and a global Stroke Stabilization toggle are absent. Antialiasing
  is the raster default; stabilization remains a saved per-brush Brush Studio
  property and Smudge consumes the selected brush's setting.
- A command appears enabled only after its raster implementation and undo/error
  contract exist. Stage delivery must not disguise inert placeholders as tools.
- A pen/mouse tap or `B` first activates Brush from another tool. Repeating the
  activation opens the compact Brush Library; keyboard auto-repeat does not.
  Pointer-down outside the library closes it, while its trigger and child menus
  remain interactive.

## Exact row order

| Row | Left | Right | Target behavior |
| --- | --- | --- | --- |
| 1 | Brush | Eraser | paint / erase with selected brush engine |
| 2 | Smudge | Fill | brush-shaped smear / contiguous raster bucket |
| 3 | Move | Crop (Canvas Size) | selection/layer transform / document bounds |
| 4 | Selection | Lasso | rectangular / freehand selection |
| 5 | Flip | Symmetry | non-destructive view mirror / drawing assist |
| 6 | Shapes (Rectangle) | Brighten | shape family entry / dodge-style raster tool |
| 7 | Tile Mode | Center | seamless wrap painting / center current content |
| 8 | Text | Actual Size | editable text workflow / exact 100% view |

`Tile Mode` means seamless raster repetition and wrap-around painting. It does
not restore the retired pixel-grid tilemap editor, pixelizer or pixel-perfect
brush mode. `Flip` mirrors the view without resampling until an explicit raster
transform is requested. `Actual Size` sets the viewport to 1:1 and does not
rewrite document pixels.

## Delivery ownership

- `R3`: movable two-column shell, Brush/Eraser/Smudge and registry/order tests.
- `R4`: Move, Crop, Flip and Center through source-preserving transforms.
- `R5`: Fill, Selection, Lasso, Shapes, Brighten, raster Tile Mode, Text and
  Actual Size, plus keyboard/pen accessibility and final exact-order proof.

## Acceptance

- A DOM/order test reads the 16 enabled commands row-major and matches this file.
- Browser smoke drags the panel, reloads, and proves the complete panel kept the
  saved position; Text moves by exactly the same delta as Brush.
- Layout remains two columns at supported Windows window sizes and never overlaps
  a forced-fullscreen Brush Studio because Studio is a compact separate dialog.
- Architecture checks reject Pixel Perfect/global stabilization command IDs and
  reject any panel tool outside the ordered registry.
