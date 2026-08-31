# Gallery memory safety

Status: `done`
- Evidence baseline: `aset-editor@fd19d11`, 2026-08-28
- Authority: repeated desktop crashes while deleting several large gallery
  documents and while cropping layers in recently imported files.

## Outcome

Gallery browsing and deletion never materialize stored layer payloads. Crop,
Trim and other raster remaps preserve compact immutable RGBA cells instead of
creating one new array per pixel. Direct PNG/PSD Open and Save remain available,
while gallery autosave continues to provide recovery.

## Requirements

- `GMS-01`: gallery list/render/delete reads metadata and previews only.
- `GMS-02`: recursive folder deletion removes records by id without opening them.
- `GMS-03`: existing records receive a lightweight index one at a time; every
  later save/delete updates document and index in one transaction.
- `GMS-04`: crop/Trim/remap retains reference-backed Undo and interns copied RGBA
  values so repeated imported colours do not expand into per-pixel arrays.
- `GMS-05`: corrupt or incomplete metadata cannot block unrelated documents.
- `GMS-06`: source-bound PNG/PSD Open and Save remain unchanged; removing the
  gallery is not part of this recovery.
- `GMS-07`: dense imported PSD layers persist as bounded RGBA row buffers and
  expose the same indexed compatibility surface without one JS property per
  opaque pixel.

## Delivery order

| Stage | Outcome | Depends on | Status | Commit boundary |
| --- | --- | --- | --- | --- |
| `GMS1` | lightweight gallery index and safe deletion | none | done | `fix: keep gallery listing memory bounded` |
| `GMS2` | compact crop/Trim raster remaps | `GMS1` | done | `fix: preserve compact cells during raster remap` |
| `GMS3` | packed dense PSD persistence and live compatibility | `GMS2` | done | `fix: open large dense psd files` |

Only one stage may be `in_progress`.

## Chapters

1. [Current state](01-current-state.md)
2. [Target contract](02-target-contract.md)
3. [Decisions and risks](03-decisions-and-risks.md)
4. [Gallery index stage](10-stage-gallery-index.md)
5. [Raster remap stage](20-stage-raster-remap.md)
6. [Verification](90-verification.md)

## Completion definition

- Gallery tile creation receives no `layers`, `animator` or other heavy payload.
- Existing v1 databases upgrade without one `getAll()` of full documents.
- Deleting a document or folder needs no document decode/materialization.
- Crop and Undo preserve pixels while repeated colours share immutable cells.
- Dense PSD import, IndexedDB save/reopen and live raster reads stay below the
  decoded byte budget without expanding every pixel into a JS property.
- Focused persistence/performance tests, changed validation and packaged desktop
  smoke pass; manual testing with the user's large files remains user-led.

## Resume Here

- Current stage: complete
- Status: `done`
- Last completed stage: `GMS3 — packed dense PSD persistence`
- Next action: user-owned visual acceptance from the permanent desktop shortcut
- Blockers: none
- Working paths: `src/core/storage.ts`, `src/systems/gallery`, `src/logic/raster`,
  `tests`, `test`, `docs/tutorials/gallery-memory-safety`
- Last checks: `Items (1).psd` packaged import, packed record and IndexedDB
  reopen passed with 50 layers at 4539x2553; focused route/session checks and
  packaged smoke passed
- Last updated: 2026-08-30
