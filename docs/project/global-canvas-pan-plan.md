# Global canvas pan plan

Status: `done`

- Owner: production canvas input navigation
- Baseline: `aset-editor@a6be244`, 2026-08-28
- Stage: `GCP1`

## Evidence baseline

- `src/systems/input/index.js` starts mouse pan only behind `!S.cropMode`, so
  middle and right mouse buttons cannot pan while Crop is active.
- Free Transform has a narrower tested exception: mouse pan is allowed outside
  its hit frame, while right-click on a hit frame opens the transform menu.
- `src/systems/crop/CropPointerSystem.ts` intentionally owns normal left drag
  for artwork/crop edges and right drag for the crop frame.
- `src/systems/input/gestures.js` already gives two-finger touch pan/zoom priority
  over a one-finger tool gesture in every mode.
- Keyboard tracks held Space only inside the keyboard system; canvas input has no
  shared navigation-modifier contract.

## Target contract

- `GCP-01`: left, middle and right mouse drag can pan in every tool and active
  mode when the pointer is outside that mode's interactive hit region.
- `GCP-02`: middle drag and held Space plus left drag force pan even over an
  interactive hit region.
- `GCP-03`: global pan never calls the active tool/mode handler, changes document
  pixels, commits history or exits the active mode.
- `GCP-04`: ordinary Crop left/right gestures and Transform right-click menu keep
  their current meaning; two-finger touch pan/zoom remains unchanged.
- `GCP-05`: pointer cancel, lost capture, blur and Space keyup/blur cannot leave a
  stuck pan or modifier state.

## Change map

1. Add a small core navigation-modifier owner for held Space.
2. Route keyboard Space lifecycle to that owner without changing key rebinding.
3. Give middle mouse and Space+left pan priority before mode dispatch; expose
   Crop hit testing so every mouse button pans outside its frame.
4. Add routing tests for Crop, Transform, ordinary tools and preserved gestures.
5. Run focused input tests, check/lint, changed-surface validation and desktop
   packaging.

## Risks and rollback

- Space can be typed in text fields: do not suppress or activate canvas
  navigation while the keyboard target is editable.
- Crop left/right keep their authored behavior inside the frame; outside the
  frame they pan like every other mouse button.
- The modifier belongs in `core`, avoiding forbidden system-to-system imports.
- Rollback removes the shared modifier and restores the prior pan predicate; no
  persisted document or preference schema changes.

## Completion definition

- Automated tests prove view offsets change and mode handlers do not run for all
  three mouse buttons outside Crop/Transform or middle/Space forced pan inside.
- Tests prove ordinary Crop/Transform buttons still dispatch as before.
- View-only pan produces no document/history mutation.
- Changed-surface and packaged desktop smoke pass; visual acceptance is user-led.

## Completion record

- Crop exposes its real frame hit region to the shared input dispatcher.
- All three mouse buttons pan outside Crop/Transform hit regions; middle mouse
  and `Space+ЛКМ` override an active hit, including with a pen primary contact.
- Crop left/right and Transform context behavior remain mode-owned inside.
- Checks: focused input 4 files/14 tests; changed-surface 96 files/286 tests;
  typecheck, lint, docs, lines, architecture, cycles and shell gates; packaged
  Windows desktop smoke passed.
- Commit: `feat: make canvas pan global across modes`.

## Follow-up 2026-08-31

- Исправлен cutover-дефект: нативный `PointerEvent` больше не копируется через
  object spread; button/client coordinates сохраняются явно.
- Реальный mouse route снова панорамирует и открывает layer picker коротким ПКМ.
- Gallery/page exit сбрасывают view в centered fit; Crop завершает Transform/Move.
- Commit: `fix: restore canvas navigation lifecycle`.

## Resume Here

- Current stage: complete
- Status: `done`
- Last completed stage: `GCP1 — global navigation priority`
- Next action: user acceptance with preferred mouse/pen/touch navigation
- Blockers: none
- Working paths: `src/core`, `src/systems/input`, `src/systems/keyboard`, `tests/input`
- Last checks: focused input/lifecycle 21/21; changed-surface 120 files/355 tests;
  live browser mouse route; packaged Windows desktop smoke passed
- Last updated: 2026-08-28
