# Verification

## Required gates

| Surface | Command or assertion |
| --- | --- |
| PSD export structure | generated PSD decode plus existing PSD suite |
| PNG path plan | focused pure tests for nesting, hidden leaves and collisions |
| desktop tree writer | temp-root begin/write/commit/abort and confinement tests |
| menu/orchestration | focused module integration dispatch and output assertions |
| viewport sampling | pure threshold plus live render-state assertion |
| types/imports | `npm run check`, targeted ESLint, `validate:cycles` |
| docs/limits | `validate:docs`, `validate:lines`, task-owned diff read |
| product bundle | `npm run build:bundle`; packaged smoke for desktop IPC |
| every commit | `git diff --check`, task-owned staged diff read |

## Acceptance matrix

| Requirement | Positive evidence | Failure/negative evidence |
| --- | --- | --- |
| `LEP-PSD-01` | superseded by physical Photoshop fixture | decoder was not the panel oracle |
| `LEP-PSD-02` | decoder accepts exported RGB PSD | no byte patch in test |
| `LEP-PNG-01` | third folder RMB action dispatches | layer RMB hides it |
| `LEP-PNG-02` | nested full-canvas PNG tree | one picker, no flat downloads |
| `LEP-PNG-03` | hidden/Unicode/effect leaves included | collisions safely suffixed |
| `LEP-PNG-04` | staged commit publishes unique root | cancel/abort publishes none |
| `LEP-VIEW-01` | filtered zoom-out | 100% exact |
| `LEP-VIEW-02` | filtered zoom-in | source unchanged |
| `LEP-PSD-03` | Photoshop-validated bottom-first descriptors | decoder convention cannot reverse raw order |
| `LEP-EXP-01` | render/encode/save interleave | no retained output blob collection |
| `LEP-EXP-02` | awaited single UI run | failure keeps editor active |

## Final record

- Stage commits: `664e54f` plan, `19a9d9d` PSD order, `941f2ff` PNG tree and
  `d070ac7` viewport downscale.
- Automated checks: full `npm run validate` passed — 118 legacy unit tests, 398
  module integration tests, 105 non-performance files/283 tests and 18
  performance files/55 tests, followed by docs, limits, architecture, cycles,
  cutover, desktop, catalog and production bundle gates.
- Cutover result: 490 production modules, 281 source JavaScript modules and 175
  legacy-state JavaScript modules; the new file writer is strict TypeScript.
- Packaged Windows smoke: passed after the TypeScript cutover; renderer ready
  with 12 brushes, 17 sources and alpha 255.
- Zoom-in follow-up: policy and live render assertions pass at 200%, source
  bytes remain unchanged, and the Vite browser smoke reaches a filtered 200%
  view through the real zoom command.
- Manual checks remaining: reopening a corrected production PSD in physical
  Photoshop, choosing a real destination in the Explorer picker and subjective
  scaled-view inspection on the user's display. The raw-order fixture was
  physically checked in Photoshop; generated-PSD decode, temporary-filesystem
  transaction tests, live renderer sampling assertions and a Vite browser smoke
  cover deterministic parts.
- Non-blocking build warning: the existing production bundle still contains
  chunks larger than 500 kB.

## Reopened regression record

- `LEP1` is superseded: Photoshop 2026 accepted the bottom-first fixture and
  rejected the top-first hierarchy as the intended order.
- The full separate-export path retained all canvases and blobs; `LEP5` replaces
  it with bounded sequential processing.
- `LEP4`: 398 module integration tests; 11 PSD files / 53 tests; TypeScript,
  targeted ESLint and the 282-source cycle gate passed. Raw descriptors now
  match the Photoshop-selected bottom-first fixture recursively.
- `LEP5`: 400 module integration tests and 13 focused files / 57 tests passed,
  including render/encode/save ordering, lightweight results, UI re-entry and
  failure/editor-state regression. Targeted ESLint, docs, lines, 282-source
  cycles and the production bundle passed.
- Full TypeScript check is externally blocked by tuple-width errors in the
  unrelated in-progress brush files `brushArchiveSettings.ts` and
  `procreateBrush.ts`; no repair files are implicated.
