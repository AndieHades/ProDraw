# C2: Single tiled RGBA owner

- Stable id: `C2`
- Depends on: `C1F`
- Status: `in_progress`
- Scope: document/session, drawing, render, history and base layers

## Sub-stages

1. `C2A`: normalize New/Open/imported and inserted live layers to one stable
   typed raster owner. It owns the existing sparse backing by reference, so the
   preparation stage neither copies pixels nor changes hot indexed access.
2. `C2B`: make the retained shell Brush/Eraser/Shapes/Fill writers produce one
   `RasterEdit` and one byte-bounded mixed-history transaction against a lazy
   `RasterSurface`. Keep the already typed Smudge core golden for its visible
   tool wiring in `C4B`.
3. `C2C`: remove compatibility-grid reads from the preserved full-feature
   compositor and route base add/select/visibility/opacity/lock/reorder through
   typed command owners. The reduced detached `DocumentCompositor` cannot replace
   folder/effect/clip behaviour before the complete composition-root switch.
4. `C2D`: connect typed session, autosave, New/Open cancellation, dirty state
   and persistence, then delete the superseded image/history owners.

Each sub-stage is a focused commit, leaves the editor usable and lowers the
registered JS/legacy-state ceiling only by the owners it actually removes.

## Sub-stage records

- `C2A`: done in this stage commit, `refactor: normalize live raster ownership`;
  117 legacy, 294 TypeScript and 51 performance tests pass. Live assignments,
  inserts, clones and reference Undo keep one stable non-serialized owner. An
  all-byte Proxy was rejected because it missed the A4 input budget.
- `C2B`: done in `refactor: cut drawing over to tiled RGBA`; the active paint
  writers now lazily materialize only touched 256px tiles. Pointer cancellation
  restores the open edit, Undo/Redo swaps exact RGBA bytes, and retained tile
  history is byte-bounded. The sparse grid is an owner-maintained compatibility
  cache until its compositor reader moves in `C2C`. The legacy pixel-patch owner
  remains only for adjustment and bulk compatibility actions scheduled later.
- `C2C`: done in `refactor: cut render and base layers to RGBA`; bounded canvas
  uploads, effect masks, composite sampling and layer hit-testing read the same
  lazy surface used by paint. Structural-only invalidation retains surface bytes.
  Typed command owners now perform base selection, add, visibility, opacity,
  lock, reference and layer/folder reorder mutations; JS only coordinates current
  UI/history callbacks. A focused test makes the compatibility cell throw and
  proves a committed stroke still renders from its surface.
- `C2D`: done in `refactor: cut document sessions to TypeScript`; active
  document identity, dirty/saved revisions and late-operation cancellation are
  one strict typed session. Autosave, New/Open and PSD import use its tokens,
  while IndexedDB document/gallery persistence moved from JavaScript to
  `storage.ts`. Late saves cannot mark a replacement document clean.

## Edge and failure cases

Hidden/locked layers reject mutation visibly. Cancel/capture loss restores exact
bytes. A failed save retains dirty state. Replacing a document forgets old
surfaces/history/cache and cannot be overwritten by a late open.

## Checks

- pen/touch/mouse -> RGBA -> frame -> Undo/Redo -> autosave/reopen scenario;
- all 12 brush goldens and Studio/document equality;
- A5/A4 pointer and dirty-tile performance gates;
- existing shell drawing/layer browser smoke.

## Acceptance

All visible base painting/layer actions use `RasterDocument`, `RasterSurface`
and `TileHistory`; production no longer allocates or serializes `grid[y][x]` for
those actions, while the exact UI remains.

## Completion record

- Commits: `refactor: cut drawing over to tiled RGBA` (`008f910`),
  `refactor: cut render and base layers to RGBA` (`cc85d40`) and
  `refactor: cut document sessions to TypeScript` (stage commit)
- Checks: 117 legacy, 310 TypeScript, 52 sequential performance; changed,
  architecture, cycles, interface and cutover gates
- Residual risk: typed Smudge has golden coverage but remains outside the visible
  legacy shell until the creative-tool/UI owner stage; compatibility grids remain
  for unported bulk tools and persisted legacy records
