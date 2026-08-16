# Stage R4: Source-Preserving Transform and Liquify

- Status: `planned`
- Depends on: `R2`
- Requirements: `IMG-01`
- Planned commit: `feat: add source-preserving transform and liquify`

## Outcome

View rotation, repeated transform previews and Liquify interaction do not feed
already-resampled pixels back into the next preview.

## Steps

- `R4.1` Separate viewport matrix from document/history and test byte stability.
- `R4.2` Implement immutable transform source plus matrix-only preview state.
- `R4.3` Add nearest, bilinear and pure Lanczos3 samplers with edge tests.
- `R4.4` Commit transform once from source to final bounds; cancel writes nothing.
- `R4.5` Store Liquify displacement as Float32 tiles over immutable source bounds.
- `R4.6` Render interactive preview at adaptive quality and Apply once at chosen
  final filter; keep one undo transaction.
- `R4.7` Add compare/zoom inspection UI and memory/worker cancellation limits.
- `R4.8` Activate the panel's Move, Crop (Canvas Size), Flip and Center commands.
  View Flip is matrix-only; Move/Crop/Center preview immutable source pixels and
  commit at most one raster/history transaction.

## Negative proof

One hundred zoom/rotate view operations leave source hashes identical. A preview
sequence A→B→C followed by Apply(C) equals direct source→C within sampler
tolerance. Cancel after any preview restores byte-identical source.

## Checks and acceptance

Unit tests prove filter kernels/edge handling; integration tests prove source
immutability/history; A4 visual smoke checks sharp diagonals and text-like edges.

## Completion record

- Commit/checks/deviations: pending
