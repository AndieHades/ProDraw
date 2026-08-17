# UI and Feature Parity Recovery

- Status: `in_progress`
- Visual oracle: `a040fc4:index.html`
- Behaviour oracle: `a040fc4:src/app.js`, `src/systems/**/*.js` and
  `test/module-int.mjs`
- Trigger: user correction on 2026-08-16: restore the complete original
  interface and every function, not only a reduced raster shell

## Non-negotiable outcome

The TypeScript RGBA engine replaces internals, not the product. The finished
Windows app preserves the original ProDraw shell, panels, icon language,
gallery and workflows while using typed raster commands and tile history.

Only three legacy behaviours are intentionally absent:

- image pixelization/conversion into pixel art;
- Pixel Perfect;
- the separate toolbar stabilization toggle, because stabilization belongs to
  each brush preset.

Tile mode, animation and every other non-pixelizer workflow remain in scope.
A visible button is not parity: its action must change RGBA/document state,
produce one coherent Undo transaction where applicable, survive save/reopen and
have a behavioural test.

## Parity inventory

| Surface | Required legacy behaviour | Target owner | Status |
| --- | --- | --- | --- |
| Shell | translucent top bar, exact SVG language, movable two-column tool panel, Procreate brush bar, status | `UI-R` | missing |
| Floating UI | movable/resizable layers, palette, brush, font, preview, reference and settings panels | `UI-R` | missing |
| Gallery | documents/folders in one grid; open, select, stack, duplicate, rename, delete and thumbnails | `F7` | missing |
| Documents | New/Open/Save/Save As, dirty guard, recovery, recent directory and presets | `F2`, `F7` | partial |
| Import | photo/file insert or new document, positioning and rotation; no pixelizer | `F7`, `F8` | missing |
| Export | PNG, PSD, selected layers/folders, whole canvas/by contour and separate files | `F7`, `F8` | partial |
| Brushes | folder library, Recent/Favourites, drag, duplicate/delete, `.brush`, Studio and sources | `F4` | engine done; shell missing |
| Brush bar | vertical size/opacity, eyedropper, undo/redo and live value popover | `UI-R`, `F5` | missing |
| Colour | wheel/SV, HEX, previous/current, history, palettes, used colours, shading and T/S/G | `F8` | missing |
| Layers | folders, multi-select, reorder, visibility, opacity, blend, lock, alpha, clipping and reference | `F7` | minimal |
| Layer actions | add, duplicate, group, merge, clear, delete, symmetry, effects and contextual save | `F7` | minimal |
| Selection | rectangle/lasso, invert, copy/cut/paste/delete/deselect, move/transform and new layer | `F7` | missing |
| Transform | move, scale, rotate, flip, centre and crop without cumulative resampling | `F6` | missing |
| Liquify | immutable-source displacement preview and one high-quality Apply | `F6` | missing |
| Paint tools | Brush, Eraser, Smudge, Fill, Shapes, Dodge and symmetry with raster Undo | `F5`, `F8` | partial |
| View tools | pan, zoom, rotate, tile preview, centre, actual size, Preview and Reference | `F6`, `UI-R` | partial |
| Text | editable text layers, canvas editor, font import/library, alignment, colour and stretch | `F8` | missing |
| Tile suite | tile mode, palette, variants, selection, map creation/edit/export and layer conversion | `F8` | missing |
| Animation | frame strip, playback, onion skin, frame operations and export | `F8` | missing |
| Input | Huion pressure/tilt/eraser/barrel, touch navigation, shortcuts and panel gestures | `F5`, `F8` | partial |
| Product | RU/EN, themes, settings, Windows package, recovery/error UX and accessibility | `F9` | partial |

## Recovery sequence

### `UI-R0` — freeze the oracle

1. Keep `a040fc4:index.html`, legacy CSS tokens/icons and module-int scenarios as
   read-only reference until every row above is accepted.
2. Add a checked parity manifest so deleting or hiding a legacy workflow cannot
   silently pass validation.
3. Revoke R2 product acceptance; the engine cutover remains valid, the shell
   cutover does not.

### `UI-R1` — restore the living shell

1. Rebuild the original top bar, brush bar, floating layer/palette windows and
   gallery composition around `RasterEditorApp`.
2. Restore the exact requested two-column order: Brush/Eraser, Smudge/Fill,
   Move/Crop, Selection/Lasso, Flip/Symmetry, Shapes/Dodge, Tile/Centre,
   Text/Actual Size.
3. Preserve original tokens, icons, spacing, blur, window movement/resize and
   saved panel positions. Brush Studio stays compact.
4. Wire all already-working document, brush, input, history and view commands to
   their original controls before adding new tool logic.

### `UI-R2` — close behaviour parity

Implement missing rows through `F6..F9`; never load `src/app.js` in production
and never adapt the sparse pixel-grid state into the RGBA document. Extract pure
legacy behaviour where useful, then put mutation behind typed commands and one
document/session owner.

## Verification and commit boundaries

- `docs: record original interface and feature parity recovery`
- `feat: restore the original raster editor shell`
- focused commits per inventory row; no mixed mega-commit
- DOM order and accessibility assertions for every permanent control
- behavioural parity scenarios for every legacy action before marking its row
  done
- visual Windows checks at 100%, 125%, 150% and 200% display scale
- full validate, packaged renderer smoke and a fresh install smoke at closure
- R6 may delete the legacy oracle only after every non-excluded row is `done`
