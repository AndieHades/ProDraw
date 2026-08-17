# Stage ME-2: Effect-aware Layer and Folder PNG

- Stable id: `ME-2`
- Status: `done`
- Depends on: `ME-1`
- Requirements: `PNG-01`, `PNG-02`, `PNG-03`, `PNG-04`

## Change map

- `src/systems/export/tree.js`: public target-root builder.
- `src/systems/export/pipeline.js`: one quick PNG path for layer or folder.
- `src/systems/layers/menu.js`: show and dispatch both PNG actions for both
  context target kinds.
- `test/module-int.mjs`: final pixels, trim dimensions, visibility and names.

## Steps

1. Resolve the clicked layer/folder through the export tree contract.
2. Flatten only that root through shared `paintStack` with hidden content off.
3. Apply whole/trim bounds after the final effect-bearing composite.
4. Encode and save with the target's authored name.
5. Expose the two existing localized menu commands for folders.
6. Run persistence/export policy gates and update completion evidence.

## Failure and edge cases

Missing/deleted target writes nothing. An empty trimmed target yields no false
success. Hidden child layers, folders and effects are omitted. Duplicate names
remain exact for a single quick output. Save cancellation remains silent.

## Acceptance

- Layer PNG includes visible stroke/glow/shadow/monochrome and excludes hidden
  effects in both whole and cropped modes.
- Folder PNG includes visible nested descendants and styles, excluding hidden
  branches.
- Crop dimensions include final outer effect reach.
- Output name equals `<target name>.png` for layer and folder fixtures.

## Completion record

- Commit: `fix: export layer and folder effects to png` (this stage commit).
- Both quick actions now resolve a layer/folder export root and flatten it
  through shared `paintStack`; no separate effect renderer was introduced.
- Layer/folder exact names, effect metadata/visibility, visible folder children,
  whole-canvas dimensions, final-effect trim reach and both folder menu actions
  have integration evidence.
- Checks: 447 module-integration; TypeScript check; targeted ESLint; interface,
  docs and line validators.
