import type { RgbaColor } from "../../contracts/raster.ts";
import { RasterEdit } from "../history/RasterEdit.ts";
import type { TileChangeSet, TilePatch } from "../history/tilePatch.ts";
import { RasterSurface } from "./RasterSurface.ts";
import { pixelTileCoordinate, tileKey } from "./tileAddress.ts";
import { copySurfaceRegion, type LegacyRasterBounds,
  type LegacyRasterRegion } from "./LegacyRasterRegion.ts";
import { loadLegacyGridTile, syncLegacyGridTile } from "./LegacyRasterGridTiles.ts";
import type { RasterPixelWrite } from "./RasterTilePixels.ts";

type Cell = number[] | null;
type Grid = { readonly length: number; [index: number]: unknown[] };
export interface LegacyRasterWrite extends RasterPixelWrite { readonly value: Cell }

const rgba = (cell: readonly number[]): RgbaColor => ({ red: cell[0] ?? 0,
  green: cell[1] ?? 0, blue: cell[2] ?? 0, alpha: cell[3] ?? 255 });
export class LegacyRasterSurfaceBacking {
  readonly #width: number;
  readonly #height: number;
  readonly #id: string;
  #surface: RasterSurface;
  #edit: RasterEdit | null = null;
  readonly #changedTiles = new Map<string, { x: number; y: number }>();
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
    this.#edit = new RasterEdit(this.#surface, label); this.#changedTiles.clear(); return true;
  }

  write(grid: Grid, x: number, y: number, value: Cell): void {
    const row = grid[y]; if (!row) return;
    if (this.#edit) { this.touchTile(grid, x, y);
      this.#edit.setPixel(x, y, value ? rgba(value) :
      { red: 0, green: 0, blue: 0, alpha: 0 });
    }
    row[x] = value;
  }

  writeCells(grid: Grid, writes: readonly LegacyRasterWrite[]): void {
    const edit = this.#edit;
    if (!edit) { for (const write of writes) { const row = grid[write.y];
      if (row) row[write.x] = write.value; } return; }
    const groups = new Map<string, { x: number; y: number; pixels: RasterPixelWrite[] }>();
    for (const write of writes) {
      const row = grid[write.y]; if (!row) continue;
      const x = pixelTileCoordinate(write.x, this.#surface.tileSize);
      const y = pixelTileCoordinate(write.y, this.#surface.tileSize);
      const key = tileKey(x, y); let group = groups.get(key);
      if (!group) { this.loadTile(grid, x, y); group = { x, y, pixels: [] };
        groups.set(key, group); this.#changedTiles.set(key, { x, y }); }
      group.pixels.push(write);
      row[write.x] = write.value;
    }
    for (const group of groups.values()) edit.setTilePixels(group.x, group.y, group.pixels);
  }

  prepareRegion(grid: Grid, minX: number, minY: number, maxX: number, maxY: number): void {
    const side = this.#surface.tileSize;
    for (let y = Math.floor(minY / side); y <= Math.floor(maxY / side); y++)
      for (let x = Math.floor(minX / side); x <= Math.floor(maxX / side); x++) {
        this.loadTile(grid, x, y); this.#changedTiles.set(tileKey(x, y), { x, y });
      }
  }

  writePreparedCells(writes: readonly LegacyRasterWrite[]): void {
    const edit = this.#edit; if (!edit) return;
    const groups = new Map<string, { x: number; y: number; pixels: RasterPixelWrite[] }>();
    for (const write of writes) {
      const x = pixelTileCoordinate(write.x, this.#surface.tileSize);
      const y = pixelTileCoordinate(write.y, this.#surface.tileSize);
      const key = tileKey(x, y); let group = groups.get(key);
      if (!group) { group = { x, y, pixels: [] }; groups.set(key, group); }
      group.pixels.push(write);
    }
    for (const group of groups.values()) edit.setTilePixels(group.x, group.y, group.pixels);
  }

  commit(): TileChangeSet | null {
    const edit = this.#edit; if (!edit) return null;
    this.#edit = null; const result = edit.commit(); this.#changedTiles.clear(); return result;
  }

  cancel(grid: Grid): boolean {
    const edit = this.#edit; if (!edit) return false;
    edit.cancel(); this.#edit = null;
    for (const tile of this.#changedTiles.values()) this.syncTile(grid, tile.x, tile.y);
    this.#changedTiles.clear(); return true;
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

  private touchTile(grid: Grid, x: number, y: number): void {
    const tileX = pixelTileCoordinate(x, this.#surface.tileSize);
    const tileY = pixelTileCoordinate(y, this.#surface.tileSize);
    this.loadTile(grid, tileX, tileY);
    this.#changedTiles.set(tileKey(tileX, tileY), { x: tileX, y: tileY });
  }

  private loadTile(grid: Grid, tileX: number, tileY: number,
    bounds?: LegacyRasterBounds): void {
    const key = tileKey(tileX, tileY); if (this.#loadedTiles.has(key)) return;
    loadLegacyGridTile(this.#surface, grid, tileX, tileY,
      this.#width, this.#height, bounds);
    this.#loadedTiles.add(key);
  }

  private syncTile(grid: Grid, tileX: number, tileY: number): void {
    syncLegacyGridTile(this.#surface, grid, tileX, tileY, this.#width, this.#height);
  }
}
