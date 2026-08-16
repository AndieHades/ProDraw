import { RASTER_LIMITS } from "../../config/raster";
import type { CanvasFrameViewModel, CanvasTileViewModel } from "../../contracts/editorView";
import type { RasterSize } from "../../contracts/raster";
import type { ViewState } from "../../contracts/view";
import { visibleTileBounds } from "../../logic/view/visibleTileBounds";
import type { RasterDocument } from "../document/RasterDocument";
import { compositeTile, compositeTileCoordinates } from "../document/compositeTiles";
import { tileKey } from "../raster/tileAddress";

interface CachedComposite extends CanvasTileViewModel {
  readonly signature: string;
}

export interface CompositorMetrics {
  readonly composites: number;
  readonly cacheHits: number;
  readonly cachedTiles: number;
}

export class DocumentCompositor {
  readonly #cache = new Map<string, CachedComposite>();
  #documentId = "";
  #revision = 0;
  #composites = 0;
  #cacheHits = 0;

  frame(document: RasterDocument, view: ViewState, viewport: RasterSize): CanvasFrameViewModel {
    if (document.descriptor.id !== this.#documentId) this.reset(document.descriptor.id);
    const tileSize = document.layers[0]?.surface.tileSize ?? RASTER_LIMITS.tileSize;
    const bounds = visibleTileBounds(view, viewport, document.descriptor, tileSize);
    const coordinates = bounds ? compositeTileCoordinates(document, bounds) : [];
    const tiles = coordinates.flatMap(({ x, y }) => {
      const tile = this.tile(document, x, y);
      return tile ? [tile] : [];
    });
    this.trim();
    return { document: { ...document.descriptor }, tileSize, tiles };
  }

  get metrics(): CompositorMetrics {
    return { composites: this.#composites, cacheHits: this.#cacheHits,
      cachedTiles: this.#cache.size };
  }

  reset(documentId = ""): void {
    this.#documentId = documentId;
    this.#cache.clear();
  }

  private tile(document: RasterDocument, x: number, y: number): CanvasTileViewModel | null {
    const key = tileKey(x, y);
    const signature = document.layers.filter(({ descriptor }) => descriptor.visible)
      .map((layer) => `${layer.descriptor.id}:${layer.descriptor.opacity}:` +
        `${layer.surface.tileRevision(x, y)}`).join("|");
    const cached = this.#cache.get(key);
    if (cached?.signature === signature) {
      this.#cache.delete(key); this.#cache.set(key, cached);
      this.#cacheHits += 1;
      return cached;
    }
    const composite = compositeTile(document, x, y);
    this.#composites += 1;
    if (!composite) { this.#cache.delete(key); return null; }
    const tile: CachedComposite = { x, y, signature, revision: ++this.#revision,
      bytes: new Uint8ClampedArray(composite) };
    this.#cache.set(key, tile);
    return tile;
  }

  private trim(): void {
    while (this.#cache.size > RASTER_LIMITS.maximumCompositeCacheTiles) {
      const oldest = this.#cache.keys().next().value as string | undefined;
      if (!oldest) return;
      this.#cache.delete(oldest);
    }
  }
}
