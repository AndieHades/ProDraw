import type { PackedRgbaRowRecord } from "./packedRgbaGrid.ts";

export type ExtCell = readonly number[];
export interface PackedRasterExtRecord {
  readonly format: "rgba-ext-rows-v1";
  readonly rows: readonly PackedRgbaRowRecord[];
  readonly cells: Map<string, ExtCell>;
}
