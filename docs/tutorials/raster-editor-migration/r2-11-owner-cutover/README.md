# R2.11: TypeScript RGBA Owner Cutover

- Status: `in_progress`
- Evidence baseline: `main@d3fc81a`, 2026-08-17
- Parent plan: [`Raster Editor Migration`](../README.md)
- Authority: user requested full audit, implementation and one commit per stage;
  user then confirmed exact UI/function parity with one TypeScript architecture.

## Resume Here

- Current stage: `C1 — preserved shell and pure/shared TypeScript modules`
- Status: `in_progress`
- Last completed stage: `C0` in `0f12c2d`
- Next action: inventory the complete preserved shell by action and owner, then
  migrate its pure/shared leaves to strict TypeScript without changing markup,
  gestures, labels or observable behaviour
- Blockers: physical Huion acceptance remains a final device-only check; it does
  not block code migration or automated trace evidence
- Working paths: `src`, `tests`, `tools`,
  `docs/tutorials/raster-editor-migration/r2-11-owner-cutover`
- Last checks: C0 full validation passed 129 legacy unit, 447 integration,
  217 TypeScript and 53 performance checks; dependency audit is clean; packaged
  Windows smoke passed; browser gallery -> 800x600 workspace passed without
  console errors
- Last updated: 2026-08-17

## Outcome

The preserved ProDraw interface and every non-excluded workflow run on one
strict TypeScript graph, one typed command/view-model boundary and one tiled
RGBA document/history owner. Production has no `legacy-entry.js`, `app.js`,
`grid[y][x]` image owner or parallel dormant editor.

The migration changes internals, not the product. Pixelization, Pixel Perfect
and the global stabilization toggle remain excluded by the parent parity
contract. Tile mode, animation and all other rows remain required.

## Requirements

- `CUT-TS-01`: every production source module is strict TypeScript.
- `CUT-RGBA-01`: `RasterDocument` and tiled `RasterSurface` own all artwork.
- `CUT-ONE-01`: one production entrypoint and one document/session owner exist.
- `PAR-UI-01`: original markup, icon language, windows and panel gestures remain.
- `PAR-FN-01`: every retained parity row changes observable state and is tested.
- `SAFE-01`: save/recovery/Undo guarantees survive every cutover stage.
- `PERF-01`: current F3 budgets stay green on realistic fixtures.
- `OPS-01`: gates reject a reintroduced JS/grid entry or unproved parity claim.

## Delivery order

| Stage | Outcome | Depends on | Status | Commit boundary |
| --- | --- | --- | --- | --- |
| `C0` | truthful gates, security and baseline health | none | done | `0f12c2d` |
| `C1` | preserved shell and pure/shared modules in TypeScript | `C0` | in progress | `refactor: migrate the preserved shell to TypeScript` |
| `C2` | drawing, render, history and layers use one RGBA owner | `C1` | pending | `refactor: cut editor state over to tiled RGBA` |
| `C3` | layer tree, effects and selection parity | `C2` | pending | `feat: port layer effects and selection to RGBA` |
| `C4` | transform, tools, text, colour and view parity | `C3` | pending | `feat: port creative tools to the typed editor` |
| `C5` | gallery, files, tile suite and animation parity | `C4` | pending | `feat: port document and timeline workflows` |
| `C6` | one entry, no legacy graph, final product gates | `C5` | pending | `refactor: retire the legacy editor runtime` |

Only one row may be `in_progress`. Every stage chapter owns its exact file
allowlist, focused checks, completion record and commit hash.

## Evidence map

1. [`01-current-state-audit.md`](01-current-state-audit.md)
2. [`02-target-contract.md`](02-target-contract.md)
3. [`03-decisions-and-risks.md`](03-decisions-and-risks.md)
4. [`10-stage-cutover-gates.md`](10-stage-cutover-gates.md)
5. [`20-stage-typescript-shell.md`](20-stage-typescript-shell.md)
6. [`30-stage-rgba-owner.md`](30-stage-rgba-owner.md)
7. [`40-stage-layer-selection.md`](40-stage-layer-selection.md)
8. [`50-stage-creative-tools.md`](50-stage-creative-tools.md)
9. [`60-stage-document-timeline.md`](60-stage-document-timeline.md)
10. [`70-stage-legacy-retirement.md`](70-stage-legacy-retirement.md)
11. [`90-verification.md`](90-verification.md)

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
