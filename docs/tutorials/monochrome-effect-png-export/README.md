# Layer Color Effects and PNG Export

Status: `done`

Evidence baseline: clean `main@182d113`, 2026-08-17.

Parent requirements: raster migration `R5.3`, `R5.8`–`R5.10` and UI parity
Export/Layer actions rows. This package owns only the focused legacy-shell
parity slice; the later typed RGBA owner cutover remains in the parent plan.

## Resume Here

- Current stage: complete
- Status: `done`
- Last completed stage: `ME-3 — editable brightness/contrast effect`
- Next action: none; typed RGBA ownership remains in the parent migration plan
- Blockers: none
- Working paths: `src/config/defaults.ts`, `src/systems/brightness-contrast.js`,
  `src/systems/effects`, `src/systems/layers/fx-rows.js`, `src/i18n`,
  `index.html`, `test/module-int.mjs`
- Last checks: 394 module integration tests, `validate:changed`, production
  build and live browser create/apply/reload/reopen passed
- Last updated: `2026-08-17, ME-3 implementation and browser verification complete`

## Scope

- `MONO-01`: one Rec.601 conversion powers destructive monochrome and effect.
- `MONO-02`: a layer or folder can own, persist, copy, undo and toggle the
  monochrome effect without changing source pixels.
- `MONO-03`: folder monochrome covers its visible subtree and visible styles.
- `BC-01`: the effects panel places Brightness/contrast beside Monochrome and
  opens a dedicated two-slider layer/folder effect editor.
- `BC-02`: slider input previews without source mutation; Apply, Undo, generic
  clone and gallery reopen retain brightness and contrast parameters.
- `BC-03`: first row click selects the effect and the next click reopens its
  saved parameters in a window above the layers panel.
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
| `ME-2` | [`20-stage-png-export.md`](20-stage-png-export.md) | done | `fix: export layer and folder effects to png` |
| `ME-3` | [`30-stage-brightness-contrast-effect.md`](30-stage-brightness-contrast-effect.md) | done | `feat: add editable brightness contrast effect` |

## Completion Definition

- Each requirement has a positive and visibility/failure assertion.
- Source pixels remain byte-identical while the effect is toggled.
- Brightness/contrast values remain editable after Apply and gallery reopen.
- Whole-canvas and trimmed PNGs use the final effect-bearing alpha bounds.
- Focused integration, check, lint, docs/lines and diff gates pass.
- Stage records contain commit ids and the parent docs point to final evidence.
