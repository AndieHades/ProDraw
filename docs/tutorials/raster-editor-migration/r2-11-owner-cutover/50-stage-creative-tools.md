# C4: Transform, creative tools, text, colour and view

- Stable id: `C4`
- Depends on: `C3`
- Status: `pending`

## Steps

1. Port Move/Crop/Flip/Centre and free transform through immutable source
   snapshots and one final resample; add Liquify through the same rule.
2. Port Shapes, Dodge, symmetry and bounded raster Tile Mode; keep exact
   two-column registry and shortcut/pen/touch alternatives.
3. Port editable text layers, font library/import, canvas frame editing,
   alignment, colour and stretch with explicit rasterization commands.
4. Port colour wheel/SV/HEX/history/palettes/used colours/shading/T-S-G to typed
   colour and document commands.
5. Port pan/zoom/rotate, actual-size cycle, Preview and Reference without source
   mutation; complete the pending 20% zoom-step contract.

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
