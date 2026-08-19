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

The following legacy behaviours are intentionally absent:

- image pixelization/conversion into pixel art;
- Pixel Perfect;
- the separate toolbar stabilization toggle, because stabilization belongs to
  each brush preset;
- the tilemap/tileset suite: tile library and palette, variants, cell selection,
  map creation/edit/export and layer conversion.

The main toolbar Tile Mode remains in scope as seamless 3×3 canvas preview and
wrapped drawing. Animation and every other non-excluded workflow remain in
scope.
A visible button is not parity: its action must change RGBA/document state,
produce one coherent Undo transaction where applicable, survive save/reopen and
have a behavioural test.

The tilemap/tileset suite and its dedicated layer action are removed by user
decision on 2026-08-17. Old records open as ordinary pixel layers from their
cached RGBA raster; tilemap metadata and document tileset libraries are retired.

## Parity inventory

| Surface | Required legacy behaviour | Target owner | Status |
| --- | --- | --- | --- |
| Shell | translucent top bar, exact SVG language, movable tool panel, Procreate brush bar, status | `UI-R` | original live; typed wiring pending |
| Floating UI | movable/resizable layers, palette, brush, font, preview, reference and settings panels | `UI-R` | original live; typed wiring pending |
| Gallery | documents/folders in one grid; open, immediate empty-file persistence, select, stack, duplicate, rename, delete and thumbnails | `F7` | gallery-first boot and full Open/New lifecycle hardened; RGBA port pending |
| Documents | New/Open/Save/Save As, dirty guard, recovery, recent directory and presets | `F2`, `F7` | partial |
| Import | photo/file insert or new document, positioning and rotation; no pixelizer | `F7`, `F8` | missing |
| Export | PNG, PSD, selected layers/folders, whole canvas/by contour and separate files | `F7`, `F8` | effect-aware quick PNG and bounded folder PNG tree restored; structural Save as Canvas/typed port partial |
| Brushes | original compact grid, circular engine previews with names, drag, Edit/Duplicate/Delete, `.brush`, Studio and sources | `F4` | original shell + typed Studio live; RGBA owner pending |
| Brush bar | vertical size/opacity, eyedropper, undo/redo and live value popover | `UI-R`, `F5` | original live; RGBA port pending |
| Colour | wheel/SV, HEX, previous/current, history, palettes, used colours, shading and T/S/G | `F8` | original live; RGBA port pending |
| Layers | folders, multi-select, reorder, visibility, opacity, blend, lock, alpha, clipping and reference | `F7` | original live; RGBA port pending |
| Layer actions | add, duplicate, group, merge, clear, delete, symmetry, effects and contextual save; rows remain 7/7 and the panel grows to the viewport before list scrolling | `F7` | monochrome and contextual layer/folder PNG live; balanced auto-sized panel live; typed port pending |
| Selection | rectangle/lasso, invert, copy/cut/paste/delete/deselect, move/transform and new layer | `F7` | missing |
| Transform | move, scale, rotate, flip, centre and crop without cumulative resampling | `F6` | missing |
| Liquify | immutable-source displacement preview and one high-quality Apply | `F6` | missing |
| Paint tools | Brush, Eraser, Smudge, Fill, Shapes, Dodge and symmetry with raster Undo | `F5`, `F8` | partial |
| View tools | pan, zoom, rotate, tile preview, centre, actual size, visible canvas edge, Preview and Reference | `F6`, `UI-R` | original Preview/Reference live; initial fit/zoom floor repaired, RGBA port pending |
| Text | editable text layers, canvas editor, font import/library, alignment, colour and stretch | `F8` | missing |
| Animation | frame strip, playback, onion skin, frame operations and export | `F8` | missing |
| Input | Huion pressure/tilt/eraser/barrel, touch navigation, shortcuts and panel gestures | `F5`, `F8` | partial |
| Product | RU/EN, themes, settings, Windows package, recovery/error UX and accessibility | `F9` | partial |

## Recovery sequence

### `UI-R0` — freeze the oracle

1. Keep `a040fc4:index.html`, legacy CSS tokens/icons and module-int scenarios as
   read-only reference until every row above is accepted. The exact shell is
   restored in production through `src/main.ts` during the transition.
2. `validate:interface` checks the permanent shell, CSS parts and drag/drop,
   floating-window, resize and reorder wiring.
3. Revoke R2 product acceptance; the engine cutover remains valid, the shell
   cutover does not.

### `UI-R1` — restore the living shell

1. Replace legacy state owners behind the restored top bar, brush bar, floating
   layer/palette windows and gallery without replacing their markup or CSS.
2. Restore the exact requested two-column order: Brush/Eraser, Smudge/Fill,
   Move/Crop, Selection/Lasso, Flip/Symmetry, Shapes/Dodge, Tile/Centre,
   Text/Actual Size.
3. Preserve original tokens, icons, spacing, blur, window movement/resize and
   saved panel positions. Brush Studio stays compact.
4. Wire all already-working document, brush, input, history and view commands to
   their original controls before adding new tool logic.
5. Initial Fit leaves a visible workspace margin and canvas edge; wheel/pinch may
   zoom large FHD/A4/4K canvases below 100% instead of treating 100% as a floor.
6. `VIEW-02` (pending): the toolbar magnifier/Actual Size button cycles through
   predictable 20% zoom steps and never jumps directly from 5% to 50%. Mouse-wheel
   zoom is already correct and must remain unchanged. Test the button sequence,
   displayed value, centring and min/max clamping independently from the wheel.

### `UI-R2` — close behaviour parity

Implement missing rows through `F6..F9`. `src/app.js` is a temporary recovery
bridge, not the target engine; retire it only after each visible workflow has a
typed RGBA owner and parity evidence. Never adapt sparse pixel-grid state into
the RGBA document. Extract pure legacy behaviour where useful, then put mutation
behind typed commands and one document/session owner.

## Verification and commit boundaries

- `docs: record original interface and feature parity recovery`
- `feat: restore the original raster editor shell`
- focused commits per inventory row; no mixed mega-commit
- DOM order and accessibility assertions for every permanent control
- behavioural parity scenarios for every legacy action before marking its row
  done
- gallery Open/New ordering test: a delayed open cannot replace a newer blank document
- gallery-first boot test: the canvas cannot flash before storage recovery completes
- New matrix: gallery `+`, editor command, immediate click during gallery preparation,
  rapid double click, empty-file persistence and IndexedDB reconnect
- startup never opens the newest file behind the gallery; an unfinished stroke is
  cancelled before a document transition and save failure remains visible/retryable
- visual Windows checks at 100%, 125%, 150% and 200% display scale
- full validate, packaged renderer smoke and a fresh install smoke at closure
- R6 may delete the legacy oracle only after every non-excluded row is `done`
