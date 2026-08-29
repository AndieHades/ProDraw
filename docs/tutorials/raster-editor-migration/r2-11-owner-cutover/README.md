# R2.11: TypeScript RGBA Owner Cutover

- Status: `in_progress`
- Evidence baseline: `aset-editor@c37c01f`, 2026-08-28
- Parent plan: [`Raster Editor Migration`](../README.md)
- Authority: user requested full audit, implementation and one commit per stage;
  after stabilizing gallery memory, Crop, selected-layer trim and global Pan,
  the user authorized the full TypeScript transition.

## Resume Here

- Current stage: `C2A — live RasterSurface normalization`
- Status: `in_progress`
- Last completed stage: `C1F`; product repairs through `c37c01f` are frozen as
  the live acceptance baseline
- Next action: attach one stable `RasterSurface` owner to every live document
  load/create path without duplicating pixel ownership
- Blockers: physical Huion acceptance remains a final device-only check; it does
  not block code migration or automated trace evidence
- Working paths: `src`, `tests`, `tools`,
  `docs/tutorials/raster-editor-migration/r2-11-owner-cutover`
- Last checks: 30 focused stabilized-workflow tests plus interface, cutover,
  raster-entry, typecheck and lint pass
- Last updated: 2026-08-28

## Outcome

The preserved ProDraw interface and every non-excluded workflow run on one
strict TypeScript graph, one typed command/view-model boundary and one tiled
RGBA document/history owner. Production has no `legacy-entry.js`, `app.js`,
`grid[y][x]` image owner or parallel dormant editor.

The migration changes internals, not the retained product. Pixelization, Pixel
Perfect, the global stabilization toggle and the tilemap/tileset suite are
excluded by explicit user decisions. The main seamless Tile Mode, animation and
all other rows remain required.

## Requirements

- `CUT-TS-01`: every production source module is strict TypeScript.
- `CUT-RGBA-01`: `RasterDocument` and tiled `RasterSurface` own all artwork.
- `CUT-ONE-01`: one production entrypoint and one document/session owner exist.
- `PAR-UI-01`: original markup, icon language, windows and panel gestures remain.
- `PAR-FN-01`: every retained parity row changes observable state and is tested.
- `SAFE-01`: save/recovery/Undo guarantees survive every cutover stage.
- `PERF-01`: current F3 budgets stay green on realistic fixtures.
- `OPS-01`: gates reject a reintroduced JS/grid entry or unproved parity claim.
- `PAR-STAB-01`: lightweight gallery listing and delayed import progress remain.
- `PAR-STAB-02`: global mouse Pan and both Crop workflows remain exact and undoable.
- `DELIVERY-01`: every accepted desktop stage reaches `%USERPROFILE%\Desktop\ProDraw.lnk`.

## Delivery order

| Stage | Outcome | Depends on | Status | Commit boundary |
| --- | --- | --- | --- | --- |
| `C0` | truthful gates, security and baseline health | none | done | `0f12c2d` |
| `C1` | preserved shell and pure/shared modules in TypeScript | `C0` | done | `refactor: migrate the preserved shell to TypeScript` |
| `C1F` | repaired interface and stability baseline frozen | `C1` | done | `test: freeze stabilized editor parity` |
| `C2A` | every live raster record has one `RasterSurface` owner | `C1F` | in progress | `refactor: normalize documents to raster surfaces` |
| `C2B` | paint tools and raster history use that owner | `C2A` | pending | `refactor: cut drawing over to tiled RGBA` |
| `C2C` | compositor and base layer commands use that owner | `C2B` | pending | `refactor: cut render and base layers to RGBA` |
| `C2D` | session, autosave, New/Open and persistence are typed | `C2C` | pending | `refactor: cut document sessions to TypeScript` |
| `C3A` | nested layer tree and structural history are typed | `C2D` | pending | `refactor: port layer tree history` |
| `C3B` | effects, selection and contextual export are typed | `C3A` | pending | `feat: port effects and selection to RGBA` |
| `C4A` | Transform, both Crop paths, Pan and view are typed | `C3B` | pending | `feat: port transform crop and view` |
| `C4B` | creative tools, text and colour are typed | `C4A` | pending | `feat: port creative tools to TypeScript` |
| `C5A` | gallery, import, export and Save as Canvas are typed | `C4B` | pending | `refactor: port document file workflows` |
| `C5B` | animation and timeline are typed | `C5A` | pending | `refactor: port animation workflows` |
| `C6A` | production starts at the TypeScript composition root | `C5B` | pending | `refactor: switch production to TypeScript entry` |
| `C6B` | legacy graph is deleted and final gates are green | `C6A` | pending | `refactor: retire the legacy editor runtime` |

Only one row may be `in_progress`. Every stage chapter owns its exact file
allowlist, focused checks, completion record and commit hash.

## Evidence map

1. [`01-current-state-audit.md`](01-current-state-audit.md)
2. [`02-target-contract.md`](02-target-contract.md)
3. [`03-decisions-and-risks.md`](03-decisions-and-risks.md)
4. [`10-stage-cutover-gates.md`](10-stage-cutover-gates.md)
5. [`15-stage-tilemap-retirement.md`](15-stage-tilemap-retirement.md)
6. [`20-stage-typescript-shell.md`](20-stage-typescript-shell.md)
7. [`22-stage-stabilization-freeze.md`](22-stage-stabilization-freeze.md)
8. [`30-stage-rgba-owner.md`](30-stage-rgba-owner.md)
9. [`40-stage-layer-selection.md`](40-stage-layer-selection.md)
10. [`50-stage-creative-tools.md`](50-stage-creative-tools.md)
11. [`60-stage-document-timeline.md`](60-stage-document-timeline.md)
12. [`70-stage-legacy-retirement.md`](70-stage-legacy-retirement.md)
13. [`90-verification.md`](90-verification.md)

The behavioural inventory remains
[`08-interface-feature-parity.md`](../08-interface-feature-parity.md). This
package owns how the unfinished `UI-R`/`R2.11` cutover reaches that inventory.

## Completion definition

- [ ] `index.html` loads one TypeScript entry and the packaged smoke reaches it.
- [ ] `git ls-files src` contains no production `.js` modules.
- [ ] production imports contain no grid/pixelizer compatibility owner.
- [ ] every retained parity row has positive, failure and persistence evidence.
- [ ] exact interface order, floating behaviour and RU/EN labels remain verified.
- [ ] full validate, dependency audit, performance, browser and package gates pass.
- [ ] physical Huion checks are either recorded or named as the sole manual skip.
- [ ] parent plan, roadmap, system docs and this `Resume Here` agree.
