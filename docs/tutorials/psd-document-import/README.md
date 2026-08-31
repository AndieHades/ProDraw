# PSD Document Import

Status: `done`

Evidence baseline: `main@440b0cb`, 2026-08-17.

Parent requirements: `IO-01`, `DOC-01`, `R2.11/C5`.

Authority: PSD dropped or opened anywhere must create a new gallery document
  whose editable structure and visible composite retain PSD semantics.

## Resume Here

- Current stage: complete
- Status: `done`
- Last completed stage: `PSD5 — gallery reopen, preview and stack repair`
- Next action: user-owned visual acceptance of the repaired dense PSD import
- Blockers: none; Photoshop comparison is the named manual skip
- Working paths: `src/core/psd`, `src/contracts`, `src/systems/import`,
  `src/systems/gallery`, `src/core/composite.js`, `tests/psd`
- Last checks: exact `Items (1).psd` packaged gallery drop reached decoding,
  saved, reopened a 4539x2553 document and reported 50 imported layers;
  focused route/session tests and packaged smoke passed
- Last updated: 2026-08-30

## Outcome

Gallery Import, editor File/Ctrl+O and drag-and-drop over gallery or workspace
all use one operation: decode PSD, create a separate document, persist it in the
gallery, then open it. The previous document is saved first and remains active
if decoding or persistence fails.

Window drag-and-drop has no intermediate full-screen release prompt. Dropping a
file starts routing immediately; a `.psd`/`.psb` name or PSD MIME starts the PSD
command synchronously, while signature detection remains the fallback for files
with an unknown extension. The Windows drop route retains a `.psd` source path,
so ordinary Save writes the updated layered PSD back without another dialog.
When the drop begins over the gallery and remains active for more than two
seconds, [`GDP1`](../../project/gallery-drop-import-progress-plan.md) shows one
progress bar through decode, layer preparation, persistence and document open.

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
| `PSD5` | repair producer order, sparse reopen and initial preview | `PSD4` | done | `fix: preserve psd stack and gallery reopen` |

## PSD5 Regression Repair

The physical `Assets.psd` fixture exposed three gaps hidden by the one-sibling
automated fixtures. Some producers store the decoded tree bottom-first despite
the decoder's documented top-first convention, so direction is now inferred
against the embedded composite before conversion to ProDraw's bottom-first
runtime stack. Persisted sparse grids now derive width from every materialized
row and tolerate empty rows inside content bounds. A new PSD record receives its
gallery preview from the embedded composite; older records with a missing
preview are regenerated on the next gallery save instead of being treated as
already complete.

## Large Sparse Layer Repair

`export-rig.psd` exposed a producer that stores 233 raster layers at the full
617×1983 canvas bounds even though only about 2% of their pixels are visible.
The adapter now keeps compressed channel data raw, decodes one layer at a time,
trims transparent padding into document-coordinate bounds and releases the full
temporary bitmap. Gallery conversion interns identical immutable RGBA cells, and
grid cloning keeps that sharing through persistence and autosave. This preserves
the exact visible pixels and editable layer tree without a multi-gigabyte heap.
Bulk PSD materialization defines imported sparse cells directly and records one
exact bounds result per layer, instead of running a bounds hook for every pixel.
On the physical `export-rig.psd`, the observed record-building stage fell from
about 4.8 seconds to 2.6 seconds on the same machine.

## Large Dense Canvas Repair

PSD import has a separate `8192`-pixel side limit while retaining the existing
`4096×4096` total pixel budget. This admits wide production assets without
changing the New Canvas limit or allowing unbounded allocations. Dense decoded
layers persist as `rgba-rows-v1` typed row spans; the live compatibility view
still supports indexed editing, while render/history consume the same bytes
without allocating one JS property per opaque pixel. Gallery picker and gallery
drop now share the delayed progress lifecycle, and bounded preflight failures
report their specific localized limit instead of only a generic open failure.
The desktop route validates the gallery's object generation token rather than
the retired numeric token shape; a mismatch here previously rejected every real
PSD before decode while the mocked route test continued to pass.

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
