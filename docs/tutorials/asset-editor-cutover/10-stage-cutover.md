# AE1–AE2: brush removal, eraser and flip

## Change map

1. Replace the brush bridge with direct shell startup and remove typed runtime
   constructor dependencies on brush catalog/library/decoder.
2. Remove brush library, Studio, Procreate decode/import, preview/cursor,
   pressure/stabilizer and brush-only shell actions, panels, assets and tests.
3. Replace pointer drawing with hard Pencil/Eraser operations and a size-only
   size/opacity presenter and hotkeys; preserve last round/square choice.
4. Name the whole-document horizontal flip in the toolbar and cover document
   metadata plus PNG/PSD observable output.
5. Route selected layer/folder PSD export from the main command and context
   menu through one producer; selected siblings must be included in order.
6. Retire crop-panel grid visibility and cell-size controls without changing
   crop or document resize behavior.

## Failure cases

- Locked, hidden or unselected pixels are not changed by Pencil/Eraser.
- Cancelling a Pencil/Eraser gesture restores its pre-gesture snapshot.
- Flip does not reorder layers or change visibility, opacity or names.
- PSD decode failure remains transactional and does not replace active work.
- Context-menu export does not silently drop selected sibling layers.

## Acceptance

No production import requires an external brush module. Focused tests cover
startup without its bridge, hard round/square erase, PSD route/reopen/export
and flip output.
