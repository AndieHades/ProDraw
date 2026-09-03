import type { RgbaColor } from "../../contracts/raster.ts";
import { pixelTileCoordinate, tileKey } from "../raster/tileAddress.ts";
import type { RasterSurface } from "../raster/RasterSurface.ts";
import type { RasterPixelWrite } from "../raster/RasterTilePixels.ts";
import type { TileChangeSet, TilePatch } from "./tilePatch.ts";
import { tileBytesEqual } from "./tilePatch.ts";

interface TouchedTile {
  readonly x: number;
  readonly y: number;
  readonly before: Uint8ClampedArray | null;
}

export class RasterEdit {
  readonly #surface: RasterSurface;
  readonly #label: string;
  readonly #onClose: () => void;
  readonly #touched = new Map<string, TouchedTile>();
  #closed = false;
  #lastTileX = -1;
  #lastTileY = -1;

  constructor(surface: RasterSurface, label: string, onClose: () => void = () => undefined) {
    this.#surface = surface;
    this.#label = label;
    this.#onClose = onClose;
  }

  blendPixel(x: number, y: number, color: RgbaColor, opacity = 1): boolean {
    if (!this.#surface.containsPixel(x, y)) return false;
    this.capturePixelTile(x, y);
    return this.#surface.blendPixel(x, y, color, opacity);
  }

  erasePixel(x: number, y: number, opacity = 1): boolean {
    if (!this.#surface.containsPixel(x, y)) return false;
    this.capturePixelTile(x, y);
    return this.#surface.erasePixel(x, y, opacity);
  }

  getPixel(x: number, y: number): RgbaColor {
    this.assertOpen();
    return this.#surface.getPixel(x, y);
  }

  setPixel(x: number, y: number, color: RgbaColor): boolean {
    if (!this.#surface.containsPixel(x, y)) return false;
    this.capturePixelTile(x, y);
    return this.#surface.mutatePixel(x, y, () => color);
  }

  setPixels(pixels: readonly RasterPixelWrite[]): boolean {
    const groups = new Map<string, { x: number; y: number; pixels: RasterPixelWrite[] }>();
    for (const pixel of pixels) {
      if (!this.#surface.containsPixel(pixel.x, pixel.y)) continue;
      const x = pixelTileCoordinate(pixel.x, this.#surface.tileSize);
      const y = pixelTileCoordinate(pixel.y, this.#surface.tileSize);
      const key = tileKey(x, y); let group = groups.get(key);
      if (!group) { group = { x, y, pixels: [] }; groups.set(key, group); }
      group.pixels.push(pixel);
    }
    let changed = false;
    for (const group of groups.values()) {
      changed = this.setTilePixels(group.x, group.y, group.pixels) || changed;
    }
    return changed;
  }

  setTilePixels(x: number, y: number, pixels: readonly RasterPixelWrite[]): boolean {
    if (!pixels.length) return false;
    this.captureTile(x, y);
    return this.#surface.writeTilePixels(x, y, pixels);
  }

  commit(): TileChangeSet | null {
    this.assertOpen();
    const patches: TilePatch[] = [];
    for (const touched of this.#touched.values()) {
      const after = this.#surface.compactTile(touched.x, touched.y);
      if (!tileBytesEqual(touched.before, after)) {
        patches.push({ surfaceId: this.#surface.id, x: touched.x, y: touched.y,
          before: touched.before, after });
      }
    }
    this.close();
    return patches.length ? { label: this.#label, patches } : null;
  }

  cancel(): void {
    this.assertOpen();
    for (const touched of this.#touched.values()) {
      this.#surface.replaceTile(touched.x, touched.y, touched.before);
    }
    this.close();
  }

  private capturePixelTile(x: number, y: number): void {
    this.assertOpen();
    const tileX = pixelTileCoordinate(x, this.#surface.tileSize);
    const tileY = pixelTileCoordinate(y, this.#surface.tileSize);
    if (tileX === this.#lastTileX && tileY === this.#lastTileY) return;
    this.#lastTileX = tileX; this.#lastTileY = tileY;
    this.captureTile(tileX, tileY);
  }

  private captureTile(tileX: number, tileY: number): void {
    this.assertOpen();
    const key = tileKey(tileX, tileY);
    if (!this.#touched.has(key)) {
      this.#touched.set(key, { x: tileX, y: tileY,
        before: this.#surface.copyTile(tileX, tileY) });
    }
  }

  private assertOpen(): void {
    if (this.#closed) throw new Error("Raster edit is already closed");
  }

  private close(): void {
    this.#closed = true;
    this.#onClose();
  }
}
