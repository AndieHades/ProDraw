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

- Stage commits: pending
- Automated checks: pending
- Packaged Windows smoke: pending
- Manual checks: physical Photoshop panel and physical Explorer tree are named
  supplements; any skip will be recorded with the exact unrun profile.
