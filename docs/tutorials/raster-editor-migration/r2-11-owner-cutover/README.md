# R2.11: TypeScript RGBA Owner Cutover

- Status: `superseded`
- Evidence baseline: `aset-editor@c37c01f`, 2026-08-28
- Parent plan: [`Raster Editor Migration`](../README.md)
- Authority: user requested full audit, implementation and one commit per stage;
  after stabilizing gallery memory, Crop, selected-layer trim and global Pan,
  the user authorized the full TypeScript transition.

## Why `C6A` and `C6B` are superseded

Both stages assumed `src/raster-main.ts` and `RasterEditorApp` were the
TypeScript port of the product. The audit at `asset-editor@6cc56bb` disproved
that: `RasterEditorApp` throws without a brush library, handles about fifteen
commands and contains no PSD import or export, gallery, layer folders,
selection, transform, crop, trim, text, animation or effects. The live graph and
the `RasterEditorApp` graph share 17 of their modules, so they are two nearly
disjoint bodies of code rather than one migration at two stages.

Booting `RasterEditorApp` as written would therefore drop nearly every workflow
of the product. `C0`–`C5B` remain valid and delivered: they moved live owners
into TypeScript inside the preserved shell, which is the correct direction.

The remaining work continues in
[`raster-quality-runtime`](../../raster-quality-runtime/README.md): `Q1`
corrects the declared cutover target, `Q6` builds the TypeScript composition
root that mounts the preserved shell, and `Q7` deletes the parallel editor.
Evidence: [`01-current-state.md`](../../raster-quality-runtime/01-current-state.md).

## Resume Here

- Current stage: `none — package superseded after C5B`
- Status: `superseded`
- Last completed stage: `C5B`; timeline/frame mutation, playback position, onion
  neighbours and sprite-sheet metadata use TypeScript owners
- Next action: continue in
  [`raster-quality-runtime`](../../raster-quality-runtime/README.md); its
  `Resume Here` owns the current stage
- Blockers: none here; physical tablet acceptance moves to `Q3`/`Q4` of that package
- Working paths: none owned by this package
- Last checks: `npm run validate` green at `asset-editor@ceac0a2`, including
  `117` legacy unit, `162`/`448` TypeScript and `16`/`57` performance tests
- Last updated: 2026-09-06

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
| `C2A` | every live layer has one stable typed raster owner | `C1F` | done | `refactor: normalize live raster ownership` |
| `C2B` | paint tools and raster history use tiled surface bytes | `C2A` | done | `refactor: cut drawing over to tiled RGBA` |
| `C2C` | compositor and base layer commands use that owner | `C2B` | done | `refactor: cut render and base layers to RGBA` |
| `C2D` | session, autosave, New/Open and persistence are typed | `C2C` | done | `refactor: cut document sessions to TypeScript` |
| `C3A` | nested layer tree and structural history are typed | `C2D` | done | `refactor: port layer tree history` |
| `C3B` | effects, selection and contextual export are typed | `C3A` | done | `feat: port effects and selection to RGBA` |
| `C4A` | Transform, both Crop paths, Pan and view are typed | `C3B` | done | `feat: port transform crop and view` |
| `C4B` | creative tools, text and colour are typed | `C4A` | done | `feat: port creative tools to TypeScript` |
| `C5A` | gallery, import, export and Save as Canvas are typed | `C4B` | done | `refactor: port document file workflows` |
| `C5B` | animation and timeline are typed | `C5A` | done | `refactor: port animation workflows` |
| `C6A` | production starts at the TypeScript composition root | `C5B` | superseded | see `Q1`/`Q6` |
| `C6B` | legacy graph is deleted and final gates are green | `C6A` | superseded | see `Q7` |

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
