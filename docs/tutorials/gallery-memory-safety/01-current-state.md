# Current state

## Confirmed behavior

- `src/core/storage.js:listDocs()` uses IndexedDB `getAll()`, which structured-
  clones every complete gallery record, including `layers` and animation frames.
- `src/systems/gallery/store.js:childrenOf()` calls `listDocs()` for every gallery
  render, folder traversal and recursive deletion.
- `src/systems/gallery/screen.js:tileEl()` closes over each returned record in
  click, context-menu and drag handlers. Hidden gallery DOM therefore retains
  full documents after one is opened in the editor.
- `src/systems/gallery/doc.js:openWork()` separately loads the selected full
  document. Editing may therefore coexist with another in-memory clone of every
  gallery document.
- `src/logic/raster-remap.js:remapRaster()` calls `cell.slice()` for every stored
  pixel. PSD intake and autosave deliberately intern repeated immutable RGBA
  cells, so crop/Trim discards that compaction and can allocate millions of
  arrays while reference-backed Undo retains the source grid.

## Required result and gap

The gallery needs a separately stored projection containing only tile fields.
Delete and folder traversal must operate on that projection and keys. Raster
remaps need a fresh immutable value boundary without per-pixel array ownership.

## Safe assumptions

- IndexedDB records are already structured-cloneable; missing optional display
  fields can be normalized in the projection.
- `src/logic/raster-cell-interner.js` defines raster cells as immutable and is
  already used for large PSD materialization and gallery snapshots.
- Source-bound PNG/PSD Open and Save are independent of gallery tile listing and
  must remain intact.
