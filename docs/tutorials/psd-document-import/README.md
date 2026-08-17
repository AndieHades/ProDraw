# PSD Document Import

Status: `done`

Evidence baseline: `main@440b0cb`, 2026-08-17.

Parent requirements: `IO-01`, `DOC-01`, `R2.11/C5`.

Authority: PSD dropped or opened anywhere must create a new gallery document
  whose editable structure and visible composite retain PSD semantics.

## Resume Here

- Current stage: `PSD4 — verification`
- Status: `done`
- Last completed stage: `PSD4 — failure matrix, docs and package proof`
- Next action: optional physical comparison with a Photoshop-authored fixture
- Blockers: none; Photoshop comparison is the named manual skip
- Working paths: `src/core/psd`, `src/contracts`, `src/systems/import`,
  `src/systems/gallery`, `src/core/composite.js`, `tests/psd`
- Last checks: PSD 9 files/48 tests, 393 module integration checks, 99 files/269
  non-performance tests, module boot/storage, TypeScript/ESLint/docs/architecture/
  cutover/cycles/lines/desktop-shell and Vite production build passed; decoder
  remains a separate 286.79 kB lazy chunk; packaged Windows smoke passed
- Last updated: 2026-08-17

## Outcome

Gallery Import, editor File/Ctrl+O and drag-and-drop over gallery or workspace
all use one operation: decode PSD, create a separate document, persist it in the
gallery, then open it. The previous document is saved first and remains active
if decoding or persistence fails.

The imported document preserves canvas size/DPI, Unicode names, layer order,
nested groups, visibility, opacity, clipping, transparency locks, per-pixel
alpha, rasterized bitmap/vector masks, supported blend modes and layer effects.
Text/vector/smart-object layers keep the PSD-provided rendered layer bitmap;
they are never replaced with an empty placeholder.

## Requirements

- `PSD-01`: every PSD entrypoint creates a new document, never inserts into the
  current document and never routes through ordinary image conversion.
- `PSD-02`: the new work is visible in the gallery after immediate save/reopen.
- `PSD-03`: dimensions, DPI, order, names, groups and layer metadata survive.
- `PSD-04`: alpha values `1..255`, masks and clipping affect the composite and
  survive gallery persistence.
- `PSD-05`: Photoshop blend modes are applied by an explicit mapping/fallback.
- `PSD-06`: decoded layer effects remain non-destructive when ProDraw has an
  equivalent; any unsupported effect is reported, never silently discarded.
- `PSD-07`: malformed, oversized or unsupported PSD leaves current work intact
  and shows a localized failure/compatibility report.
- `PSD-08`: late decode/save completion cannot replace a newer user action.

## Delivery Order

| Stage | Outcome | Depends on | Status | Commit boundary |
| --- | --- | --- | --- | --- |
| `PSD0` | evidence, contract and staged plan | none | done | `docs: plan structural psd import` |
| `PSD1` | bounded decoder and normalized tree | `PSD0` | done | `feat: decode structured psd documents` |
| `PSD2` | single new-document import transaction | `PSD1` | done | `feat: open psd as gallery documents` |
| `PSD3` | mask, blend and effect-aware runtime | `PSD2` | done | `feat: render imported psd semantics` |
| `PSD4` | failure matrix, docs and package proof | `PSD3` | done | `test: verify psd document import` |

## Completion Definition

- [x] The four entry surfaces share one tested PSD command.
- [x] Import success creates one separately named gallery item and opens it.
- [x] Nested groups and masked/effected state survive save/reopen.
- [x] The ordered composite contract matches exact expected RGBA fixtures.
- [x] Corrupt/oversized/superseded inputs do not replace the active work.
- [x] Focused tests, typecheck/lint, docs/line/cycle gates and desktop build pass.
- [x] Manual Photoshop fixture comparison is named as the only skipped profile.

## Chapters

1. [`01-current-state.md`](01-current-state.md)
2. [`02-target-contract.md`](02-target-contract.md)
3. [`03-decisions-and-risks.md`](03-decisions-and-risks.md)
4. [`10-stage-decoder.md`](10-stage-decoder.md)
5. [`20-stage-document-route.md`](20-stage-document-route.md)
6. [`30-stage-runtime-semantics.md`](30-stage-runtime-semantics.md)
7. [`90-verification.md`](90-verification.md)
