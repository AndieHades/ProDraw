// Undo is evicted by the bytes it actually retains, not by canvas area. A
// stroke keeps a few tile patches whatever the document size, so the previous
// area based cap punished large canvases for edits that cost almost nothing.
import { RASTER_LIMITS } from "../../config/raster.ts";
import { changeSetBytes } from "./tilePatch.ts";

const RGBA_BYTES = 4;
// One retained cell is a Map entry plus a four element array.
const CELL_BYTES = 48;
const UNKNOWN_ENTRY_BYTES = 1024;

interface LayerPatchLike {
  readonly width?: number;
  readonly height?: number;
  readonly cells?: { readonly size: number };
  readonly snapshot?: unknown;
}

const layerPatchBytes = (patch: LayerPatchLike): number => patch.snapshot
  ? (patch.width ?? 0) * (patch.height ?? 0) * RGBA_BYTES
  : (patch.cells?.size ?? 0) * CELL_BYTES;

export function historyEntryBytes(entry: unknown): number {
  const record = entry as Record<string, unknown> | null;
  if (!record || typeof record !== "object") return 0;
  if (record["kind"] === "legacy-tile-patch") {
    return changeSetBytes(record["changeSet"] as Parameters<typeof changeSetBytes>[0]);
  }
  if (record["kind"] === "pixel-patch") return layerPatchBytes(record as LayerPatchLike);
  if (record["kind"] === "pixel-batch") {
    return (record["patches"] as LayerPatchLike[] | undefined)
      ?.reduce((total, patch) => total + layerPatchBytes(patch), 0) ?? 0;
  }
  // A full document snapshot retains one cloned grid per layer. Charging the
  // dense worst case keeps the budget safe without walking every row.
  const layers = record["layers"];
  if (Array.isArray(layers)) {
    return layers.length * Number(record["W"] ?? 0) *
      Number(record["H"] ?? 0) * RGBA_BYTES;
  }
  return UNKNOWN_ENTRY_BYTES;
}

export function trimHistoryStack(stack: unknown[],
  maximumBytes: number = RASTER_LIMITS.maximumHistoryBytes,
  maximumEntries: number = RASTER_LIMITS.maximumHistoryEntries): number {
  let removed = 0;
  if (stack.length > maximumEntries) removed = stack.length - maximumEntries;
  let bytes = 0;
  for (let index = stack.length - 1; index >= removed; index--) {
    bytes += historyEntryBytes(stack[index]);
    // The newest entry always survives, however large it is; older ones go.
    if (bytes > maximumBytes && index < stack.length - 1) {
      removed = index + 1; break;
    }
  }
  if (removed) stack.splice(0, removed);
  return removed;
}
