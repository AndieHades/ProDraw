# Decisions and risks

## Decisions

1. Preserve the product surface; do not repeat the reduced-shell cutover from
   `c89e78c`.
2. Port by behavioural owner, not by renaming hundreds of `.js` files.
3. Establish one typed session before migrating advanced tools; no new command
   may add a second state store.
4. Keep the current module tests as a temporary oracle. Move named behaviour to
   focused TypeScript tests before deleting the related legacy module.
5. Reuse only contracts with one meaning. Similar-looking paint/effect loops stay
   local when abstraction would merge different alpha, bounds or Undo rules.
6. Old storage identifiers are read compatibility, not visible product identity.
7. Each stage is independently revertible and ends in a usable editor.
8. Do not bulk-rename JS modules. A file becomes TypeScript only while its
   behavioural owner, contracts and tests move to the target graph.
9. The gallery/Crop/Pan/trim repairs through `c37c01f` are mandatory acceptance
   fixtures for every following stage.
10. A CI artifact is staging, not delivery. Only the EXE resolved through
    `%USERPROFILE%\Desktop\ProDraw.lnk` can be called a handed-off build.

## Main risks and controls

| Risk | Control |
| --- | --- |
| UI disappears during entrypoint switch | DOM/interface validator stays green from C0 through C6 |
| two owners mutate the same action | command ownership manifest rejects duplicate owners |
| RGBA port changes blend/alpha output | golden pixels plus export/reopen comparisons |
| structural and raster Undo diverge | one document history transaction contract |
| large documents regress | FHD/A4/4K and five-minute plateau gates each owner stage |
| feature is declared ported but still calls JS | production graph/extension/import validators |
| storage rename loses existing work | copy-on-success migration with retained source record |
| mass TS conversion hides types with `any` | strict check and `no-explicit-any`; no `ts-nocheck` |
| optional codec inflates startup | bundle manifest and lazy-window smoke |
| hardware behaviour drifts | recorded traces every stage, physical Huion matrix at closure |
| repaired Crop/Pan/gallery behaviour disappears | keep C1F focused tests green at every stage |
| staging package is mistaken for user build | resolve shortcut target and smoke that exact EXE |

## Rollback

Rollback is the focused stage revert. Persisted schemas are additive until C6;
old records are never rewritten in place. C6 deletes the oracle only after the
tagged Git baseline, parity matrix and packaged restart evidence are recorded.
