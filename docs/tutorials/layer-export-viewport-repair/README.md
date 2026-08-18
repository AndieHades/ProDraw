# Layer Export and Viewport Repair

Status: `done`

Evidence baseline: clean `codex/layer-export-viewport-fixes@8e7faee`,
2026-08-18, synchronized with `origin/main`.

Parent requirements: raster migration `IMG-01`, `R5.4`, `R5.8`, `R5.13` and
the completed recovery-bridge PNG/PSD paths.

## Resume Here

- Current stage: `complete`
- Status: `done`
- Last completed stage: `LEP5 — bounded export execution`
- Next action: user smoke of a corrected production PSD in physical Photoshop
- Blockers: none
- Working paths: `src/systems/export`, `src/systems/layers`, `src/platform`,
  `desktop`, `src/systems/render`, `src/i18n`, `index.html`, `tests`, `test`
- Last checks: 400 module integration tests; 13 focused files / 57 tests;
  targeted ESLint, docs, lines, 282-source cycles and production bundle
- Last updated: 2026-08-18

## Problems Recorded

1. Layer folders and their children appear in the wrong panel order after PSD
   export, while the embedded canvas composite is correct. Reordering the panel
   then changes the recomputed canvas stack.
2. A folder has only flattened whole-canvas/cropped PNG actions. There is no
   separate action that exports every descendant layer as its own PNG while
   recreating nested folders in Explorer.
3. Scaled presentation used nearest-neighbour sampling. The first repair covered
   zoom-out, but user verification exposed the same defect above 100%; source
   RGBA itself remains unchanged.
4. `LEP1` trusted the installed decoder's top-first tree convention as a
   Photoshop panel oracle. Physical Photoshop validation disproved that
   assumption: current exports reverse the real hierarchy and visual stack.
5. Separate export materializes every full-size canvas and encoded blob before
   the first save. Large all-option exports can exhaust the renderer; after the
   process restarts, ProDraw opens on its normal gallery startup screen.

## Requirements

- `LEP-PSD-01` (superseded): exported PSD rows are top-first at every nesting depth and
  decode to the same semantic stack that produced the embedded composite.
- `LEP-PSD-02`: exported four-channel artwork declares RGB colour mode and a
  round-trip decoder accepts it without an in-memory repair.
- `LEP-PNG-01`: folder RMB adds a third localized action, **Сохранить слои в
  PNG**, next to the two existing flattened PNG actions; layers do not show it.
- `LEP-PNG-02`: one directory choice creates a collision-safe root named after
  the clicked folder, recreates descendant folders and writes every descendant
  layer as a separate full-canvas transparent PNG.
- `LEP-PNG-03`: hidden layers are included, authored Unicode names survive,
  invalid Windows characters and sibling collisions are resolved, and each PNG
  includes that layer's enabled layer effects. Group-wide effects are not
  duplicated onto individual leaves.
- `LEP-PNG-04`: desktop writes are staged, bounded to the selected tree and
  committed without overwriting an existing export; cancel writes nothing and
  failure cannot present a partial tree as complete.
- `LEP-VIEW-01`: presentation scaling below 100% uses high-quality
  interpolation; 100% retains exact pixel alignment.
- `LEP-VIEW-02`: presentation scaling above 100% uses the same high-quality
  interpolation and no zoom operation mutates source RGBA.
- `LEP-PSD-03`: raw PSD records remain bottom-first at every nesting depth,
  matching the Photoshop-validated fixture; decoder tree conventions cannot
  reverse this boundary.
- `LEP-EXP-01`: separate export retains at most one rendered item and one
  encoded output at a time; shared trim bounds use a bounded measurement pass.
- `LEP-EXP-02`: export UI prevents concurrent runs, awaits completion, catches
  failure and never requests a gallery transition.

## Delivery Order

| Stage | Chapter | Depends on | Status | Commit boundary |
| --- | --- | --- | --- | --- |
| `LEP0` | this evidence package | none | done | `docs: plan layer export and viewport repairs` |
| `LEP1` | [`10-stage-psd-order.md`](10-stage-psd-order.md) | `LEP0` | superseded | `fix: preserve psd layer panel order` |
| `LEP2` | [`20-stage-folder-png-tree.md`](20-stage-folder-png-tree.md) | `LEP1` | done | `feat: export folder layers as png tree` |
| `LEP3` | [`30-stage-viewport-downscale.md`](30-stage-viewport-downscale.md) | `LEP2` | done | `fix: improve zoomed out canvas quality` |
| `LEP3A` | [`30-stage-viewport-downscale.md`](30-stage-viewport-downscale.md) | `LEP3` | done | `fix: smooth zoomed in canvas presentation` |
| `LEP4` | [`40-stage-photoshop-order.md`](40-stage-photoshop-order.md) | `LEP3A` | done | `fix: restore photoshop psd stack order` |
| `LEP5` | [`50-stage-bounded-export.md`](50-stage-bounded-export.md) | `LEP4` | done | `fix: bound multi-file export memory` |

## Completion Definition

- [x] PSD descriptors match the Photoshop-selected raw order recursively.
- [x] Folder RMB writes one complete Explorer tree with one PNG per descendant.
- [x] Scaled presentation below and above 100% is filtered while 100% and source
  bytes stay exact.
- [x] Large separate export is sequential and any failure leaves the current
  document open with localized feedback.
- [x] Focused behavior/failure tests, targeted lint, docs/lines/cycles and
  production build pass; the unrelated full-check blocker is recorded.
