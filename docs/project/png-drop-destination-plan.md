# PNG drop destination plan

- Status: `in_progress`
- Owner: production import system (`src/systems/import`)
- Baseline: `aset-editor@7f25fb7`, 2026-08-27
- Stage: `PDD1`

## Evidence baseline

- `src/systems/import/index.js` currently routes every dropped PNG through
  `gallery.importDrop`, including drops over an open editor canvas.
- `src/systems/gallery/index.js` already creates a native-size editable PNG
  document and retains its desktop source path for ordinary Save.
- `insertImageTop` already snapshots history, inserts a natural-pixel image as
  the top layer, centres it without resizing the current canvas and retains
  overflow in the layer's `ext` storage.
- `tests/system/sourceFileDrop.test.js` currently proves only the unconditional
  separate-document PNG route.

## Target contract

- `PDD-01`: dropping PNG over the gallery continues to create and open a new
  native-size document immediately, without an extra choice.
- `PDD-02`: dropping PNG over an open editor shows one localized modal choice:
  `New document`, `Add as layer`, or `Cancel`.
- `PDD-03`: `New document` uses the existing gallery import transaction and
  keeps the dropped PNG source path for later Save.
- `PDD-04`: `Add as layer` decodes the PNG at natural resolution, inserts it as
  the top layer named after the file, leaves canvas dimensions unchanged and
  does not replace the current document's source format/location.
- `PDD-05`: the layer insertion uses the existing snapshot/history boundary;
  oversized pixels remain recoverable through `ext`, and layer-limit/decode
  failures leave the current document intact with localized feedback.
- `PDD-06`: cancellation performs no import. A second PNG drop replaces any
  unresolved choice instead of leaving multiple pending dialogs.
- `PDD-07`: PSD drop behavior remains unchanged and opens a separate document.

## Change map

1. Add a small typed presenter for the PNG destination modal and localized
   static markup using existing dialog/theme primitives.
2. Split PNG drop routing in `src/systems/import/index.js` by gallery/editor
   context and selected destination; reuse `insertImageTop` for the layer path.
3. Extend source-drop tests for gallery, new-document, layer, cancel and modal
   interaction while retaining source-binding assertions.
4. Mark the old unconditional `QED-01` PNG rule as superseded for editor drops.

## Verification

- Focused Vitest for PNG drop routing and choice presenter.
- `npm run check`, targeted ESLint, docs and line validation.
- `npm run validate:changed` and `git diff --check`.
- `npm run package:desktop`, including renderer smoke.
- Visual acceptance remains user-owned; no screenshot QA is planned.

## Completion definition

- Gallery and editor drops follow their distinct contracts.
- All three modal outcomes are covered without changing PSD behavior.
- Current document pixels, history and source binding are protected on layer
  insertion, cancellation and failure.
- Checks and implementation commit are recorded below.

## Resume Here

- Current stage: `PDD1`
- Status: `in_progress`
- Last completed stage: evidence and target contract
- Next action: implement the PNG destination presenter and route
- Blockers: none
- Working paths: `src/systems/import`, `src/ui`, `src/i18n`, `index.html`,
  `tests/system/sourceFileDrop.test.js`, `docs/project/png-psd-quick-edit-plan.md`
- Last checks: pending
- Last updated: 2026-08-27
