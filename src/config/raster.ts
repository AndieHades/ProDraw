export const RASTER_LIMITS = Object.freeze({
  tileSize: 256,
  maximumSide: 8192,
  maximumPixels: 50_000_000,
  maximumHistoryEntries: 100,
  maximumHistoryBytes: 256 * 1024 * 1024,
  maximumCompositeCacheTiles: 2_048,
  maximumPresentationCacheTiles: 512,
  exportYieldTileInterval: 8
});

export const DEFAULT_DOCUMENT = Object.freeze({
  width: 1920,
  height: 1080,
  dpi: 72,
  name: "Untitled"
});
