// Above this canvas coverage, reference-swap + restoring holes is cheaper than
// recording every selected pixel in history.
export const DENSE_SELECTION_REFERENCE_RATIO = 0.5;

// Sparse clipboard payloads keep only painted cells; dense payloads use rows.
export const SELECTION_FRAGMENT_DENSE_RATIO = 0.35;

// Compatibility scan for legacy/direct grid writes that bypass bounds metadata.
export const SELECTION_BOUNDS_FALLBACK_PIXELS = 262_144;
