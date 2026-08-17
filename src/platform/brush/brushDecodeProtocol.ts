import type { BrushPreset, LoadedBrush } from "../../contracts/brush";

export interface BrushDecodeRequest {
  readonly type: "decode";
  readonly id: number;
  readonly bytes: ArrayBuffer;
  readonly preset: BrushPreset;
}

export interface BrushDecodeSuccess {
  readonly type: "decoded";
  readonly id: number;
  readonly brush: LoadedBrush;
}

export interface BrushDecodeFailure {
  readonly type: "failed";
  readonly id: number;
  readonly message: string;
}

export type BrushDecodeResponse = BrushDecodeSuccess | BrushDecodeFailure;

export function coverageTransferables(brush: LoadedBrush): ArrayBuffer[] {
  const buffers = new Set<ArrayBuffer>();
  for (const map of [brush.shapeMap, brush.grainMap,
    brush.nativeShapeMap, brush.nativeGrainMap]) {
    if (map) buffers.add(map.data.buffer);
  }
  return [...buffers];
}

export function isBrushDecodeResponse(value: unknown): value is BrushDecodeResponse {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<BrushDecodeResponse>;
  return Number.isInteger(candidate.id) &&
    (candidate.type === "decoded" || candidate.type === "failed");
}
