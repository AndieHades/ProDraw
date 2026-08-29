import type { TileChangeSet } from "./tilePatch.ts";
import { changeSetBytes } from "./tilePatch.ts";
import { RASTER_LIMITS } from "../../config/raster.ts";
import { LegacyRasterOwner, rasterOwnerForLayer } from
  "../raster/legacyRasterOwner.ts";

interface TileHistoryLayer {
  readonly rasterOwner?: LegacyRasterOwner;
}

interface TileHistoryState {
  readonly W: number;
  readonly H: number;
  readonly layers: readonly TileHistoryLayer[];
}

export interface LegacyTileEntry {
  readonly kind: "legacy-tile-patch";
  readonly layerIndex: number;
  readonly layer: TileHistoryLayer;
  readonly owner: LegacyRasterOwner;
  readonly width: number;
  readonly height: number;
  readonly changeSet: TileChangeSet;
}

export const createLegacyTileEntry = (layerIndex: number,
  layer: TileHistoryLayer, owner: LegacyRasterOwner, width: number,
  height: number, changeSet: TileChangeSet): LegacyTileEntry => ({ kind:
  "legacy-tile-patch", layerIndex, layer, owner, width, height, changeSet: {
    ...changeSet, patches: changeSet.patches.map((patch) => ({ ...patch, after: null }))
  } });

export const isLegacyTileEntry = (value: unknown): value is LegacyTileEntry =>
  (value as { kind?: unknown } | null)?.kind === "legacy-tile-patch";

export function trimLegacyTileStack(stack: unknown[],
  byteLimit = RASTER_LIMITS.maximumHistoryBytes): void {
  let bytes = stack.reduce<number>((total, entry) => total +
    (isLegacyTileEntry(entry) ? changeSetBytes(entry.changeSet) : 0), 0);
  let remove = 0;
  while (bytes > byteLimit && remove < stack.length) {
    const entry = stack[remove];
    if (isLegacyTileEntry(entry)) bytes -= changeSetBytes(entry.changeSet);
    remove += 1;
  }
  if (remove) stack.splice(0, remove);
}

export function swapLegacyTileEntry(entry: LegacyTileEntry,
  state: TileHistoryState, onDirty: (index: number) => void): LegacyTileEntry | null {
  const layer = state.layers[entry.layerIndex];
  if (state.W !== entry.width || state.H !== entry.height || layer !== entry.layer ||
    !layer || rasterOwnerForLayer(layer) !== entry.owner) return null;
  const changeSet = entry.owner.swapRasterEdit(entry.changeSet,
    entry.width, entry.height);
  if (!changeSet) return null;
  onDirty(entry.layerIndex);
  return { ...entry, changeSet };
}
