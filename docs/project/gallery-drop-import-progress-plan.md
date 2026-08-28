# Gallery drop import progress plan

- Status: `in_progress`
- Owner: production import routing (`src/systems/import`)
- Baseline: `aset-editor@936a5bd`, 2026-08-27
- Stage: `GDP1`

## Evidence baseline

- `src/systems/import/index.js` owns window drop routing and can distinguish a
  gallery drop before choosing the image or PSD action.
- `src/systems/gallery/index.js` starts ordinary image decoding with `Image`
  callbacks and currently returns before decoding, document creation and save
  complete.
- `src/systems/import/editor.js` awaits PSD decode and the transactional gallery
  document route, but neither operation publishes a visible busy state.
- Large sparse PSD imports can spend seconds decoding and materializing layers,
  so a successful long operation currently looks indistinguishable from a hang.

## Target contract

- `GDP-01`: every supported file dropped while the gallery is open starts one
  import-progress session immediately, without changing editor-side imports.
- `GDP-02`: imports completed in at most two seconds never flash a progress UI.
  If the same session is still active after two seconds, a modal gallery status
  appears and remains visible until that session succeeds or fails.
- `GDP-03`: the status contains the filename, localized current stage, an
  accessible progress bar and the percentage of completed pipeline stages.
  A moving highlight communicates activity during an opaque decoder stage; the
  UI must not claim a time estimate that the browser or PSD decoder cannot give.
- `GDP-04`: stages are monotonic: checking, decoding, preparing the document,
  saving in the gallery, opening, complete. A late callback from an older drop
  cannot regress or close the current session.
- `GDP-05`: ordinary image import becomes awaitable through decode, document
  creation and persistence. PNG source binding and PSD transactional behavior
  remain unchanged.
- `GDP-06`: success reaches completion and closes the status; decode, save or
  open failure closes it and retains the existing localized failure feedback.

## Change map

1. Add a typed gallery-import progress presenter, a two-second config threshold,
   localized copy, static accessible markup and gallery-owned theme-token CSS.
2. Wrap gallery-only drop routes with one progress session and pass its reporter
   through the existing action boundary.
3. Make ordinary gallery image import return a promise and report lifecycle
   stages; let the existing PSD command report the same lifecycle.
4. Add focused tests for delayed visibility, monotonic/stale sessions, awaited
   image completion, PNG/PSD routing and failures.

## Verification

- Focused Vitest for gallery progress and drop routing.
- `npm run check`, targeted ESLint, docs, lines, architecture and cycle checks.
- `npm run validate:changed` and `git diff --check`.
- `npm run package:desktop`, including packaged renderer smoke.
- Visual acceptance remains user-owned; no screenshot QA is planned.

## Completion definition

- A gallery drop still running after two seconds has an observable, accessible
  progress bar until its actual terminal result.
- Fast imports have no progress flash, overlapping sessions are isolated and
  failures do not leave the gallery blocked.
- PNG/PSD document identity, pixels and persistence contracts remain green.
- Implementation commit and verification evidence are recorded below.

## Resume Here

- Current stage: `GDP1 — delayed gallery-drop progress`
- Status: `in_progress`
- Last completed stage: evidence and target contract
- Next action: implement the progress presenter and awaitable gallery routes
- Blockers: none
- Working paths: `src/systems/import`, `src/systems/gallery`, `src/ui/import`,
  `src/i18n`, `src/styles`, `src/config`, `index.html`, `tests`
- Last checks: pending
- Last updated: 2026-08-27
