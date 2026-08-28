# Global canvas pan plan

Status: `ready`

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

- `GCP-01`: middle-mouse drag pans the view in every tool and active mode,
  including Crop and Free Transform.
- `GCP-02`: held Space plus left-mouse drag pans in every tool and active mode.
- `GCP-03`: global pan never calls the active tool/mode handler, changes document
  pixels, commits history or exits the active mode.
- `GCP-04`: ordinary Crop left/right gestures and Transform right-click menu keep
  their current meaning; two-finger touch pan/zoom remains unchanged.
- `GCP-05`: pointer cancel, lost capture, blur and Space keyup/blur cannot leave a
  stuck pan or modifier state.

## Change map

1. Add a small core navigation-modifier owner for held Space.
2. Route keyboard Space lifecycle to that owner without changing key rebinding.
3. Give middle mouse and Space+left pan priority before mode dispatch.
4. Add routing tests for Crop, Transform, ordinary tools and preserved gestures.
5. Run focused input tests, check/lint, changed-surface validation and desktop
   packaging.

## Risks and rollback

- Space can be typed in text fields: do not suppress or activate canvas
  navigation while the keyboard target is editable.
- Crop right drag must not become pan; middle/Space are the unambiguous global
  routes.
- The modifier belongs in `core`, avoiding forbidden system-to-system imports.
- Rollback removes the shared modifier and restores the prior pan predicate; no
  persisted document or preference schema changes.

## Completion definition

- Automated tests prove view offsets change and mode handlers do not run for
  middle/Space pan under Crop and Transform.
- Tests prove ordinary Crop/Transform buttons still dispatch as before.
- View-only pan produces no document/history mutation.
- Changed-surface and packaged desktop smoke pass; visual acceptance is user-led.

## Resume Here

- Current stage: `GCP1 — global navigation priority`
- Status: `ready`
- Last completed stage: evidence and contract
- Next action: implement shared Space state and the global pan predicate
- Blockers: none
- Working paths: `src/core`, `src/systems/input`, `src/systems/keyboard`, `tests/input`
- Last checks: gallery memory safety package passed before this stage
- Last updated: 2026-08-28
