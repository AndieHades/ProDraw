# Layer Export and Viewport Repair

Status: `in_progress`

Evidence baseline: clean `codex/layer-export-viewport-fixes@8e7faee`,
2026-08-18, synchronized with `origin/main`.

Parent requirements: raster migration `IMG-01`, `R5.4`, `R5.8`, `R5.13` and
the completed recovery-bridge PNG/PSD paths.

## Resume Here

- Current stage: `LEP3 — high-quality viewport downscale`
- Status: `ready`
- Last completed stage: `LEP2 — folder layers as PNG tree`
- Next action: add the pure downscale sampling policy and apply it only to the
  scaled live composite draw
- Blockers: none
- Working paths: `src/systems/export`, `src/systems/layers`, `src/platform`,
  `desktop`, `src/systems/render`, `src/i18n`, `index.html`, `tests`, `test`
- Last checks: 397 module integration tests; 3 focused files/6 tests; TypeScript,
  targeted ESLint, desktop/shell/interface/architecture/cycles/lines validators;
  desktop build and packaged Windows renderer smoke passed
- Last updated: 2026-08-18

## Problems Recorded

1. Layer folders and their children appear in the wrong panel order after PSD
   export, while the embedded canvas composite is correct. Reordering the panel
   then changes the recomputed canvas stack.
2. A folder has only flattened whole-canvas/cropped PNG actions. There is no
   separate action that exports every descendant layer as its own PNG while
   recreating nested folders in Explorer.
3. Mouse-wheel zoom-out always uses nearest-neighbour presentation and visibly
   damages detail below 100%, although source RGBA remains unchanged.

## Requirements

- `LEP-PSD-01`: exported PSD rows are top-first at every nesting depth and
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
- `LEP-VIEW-01`: presentation downscaling uses high-quality interpolation;
  100% retains exact pixel alignment and no zoom operation mutates source RGBA.

## Delivery Order

| Stage | Chapter | Depends on | Status | Commit boundary |
| --- | --- | --- | --- | --- |
| `LEP0` | this evidence package | none | done | `docs: plan layer export and viewport repairs` |
| `LEP1` | [`10-stage-psd-order.md`](10-stage-psd-order.md) | `LEP0` | done | `fix: preserve psd layer panel order` |
| `LEP2` | [`20-stage-folder-png-tree.md`](20-stage-folder-png-tree.md) | `LEP1` | done | `feat: export folder layers as png tree` |
| `LEP3` | [`30-stage-viewport-downscale.md`](30-stage-viewport-downscale.md) | `LEP2` | ready | `fix: improve zoomed out canvas quality` |

## Completion Definition

- Exported nested PSD order and composite agree after decode/reopen.
- Folder RMB writes one complete Explorer tree with one PNG per descendant.
- Downscaled presentation is filtered while 100% and source bytes stay exact.
- Focused behavior/failure tests, check/lint, docs/lines/cycles and production
  build pass; each stage records its commit and exact checks.
