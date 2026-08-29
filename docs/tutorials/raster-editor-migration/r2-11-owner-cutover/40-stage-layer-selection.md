# C3: Layer tree, effects and selection parity

- Stable id: `C3`
- Depends on: `C2`
- Status: `in_progress`

## Sub-stages

1. `C3A`: add nested groups, multi-selection, opacity/blend, lock, alpha lock,
   clipping, reference flag and one structural/raster history budget for tree
   and metadata commands.
2. `C3B`: port effects, rectangle/lasso and floating selection with sparse masks;
   prove contextual whole-canvas/by-contour export for one, many and group scopes.

Traversal and composition are shared core contracts, never parallel algorithms
owned by UI, effects and export separately.

## Edge and failure cases

Empty groups/selections are no-ops; clipping and hidden ancestors compose
deterministically; merge/export failure cannot partially mutate the tree; Undo
restores both pixels and structure.

## Checks and acceptance

Focused tree, blend/effect, selection, history-byte, PNG bounds, native round
trip and shell interaction tests pass. No layer/effect/selection command reaches
legacy state or duplicates tree traversal rules.

## Completion record

- `C3A`: done in `refactor: port layer tree history`; live folder queries and
  empty-folder anchors delegate to one cycle-safe `LayerTree` contract. Typed
  structural patches restore nesting, multi-selection and stable raster-owner
  identities without cloning pixel payloads.
- Commit: C3A stage commit; C3B pending
- Checks: 117 legacy, 315 TypeScript and 52 sequential performance tests; full
  validate, production bundle, focused duplicate/merge/Undo and A4 history gates
- Residual risk: effects and floating-selection history remain in C3B
