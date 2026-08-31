import type { RgbaColor } from "../../contracts/raster.ts";
import { RasterEdit } from "../history/RasterEdit.ts";
import type { TileChangeSet, TilePatch } from "../history/tilePatch.ts";
import { RasterSurface } from "./RasterSurface.ts";
import { pixelTileCoordinate, tileKey } from "./tileAddress.ts";
import { copySurfaceRegion, type LegacyRasterBounds,
  type LegacyRasterRegion } from "./LegacyRasterRegion.ts";
import { copyPackedRgbaTile,
  replacePackedRgbaTile } from "../../logic/raster/PackedRgbaGridTiles.ts";

type Cell = number[] | null;
type Grid = { readonly length: number; [index: number]: unknown[] };

const rgba = (cell: readonly number[]): RgbaColor => ({ red: cell[0] ?? 0,
  green: cell[1] ?? 0, blue: cell[2] ?? 0, alpha: cell[3] ?? 255 });
const cell = (color: RgbaColor): Cell => color.alpha > 0 ?
  [color.red, color.green, color.blue, color.alpha] : null;
const numericKeys = (value: object): number[] => Object.keys(value)
  .map(Number).filter((key) => Number.isInteger(key) && key >= 0);

export class LegacyRasterSurfaceBacking {
  readonly #width: number;
  readonly #height: number;
  readonly #id: string;
  #surface: RasterSurface;
  #edit: RasterEdit | null = null;
  readonly #changed = new Set<number>();
  readonly #loadedTiles = new Set<string>();

  constructor(id: string, width: number, height: number) {
    this.#id = id; this.#width = Math.max(1, width); this.#height = Math.max(1, height);
    this.#surface = this.newSurface();
  }

  get active(): boolean { return this.#edit !== null; }

  invalidate(): void { if (!this.#edit) { this.#surface = this.newSurface();
    this.#loadedTiles.clear(); } }

  begin(label: string): boolean {
    if (this.#edit) return false;
    this.#edit = new RasterEdit(this.#surface, label); this.#changed.clear(); return true;
  }

  write(grid: Grid, x: number, y: number, value: Cell): void {
    const row = grid[y]; if (!row) return;
    if (this.#edit) { this.loadPixelTile(grid, x, y);
      this.#edit.setPixel(x, y, value ? rgba(value) :
      { red: 0, green: 0, blue: 0, alpha: 0 });
      this.#changed.add(y * this.#width + x); }
    row[x] = value;
  }

  commit(): TileChangeSet | null {
    const edit = this.#edit; if (!edit) return null;
    this.#edit = null; this.#changed.clear(); return edit.commit();
  }

  cancel(grid: Grid): boolean {
    const edit = this.#edit; if (!edit) return false;
    edit.cancel(); this.#edit = null;
    for (const key of this.#changed) { const x = key % this.#width,
      y = Math.floor(key / this.#width), row = grid[y];
      if (row) row[x] = cell(this.#surface.getPixel(x, y)); }
    this.#changed.clear(); return true;
  }

  swap(grid: Grid, changeSet: TileChangeSet): TileChangeSet {
    const inverses: TilePatch[] = [];
    for (const patch of changeSet.patches) {
      this.loadTile(grid, patch.x, patch.y);
      const current = this.#surface.copyTile(patch.x, patch.y);
      this.#surface.replaceTile(patch.x, patch.y, patch.before);
      this.syncTile(grid, patch.x, patch.y);
      inverses.push({ ...patch, before: current, after: null });
    }
    return { label: changeSet.label, patches: inverses };
  }

  readRegion(grid: Grid, bounds: LegacyRasterBounds,
    sourceBounds: LegacyRasterBounds = bounds): LegacyRasterRegion {
    const size = this.#surface.tileSize;
    const minTileX = Math.max(0, Math.floor(bounds.minx / size));
    const minTileY = Math.max(0, Math.floor(bounds.miny / size));
    const maxTileX = Math.floor(Math.min(this.#width - 1, bounds.maxx) / size);
    const maxTileY = Math.floor(Math.min(this.#height - 1, bounds.maxy) / size);
    for (let y = minTileY; y <= maxTileY; y++)
      for (let x = minTileX; x <= maxTileX; x++) this.loadTile(grid, x, y, sourceBounds);
    return copySurfaceRegion(this.#surface, bounds);
  }

  private newSurface(): RasterSurface {
    return new RasterSurface(this.#id, this.#width, this.#height);
  }

  private loadPixelTile(grid: Grid, x: number, y: number): void {
    this.loadTile(grid, pixelTileCoordinate(x, this.#surface.tileSize),
      pixelTileCoordinate(y, this.#surface.tileSize));
  }

  private loadTile(grid: Grid, tileX: number, tileY: number,
    bounds?: LegacyRasterBounds): void {
    const key = tileKey(tileX, tileY); if (this.#loadedTiles.has(key)) return;
    const packed = copyPackedRgbaTile(grid, tileX, tileY, this.#surface.tileSize);
    if (packed !== undefined) { if (packed) this.#surface.replaceTile(tileX, tileY, packed);
      this.#loadedTiles.add(key); return; }
    const size = this.#surface.tileSize, bytes = new Uint8ClampedArray(size * size * 4);
    const startX = Math.max(tileX * size, bounds?.minx ?? 0);
    const startY = Math.max(tileY * size, bounds?.miny ?? 0);
    const endX = Math.min(this.#width, (tileX + 1) * size,
      (bounds?.maxx ?? this.#width - 1) + 1);
    const endY = Math.min(this.#height, (tileY + 1) * size,
      (bounds?.maxy ?? this.#height - 1) + 1); let occupied = false;
    for (const y of numericKeys(grid)) { if (y < startY || y >= endY) continue;
      const row = grid[y]; if (!row) continue;
      for (const x of numericKeys(row)) { if (x < startX || x >= endX) continue;
        const value = row[x]; if (!Array.isArray(value) || (value[3] ?? 255) <= 0) continue;
        const offset = ((y - tileY * size) * size + x - tileX * size) * 4;
        bytes[offset] = value[0] ?? 0; bytes[offset + 1] = value[1] ?? 0;
        bytes[offset + 2] = value[2] ?? 0; bytes[offset + 3] = value[3] ?? 255;
        occupied = true;
      }
    }
    if (occupied) this.#surface.replaceTile(tileX, tileY, bytes);
    this.#loadedTiles.add(key);
  }

  private syncTile(grid: Grid, tileX: number, tileY: number): void {
    const packed = this.#surface.copyTile(tileX, tileY);
    if (replacePackedRgbaTile(grid, tileX, tileY, this.#surface.tileSize, packed)) return;
    const size = this.#surface.tileSize, startX = tileX * size, startY = tileY * size;
    const endX = Math.min(this.#width, startX + size);
    const endY = Math.min(this.#height, startY + size);
    for (const y of numericKeys(grid)) { if (y < startY || y >= endY) continue;
      const row = grid[y]; if (!row) continue;
      for (const x of numericKeys(row)) if (x >= startX && x < endX) delete row[x];
    }
    const bytes = packed; if (!bytes) return;
    for (let y = startY; y < endY; y++) for (let x = startX; x < endX; x++) {
      const offset = ((y - startY) * size + x - startX) * 4;
      if (!bytes[offset + 3]) continue;
      const row = grid[y] ?? (grid[y] = new Array(this.#width));
      row[x] = [bytes[offset], bytes[offset + 1], bytes[offset + 2], bytes[offset + 3]];
    }
  }
}
