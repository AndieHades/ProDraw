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
| `LEP-PSD-01` | decoded nested rows top-first | composite stack not reversed |
| `LEP-PSD-02` | decoder accepts exported RGB PSD | no byte patch in test |
| `LEP-PNG-01` | third folder RMB action dispatches | layer RMB hides it |
| `LEP-PNG-02` | nested full-canvas PNG tree | one picker, no flat downloads |
| `LEP-PNG-03` | hidden/Unicode/effect leaves included | collisions safely suffixed |
| `LEP-PNG-04` | staged commit publishes unique root | cancel/abort publishes none |
| `LEP-VIEW-01` | filtered zoom-out | 100% exact, source unchanged |

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
- Manual checks not run: reopening the PSD in physical Photoshop, choosing a
  real destination in the Explorer picker and subjective downscale inspection
  on the user's display. Generated-PSD decode, temporary-filesystem transaction
  tests and live renderer sampling assertions cover their deterministic parts.
- Non-blocking build warning: the existing production bundle still contains
  chunks larger than 500 kB.
