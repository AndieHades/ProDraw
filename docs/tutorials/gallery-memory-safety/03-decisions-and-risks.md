# Decisions and risks

## Decisions

- Keep gallery recovery and repair its metadata boundary instead of deleting the
  whole workflow during an urgent stability fix.
- Use a separate IndexedDB object store. Indexes on the full object store do not
  provide preview-rich projections without materializing full values.
- Backfill with `openCursor()` during schema upgrade. It limits renderer-visible
  JS ownership to one legacy document at a time and makes all later reads cheap.
- Use the existing immutable cell interner for remap output. Reusing input cells
  directly would be unsafe for old mutable records; raw `slice()` loses compact
  repeated-colour storage.

## Risks and mitigations

- Upgrade of one exceptionally large record still needs memory for that record.
  The cursor avoids the larger all-record peak; failures leave the versionchange
  transaction atomic and retryable.
- A partial metadata write could hide a document. Full document and projection
  mutations share one transaction, and the upgrade transaction is atomic.
- Projection fields can drift. All mutations continue through `saveDoc`, which
  rewrites the projection; tests cover save, update and delete.
- Cell sharing could break code that mutates arrays in place. The interner returns
  frozen arrays and follows the existing explicit immutable raster-cell contract;
  behavior tests cover crop and Undo.
- Automated fixtures cannot reproduce the exact user's heap. Packaged smoke and
  focused retained-reference assertions supplement user-led large-file acceptance.

## Rollback

Code can return gallery queries to the full store without deleting either store.
The v2 database remains readable because `docs` schema and keys do not change.
The remap change is isolated to destination cell construction.
