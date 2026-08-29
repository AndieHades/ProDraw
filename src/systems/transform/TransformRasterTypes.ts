import type { SelectionMaskQuery } from "../../contracts/selection.ts";
import type { TransformCell, TransformResult } from "./TransformTypes.ts";

export interface RasterBounds {
  readonly minx: number; readonly miny: number;
  readonly maxx: number; readonly maxy: number;
}
export type MutableCell = number[];
export type GridRow = (MutableCell | null | undefined)[];
export type LegacyGrid = GridRow[];
export interface TransformLayer {
  grid: LegacyGrid;
  ext: Map<string, MutableCell>;
}
export interface TransformSourceEntry {
  readonly L: TransformLayer;
  readonly idx: number;
  readonly bounds: RasterBounds | null;
}
export interface RasterBackup extends TransformSourceEntry {
  readonly grid: LegacyGrid;
  readonly ext: Map<string, MutableCell>;
  changedBounds: RasterBounds | null;
}
export type MaskLike = SelectionMaskQuery & Partial<Iterable<string>>;
export interface GridFork {
  readonly source: LegacyGrid;
  readonly grid: LegacyGrid;
  readonly bounds: RasterBounds;
  readonly copied: Set<number>;
}
export interface PerResult {
  readonly s: { readonly L: TransformLayer };
  readonly r: TransformResult | null;
}
export type { TransformCell, TransformResult };
