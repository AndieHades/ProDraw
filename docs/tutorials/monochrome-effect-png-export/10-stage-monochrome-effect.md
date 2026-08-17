# Stage ME-1: Non-destructive Monochrome Effect

- Stable id: `ME-1`
- Status: `done`
- Depends on: evidence baseline
- Requirements: `MONO-01`, `MONO-02`, `MONO-03`

## Change map

- `src/logic`: pure Rec.601 pixel conversion shared with the destructive tool.
- `src/config`, `index.html`, `src/i18n`: registered add-effect control and RU/EN
  labels with no parameter rows.
- `src/core/effect-*`, layer bake: bounded rendering for layer/folder styles.
- `test/module-int.mjs`: exact conversion, layer/folder render, visibility,
  source immutability, UI Apply/Undo and generic clone evidence.

## Steps

1. Extract conversion helper and migrate destructive monochrome to it.
2. Register `monochrome` defaults/fields/button/locales.
3. Apply visible monochrome after the bounded style surface is composed.
4. Propagate ancestor monochrome to descendant folder style surfaces.
5. Teach destructive merge/bake paths the same color effect.
6. Run focused tests, check, targeted lint, docs/lines and diff checks.

## Edge cases

Transparent pixels stay transparent; hidden effect is a no-op; repeated
monochrome is idempotent; empty layers/folders stay empty; alpha is unchanged.

## Acceptance

- A red source becomes gray value 76 by both destructive and effect paths.
- Toggling the eye changes output but not source cells.
- A folder effect changes colored child content and visible child/folder styles.
- Apply creates one effect-history entry and Undo removes it.

## Completion record

- Commit: `5193fa8` (`feat: add monochrome layer effect`).
- Shared `monochromeColor`/`monochromeRgba` now power destructive edits,
  bounded live effects and merge/folder bake paths.
- Exact Rec.601, alpha, source immutability, folder-style propagation,
  Apply/Undo/eye/clone and hidden-effect cases pass.
- Checks: 129 unit; 444 module-integration; focused effect/performance Vitest
  5 files/10 tests; TypeScript check; targeted ESLint; docs/lines/cycles.
