# GMS2: compact raster remap

- Stable id: `GMS2`
- Depends on: `GMS1`
- Status: `pending`
- Scope: pure raster remap and crop/Trim performance evidence.

## Change map

1. Create one immutable RGBA cell interner per `remapRaster()` operation.
2. Route destination grid and off-canvas `ext` values through that interner.
3. Extend A4 remap tests with repeated-colour reference and input-isolation proof.
4. Re-run crop, Trim, rotate, flip, center and document-remap Undo coverage.

## Edge and failure cases

- RGB and RGBA values keep their original tuple length.
- Equal values share one frozen destination cell even across grid and `ext`.
- Destination cells do not alias a mutable legacy source value.
- Reference-backed Undo restores the original grid and Redo retains the compact
  destination grid.

## Verification

- `npx vitest run tests/performance/documentRemapA4.test.js --maxWorkers=1 --no-file-parallelism`
- focused raster-remap tests
- `npm run check` and targeted ESLint
- `npm run validate:changed`
- packaged desktop smoke

## Acceptance criteria

- Repeated-colour remap output has one destination cell identity per value.
- Crop/Trim behavior, dimensions, ext pixels and Undo remain unchanged.
- Full changed-surface gate and desktop packaging pass.

## Completion record

Pending.
