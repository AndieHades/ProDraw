# C3: Layer tree, effects and selection parity

- Stable id: `C3`
- Depends on: `C2`
- Status: `pending`

## Steps

1. Add nested groups, multi-selection, opacity/blend, lock, alpha lock, clipping,
   reference flag and generic effect stack to typed document contracts.
2. Use one structural/raster history budget for add, duplicate, group, reorder,
   merge, clear, delete, metadata and effect commands.
3. Port layer/folder monochrome and remaining effects to bounded RGBA surfaces;
   share traversal/composite contracts instead of parallel export/UI algorithms.
4. Port rectangle/lasso, invert, copy/cut/paste/delete/deselect and floating
   selection state with sparse masks and explicit bounds.
5. Prove contextual whole-canvas/by-contour output for one/many/group scopes.

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
