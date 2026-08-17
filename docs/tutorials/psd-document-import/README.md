# PSD Document Import

Status: `in_progress`

Evidence baseline: `main@440b0cb`, 2026-08-17.

Parent requirements: `IO-01`, `DOC-01`, `R2.11/C5`.

Authority: PSD dropped or opened anywhere must create a new gallery document
  whose editable structure and visible composite retain PSD semantics.

## Resume Here

- Current stage: `PSD1 — safe structural decoder`
- Status: `in_progress`
- Last completed stage: `PSD0 — live audit and target contract`
- Next action: replace the partial hand-written reader with a bounded decoder
  and normalize the decoded tree without mutating editor state
- Blockers: none for code; physical Photoshop comparison remains final manual QA
- Working paths: `src/core/psd`, `src/contracts`, `src/systems/import`,
  `src/systems/gallery`, `src/core/composite.js`, `tests/psd`
- Last checks: baseline inspection only; no implementation checks yet
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
| `PSD1` | bounded decoder and normalized tree | `PSD0` | in progress | `feat: decode structured psd documents` |
| `PSD2` | single new-document import transaction | `PSD1` | pending | `feat: open psd as gallery documents` |
| `PSD3` | mask, blend and effect-aware runtime | `PSD2` | pending | `feat: render imported psd semantics` |
| `PSD4` | failure matrix, docs and package proof | `PSD3` | pending | `test: verify psd document import` |

## Completion Definition

- [ ] The four entry surfaces share one tested PSD command.
- [ ] Import success creates one separately named gallery item and opens it.
- [ ] A nested masked/effected fixture survives save, restart and reopen.
- [ ] Its composite matches the expected RGBA fixture within declared tolerances.
- [ ] Corrupt/oversized/cancelled inputs do not alter current or gallery state.
- [ ] Focused tests, typecheck/lint, docs/line/cycle gates and desktop build pass.
- [ ] Manual Photoshop fixture comparison is recorded or named as the only skip.

## Chapters

1. [`01-current-state.md`](01-current-state.md)
2. [`02-target-contract.md`](02-target-contract.md)
3. [`03-decisions-and-risks.md`](03-decisions-and-risks.md)
4. [`10-stage-decoder.md`](10-stage-decoder.md)
5. [`20-stage-document-route.md`](20-stage-document-route.md)
6. [`30-stage-runtime-semantics.md`](30-stage-runtime-semantics.md)
7. [`90-verification.md`](90-verification.md)
