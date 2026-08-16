import type { TileCoordinate } from "../../contracts/raster";

export interface TilePatch extends TileCoordinate {
  readonly surfaceId: string;
  readonly before: Uint8ClampedArray | null;
  readonly after: Uint8ClampedArray | null;
}

export interface TileChangeSet {
  readonly label: string;
  readonly patches: readonly TilePatch[];
}

export function tileBytesEqual(
  left: Uint8ClampedArray | null,
  right: Uint8ClampedArray | null
): boolean {
  if (left === right) return true;
  if (!left || !right || left.length !== right.length) return false;
  return left.every((value, index) => value === right[index]);
}

export function changeSetBytes(changeSet: TileChangeSet): number {
  return changeSet.patches.reduce((total, patch) =>
    total + (patch.before?.byteLength ?? 0) + (patch.after?.byteLength ?? 0), 0);
}
