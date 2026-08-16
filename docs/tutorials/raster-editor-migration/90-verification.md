# Verification and Final Acceptance

## Stage gates

| Stage | Focused evidence | Other commands |
| --- | --- | --- |
| `R0` | links, metadata and diff review | `validate:docs`, `validate:lines`, `git diff --check` |
| `R1` | TS/platform/validator tests, packaged-shell smoke | check, lint, cycles, build, desktop package |
| `R2` | tile/history/brush/preset integration and save round trip | check, lint, focused tests, browser + desktop smoke |
| `R3` | golden stroke plans, Brush Studio persistence, tablet matrix | check, lint, performance profile |
| `R4` | source hash, resampler and preview-equivalence tests | check, lint, worker/browser smoke |
| `R5` | full document round trip and failure recovery | validate, build, desktop package |
| `R6` | source-removal/doc consistency and final scenario | full validate/build/package |

## Acceptance matrix

| Requirement | Positive scenario | Negative/failure scenario |
| --- | --- | --- |
| `RST-01` | antialiased RGBA stroke persists | no grid is allocated or serialized |
| `BRH-01` | every bundled entry paints distinct non-empty output | one corrupt archive does not block catalog |
| `BRH-02` | dynamics change preview and document identically | invalid values clamp; unsupported fields are disclosed |
| `BRH-03` | set folders/order/recent/favorites and physical ownership survive restart | create/duplicate/move/delete cannot orphan, overwrite or target the wrong directory |
| `BRH-04` | reference hierarchy, sections, live pad and draft Apply match chapter 04 | Wet Mix, Color Dynamics, Materials and Apple Pencil are absent |
| `STB-01` | recorded shaky traces smooth while endpoints/corners remain | dot, short stroke and predicted preview cannot vanish or commit ghosts |
| `SMG-01` | stabilized brush mixes a controlled local colour fixture | lock/mask/selection and dirty bounds prevent outside mutation |
| `HUI-01` | Huion/Windows Ink trace calibrates pressure, tilt and mapped buttons | missing device identity or optional tilt never invents values or blocks drawing |
| `CAN-01` | every named preset exports exact dimensions/DPI | over-budget custom size is rejected before allocation |
| `IMG-01` | direct and multi-preview final results match | cancel/view operations never change source hash |
| `DSK-01` | packaged app receives pressure/tilt | mouse/touch fallback stays usable and deterministic |
| `DOC-01` | layer/mask/select/undo survives reopen | lock/mask/history failure cannot partially commit |
| `IO-01` | atomic save/reopen/export preserves composite | corrupt/interrupted record preserves last good data |
| `ARC-01` | strict TS and legal dependency graph pass | fixtures prove bad import/any/line count fail |
| `OPS-01` | hooks/docs/plan resume a stage from repo state | stale checkpoint is detected against HEAD/status |
| `CUT-01` | production graph has no pixel runtime | legacy save import cannot reintroduce grid ownership |
| `UX-01` | RU/EN and pen/touch/keyboard paths expose core actions | missing key/token fails validation |

## Performance budgets to establish in R2

- pointer handler does bounded work and coalesces samples;
- history memory is proportional to dirty tiles, not document area;
- untouched A4/4K layers allocate metadata only;
- long strokes do not grow retained transient state after commit/cancel;
- preview quality may adapt, but final Apply/export uses the selected exact filter.

## Final observable scenario

On a clean Windows install: create A4 300 DPI, choose each bundled brush, draw
with pen pressure/tilt, add and mask layers, rotate/zoom view, transform and
Liquify through many previews, save/restart/reopen, then export exact-size PNG.
Source-preserving tests and inspection prove no cumulative resampling blur.

## Final completion record

- Status/commits/checks/observable evidence: pending
- Residual risks and skipped device checks: pending
