# C1F: Stabilized product freeze

- Stable id: `C1F`
- Depends on: `C1`
- Status: `done`
- Commit: `test: freeze stabilized editor parity`

## Scope

Freeze the product behaviour repaired after the old C1 baseline before changing
any raster owner:

1. gallery listing reads lightweight metadata and opens a heavy record only on
   explicit selection;
2. image/PNG/PSD import shows progress after two seconds and awaits the terminal
   decode, save and open result;
3. compact raster remap reuses immutable cells instead of multiplying memory;
4. every mouse button can Pan outside a mode hit region, while middle mouse and
   Space plus left mouse force Pan over Crop and other interactive regions;
5. `Обрезать слои` stays next to Crop, includes hidden selected layers or a
   selected folder subtree, uses the largest union and restores all pixels on
   Undo;
6. accepted desktop builds are installed behind the permanent desktop shortcut.

## Steps

1. Update the exact interface validator for `trim-selected` after `crop`.
2. Run the focused gallery, Pan, Crop/trim, remap and panel migration tests.
3. Record the live JS/TS graph counts without lowering a ceiling artificially.

No production raster behaviour changes in this stage.

## Acceptance

The repaired workflow suite and interface/cutover/raster-entry gates pass. The
next stage can replace owners only while this evidence remains green.

## Completion record

- Commit: this stage commit, `test: freeze stabilized editor parity`
- Checks: 30 focused gallery/Pan/Crop/trim/remap/panel tests; interface,
  cutover, raster-entry, typecheck and lint pass
- Residual risk: physical input and visual acceptance stay in the final matrix;
  this stage intentionally changes no raster behaviour
