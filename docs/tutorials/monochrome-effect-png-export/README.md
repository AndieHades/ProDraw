# Monochrome Effect and PNG Export

Status: `in_progress`

Evidence baseline: `main@a698b39`, 2026-08-17.

Parent requirements: raster migration `R5.3`, `R5.8`–`R5.10` and UI parity
Export/Layer actions rows. This package owns only the focused legacy-shell
parity slice; the later typed RGBA owner cutover remains in the parent plan.

## Resume Here

- Current stage: `ME-2 — effect-aware layer and folder PNG`
- Status: `in_progress`
- Last completed stage: `ME-1 — non-destructive monochrome effect`
- Next action: route layer/folder quick PNG through one target tree and prove
  visible effects, hidden exclusions, trim bounds and entity-derived names
- Blockers: none
- Working paths: `src/logic`, `src/core/effect-*`, `src/systems/effects`,
  `src/systems/export`, `src/systems/layers/menu.js`, `index.html`,
  `test/module-int.mjs`
- Last checks: 129 unit, 444 module-integration, effect/performance Vitest 10,
  TypeScript check, targeted ESLint, docs/lines/cycles all passed
- Last updated: `2026-08-17`

## Scope

- `MONO-01`: one Rec.601 conversion powers destructive monochrome and effect.
- `MONO-02`: a layer or folder can own, persist, copy, undo and toggle the
  monochrome effect without changing source pixels.
- `MONO-03`: folder monochrome covers its visible subtree and visible styles.
- `PNG-01`: layer and folder RMB menus expose whole-canvas and cropped PNG.
- `PNG-02`: output contains the final visible composite, including enabled
  monochrome, stroke, glow and shadows, while disabled effects stay absent.
- `PNG-03`: folder PNG contains only its visible descendant tree.
- `PNG-04`: the suggested base filename comes from the exact layer/folder name;
  only filesystem-invalid characters may be replaced by the save boundary.

## Delivery

| Stage | Chapter | Status | Commit |
| --- | --- | --- | --- |
| `ME-1` | [`10-stage-monochrome-effect.md`](10-stage-monochrome-effect.md) | done | `feat: add monochrome layer effect` |
| `ME-2` | [`20-stage-png-export.md`](20-stage-png-export.md) | in progress | `fix: export layer and folder effects to png` |

## Completion Definition

- Each requirement has a positive and visibility/failure assertion.
- Source pixels remain byte-identical while the effect is toggled.
- Whole-canvas and trimmed PNGs use the final effect-bearing alpha bounds.
- Focused integration, check, lint, docs/lines and diff gates pass.
- Stage records contain commit ids and the parent docs point to final evidence.
