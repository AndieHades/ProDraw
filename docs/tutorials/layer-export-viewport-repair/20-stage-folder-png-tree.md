# LEP2: Folder Layers as PNG Tree

- Stable id: `LEP2`
- Status: `planned`
- Depends on: `LEP1`
- Requirements: `LEP-PNG-01..04`

## Change map

- `src/logic/export`: pure path planning, sanitization and sibling uniquing.
- `src/systems/export`: one-leaf-at-a-time effect-aware PNG orchestration.
- `src/platform`: desktop/web directory writer boundary.
- `desktop`: trusted staged tree session with confined relative writes.
- `src/systems/layers/menu.js`, `index.html`, `src/i18n`: third folder action.
- focused logic/platform/integration tests: paths, transaction and dispatch.

## Steps

1. Plan all descendant folder/file paths before opening a writer.
2. Sanitize Unicode-preserving Windows segments and unique siblings without
   changing the layer tree or names in the document.
3. Add begin/write/commit/abort desktop IPC; validate the trusted sender, token,
   root confinement, PNG extension and byte payload on every write.
4. Add the web File System Access writer and explicit unsupported result.
5. For each planned leaf, render a full transparent document-sized canvas with
   that leaf's enabled effects, encode PNG, write it, then release references.
6. Add the localized folder-only menu row beside whole/cropped PNG.
7. Prove cancel, collision, invalid names, hidden leaves and nested output.

## Failure and edge cases

Missing/deleted folder writes nothing. Empty folders report no exportable layers.
Duplicate names are unique per destination directory, case-insensitively. Cancel
before begin creates no staging root. A later failure aborts the current staging
tree and reports a localized error without claiming success.

## Acceptance

- One click and one directory choice create the clicked root and nested folders.
- Every descendant, including hidden layers, produces exactly one full-size PNG.
- Existing whole/cropped PNG commands retain their behavior and wording.
- Desktop tests prove confinement, no overwrite, commit and abort cleanup.

## Completion record

- Commit: pending
- Checks: pending
- Residual risk: physical Explorer picker remains part of packaged smoke.
