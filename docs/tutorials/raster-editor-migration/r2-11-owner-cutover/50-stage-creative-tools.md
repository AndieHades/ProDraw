# C4: Transform, creative tools, text, colour and view

- Stable id: `C4`
- Depends on: `C3`
- Status: `pending`

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

- Commit: pending
- Checks: pending
- Residual risk: pending
