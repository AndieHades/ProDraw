import type { PackedRgbaGridRecord } from "../../contracts/packedRgbaGrid.ts";

export interface LegacyGridBounds {
  readonly minx: number;
  readonly miny: number;
  readonly maxx: number;
  readonly maxy: number;
}

type LegacyCell = readonly number[] | null | undefined;
type LegacyRow = ArrayLike<LegacyCell>;
type LegacyGrid = ArrayLike<LegacyRow>;

export function yieldToGalleryIdle(): Promise<void>;
export function cloneGridIdle(grid: LegacyGrid,
  bounds: LegacyGridBounds | null | undefined,
  isCurrent: () => boolean,
  yieldWork?: () => Promise<void>): Promise<Array<Array<number[] | undefined>> | null>;
export function cloneGridIdle(grid: PackedRgbaGridRecord,
  bounds: LegacyGridBounds | null | undefined,
  isCurrent: () => boolean,
  yieldWork?: () => Promise<void>): Promise<PackedRgbaGridRecord | null>;
export function cloneLayersIdle(layers: readonly unknown[],
  boundsFor: (index: number) => LegacyGridBounds | null | undefined,
  isCurrent: () => boolean,
  yieldWork?: () => Promise<void>): Promise<unknown[] | null>;
export function cloneAnimatorIdle(animator: unknown, liveFrameId: string | null,
  liveFrame: unknown, isCurrent: () => boolean,
  yieldWork?: () => Promise<void>): Promise<unknown | null | undefined>;
