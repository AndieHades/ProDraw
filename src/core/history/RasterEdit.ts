import type { RgbaColor } from "../../contracts/raster.ts";
import { pixelTileCoordinate, tileKey } from "../raster/tileAddress.ts";
import type { RasterSurface } from "../raster/RasterSurface.ts";
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
