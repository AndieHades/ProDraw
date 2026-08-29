# C3: Layer tree, effects and selection parity

- Stable id: `C3`
- Depends on: `C2`
- Status: `pending`

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

- Commit: pending
- Checks: pending
- Residual risk: pending
