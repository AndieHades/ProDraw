# Current State

## Confirmed behavior

- `src/systems/mono.js` destructively rewrites layer pixels with Rec.601
  luminance and keeps alpha. Its conversion helper is private.
- `src/config/defaults.js` registers stroke, glow and two shadows as addable
  effects. Generic effect cloning/history/gallery paths already serialize
  unknown effect data and visibility.
- `src/core/composite.js` is shared by screen and flattened export. Layer and
  folder pixel effects flow through bounded effect surfaces.
- `src/systems/export/pipeline.js` has one-layer whole/trim PNG compatibility,
  while `src/systems/layers/menu.js` hides both commands for folders.
- `src/systems/export/tree.js` already builds a visibility-filtered folder tree.
- Existing export integration checks validate counts/extensions, not rendered
  effect pixels, crop bounds or entity-derived filenames.

## Evidence

- Baseline: clean `main@a698b39`, five commits ahead of `origin/main`.
- `node test/module-int.mjs`: 441 passed on 2026-08-17.
- Relevant tests: `test/module-int.mjs` effect cases 68–76, export cases
  122–133 and effect UI cases 211–216.

## Gap

There is no reversible monochrome effect entry, folder quick PNG action, or
acceptance proof that quick PNG observes enabled/disabled layer and folder
effects. The current quick export also constructs an ad-hoc layer node instead
of reusing the visibility-filtered tree contract.
