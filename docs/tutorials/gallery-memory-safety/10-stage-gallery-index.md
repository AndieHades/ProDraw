# GMS1: lightweight gallery index

- Stable id: `GMS1`
- Depends on: none
- Status: `done`
- Scope: legacy gallery IndexedDB adapter, gallery queries and persistence tests.

## Change map

1. Bump the legacy gallery database to v2 and create `gallery-index`.
2. Project existing records through a cursor during the atomic upgrade.
3. Make save/delete update full data and projection in one transaction.
4. Expose a summary-only list and route gallery collection queries to it.
5. Prove migration, projection shape, updates and deletion without layer access.

## Edge and failure cases

- Folder records have no dimensions or preview and remain valid summaries.
- Incomplete documents receive safe display fallbacks without reading pixels.
- Transaction open/version failures keep the existing reconnect retry behavior.
- Recursive delete enumerates child summaries and removes only exact ids.

## Verification

- `node test/storage.mjs`
- focused Vitest migration/gallery tests
- `npm run check` and targeted ESLint
- `npm run validate:changed`

## Acceptance criteria

- Gallery rendering and recursive deletion call no full-store `getAll()`.
- Summary objects expose no `layers` or `animator` property.
- Existing records appear after upgrade and stay synchronized after mutation.

## Completion record

- Added the v2 `gallery-index` store and a cursor-based v1 backfill.
- Full-document save/delete and lightweight metadata stay transactionally paired.
- Render, folder traversal, rename, move, reorder and recursive delete use only
  summaries; open/duplicate load just the explicitly selected document.
- Autosave preserves folder/order through the summary instead of loading the
  previous full document.
- Checks: focused gallery/import/autosave 5 files/11 tests; storage script;
  changed-surface 93 files/275 tests plus all selected structural gates.
- Commit: `c4cdd25`.
