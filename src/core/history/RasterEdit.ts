import type { RgbaColor } from "../../contracts/raster";
import { pixelTileCoordinate, tileKey } from "../raster/tileAddress";
import type { RasterSurface } from "../raster/RasterSurface";
import type { TileChangeSet, TilePatch } from "./tilePatch";
import { tileBytesEqual } from "./tilePatch";

interface TouchedTile {
  readonly x: number;
  readonly y: number;
  readonly before: Uint8ClampedArray | null;
}

export class RasterEdit {
  readonly #surface: RasterSurface;
  readonly #label: string;
  readonly #touched = new Map<string, TouchedTile>();
  #closed = false;

  constructor(surface: RasterSurface, label: string) {
    this.#surface = surface;
    this.#label = label;
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

  commit(): TileChangeSet | null {
    this.assertOpen();
    this.#closed = true;
    const patches: TilePatch[] = [];
    for (const touched of this.#touched.values()) {
      const after = this.#surface.compactTile(touched.x, touched.y);
      if (!tileBytesEqual(touched.before, after)) {
        patches.push({ surfaceId: this.#surface.id, x: touched.x, y: touched.y,
          before: touched.before, after });
      }
    }
    return patches.length ? { label: this.#label, patches } : null;
  }

  cancel(): void {
    this.assertOpen();
    this.#closed = true;
    for (const touched of this.#touched.values()) {
      this.#surface.replaceTile(touched.x, touched.y, touched.before);
    }
  }

  private capturePixelTile(x: number, y: number): void {
    this.assertOpen();
    const tileX = pixelTileCoordinate(x, this.#surface.tileSize);
    const tileY = pixelTileCoordinate(y, this.#surface.tileSize);
    const key = tileKey(tileX, tileY);
    if (!this.#touched.has(key)) {
      this.#touched.set(key, { x: tileX, y: tileY,
        before: this.#surface.copyTile(tileX, tileY) });
    }
  }

  private assertOpen(): void {
    if (this.#closed) throw new Error("Raster edit is already closed");
  }
}
