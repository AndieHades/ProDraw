# C4: Transform, creative tools, text, colour and view

- Stable id: `C4`
- Depends on: `C3`
- Status: `done`

## Sub-stages

1. `C4A`: port Move, normal Crop, selected-layer/folder trim, Flip, Centre,
   Transform and Liquify through immutable source snapshots and one final
   resample. Preserve exact Undo of off-canvas pixels and selected hidden scope.
2. `C4A`: port Pan/zoom/rotate, actual-size cycle, Preview and Reference without
   source mutation. Keep all-button Pan and forced middle/Space precedence active
   inside Crop and every other mode.
3. `C4B`: port Shapes, Dodge, symmetry and bounded raster Tile Mode; keep exact
   two-column registry and shortcut/pen/touch alternatives.
4. `C4B`: port text/font/canvas-frame editing and colour/palette/shading commands
   with explicit rasterization and persistence boundaries.

## Edge and failure cases

Repeated previews preserve source hashes. Missing fonts/assets degrade visibly.
Palette/font permission failure does not erase the prior library. View-only
actions never enter history or dirty the document.

## Checks and acceptance

Source-hash/resample goldens, text edit/rasterize/reopen, palette extraction,
exact tool registry, zoom sequence and multi-input browser scenarios pass. No
creative tool imports a retired JS owner.

## Completion record

- `C4A`: done in `feat: port transform crop and view`; typed sessions own normal
  Crop and Pan policy, typed remap history restores off-canvas raster references,
  and Transform math/raster state performs one source-to-result resample.
  Middle/Space force Pan inside modes; every mouse button pans outside their hit
  regions, preserving Crop/Transform controls inside the frame.
- `C4B`: done in `feat: port creative tools to TypeScript`; typed owners now
  define Shapes and contour fill, Dodge/Burn/Mono, palette ramps, symmetry,
  bounded Tile geometry, colour transforms, text model/frame/raster bounds and
  font registry decisions. Existing UI orchestration delegates to those owners.
- Commit: C4B stage commit
- Checks: 117 legacy, 335 TypeScript and 52 sequential performance tests;
  creative owner focus tests, full validate, line and import-cycle gates
- Residual risk: physical pen/touch acceptance remains a final manual check
