# Decisions and Risks

## Decisions

1. Use a maintained PSD decoder behind a ProDraw-owned adapter. The existing
   parser remains only as a legacy oracle until the adapter tests pass.
2. Decoder objects never enter editor state directly. A normalized serializable
   contract isolates dependency changes and strips DOM canvas objects.
3. PSD always creates a fresh document. File picker and drop location do not
   change that semantic rule.
4. Decode before replacement; persist before success UI. This matches the
   gallery's recent race-safe New/Open work.
5. Preserve exact alpha and mask data separately. Applying a mask destructively
   on import would make the layer look correct once but violate editability.
6. Compatibility is explicit. No unsupported effect or blend mode is silently
   renamed to a supported one.

## Risks and Mitigations

- **Hostile dimensions or decompression bombs.** Preflight the PSD header and
  enforce configurable byte/pixel/layer budgets before allocating surfaces.
- **Dependency bundle size.** Import decoder code only from the PSD path and
  record production bundle impact in `PSD4`.
- **Canvas colour differences.** Use raw RGBA image data and pure blend tests;
  do not rely on browser colour-management defaults for acceptance fixtures.
- **Group blend semantics.** Isolated groups require an intermediate bounded
  surface; pass-through groups compose children directly. Test both.
- **Effects are broader than ProDraw's current palette.** Normalize every
  decoded effect, implement equivalents incrementally, and report the precise
  residual list. Pattern data is a known decoder limitation.
- **Current owner cutover.** New contracts/core logic are TypeScript-first. The
  preserved production shell gets only a narrow adapter and can be removed at C6.
