import type {
  DocumentDescriptor, DocumentSnapshot, LayerDescriptor
} from "../../contracts/document";
import type { RgbaColor } from "../../contracts/raster";
import { sourceOver } from "../../logic/raster/colorComposite";
import { RasterSurface } from "../raster/RasterSurface";

export interface RasterLayer {
  descriptor: LayerDescriptor;
  readonly surface: RasterSurface;
}

export class RasterDocument {
  readonly descriptor: DocumentDescriptor;
  readonly #layers: RasterLayer[] = [];
  #activeLayerId = "";

  constructor(descriptor: DocumentDescriptor) {
    if (descriptor.width < 1 || descriptor.height < 1 || descriptor.dpi < 1) {
      throw new Error("Document dimensions and DPI must be positive");
    }
    this.descriptor = descriptor;
  }

  get layers(): readonly RasterLayer[] {
    return this.#layers;
  }

  get activeLayer(): RasterLayer {
    const layer = this.#layers.find(({ descriptor }) => descriptor.id === this.#activeLayerId);
    if (!layer) throw new Error("Document has no active layer");
    return layer;
  }

  addLayer(descriptor: LayerDescriptor, index = this.#layers.length): RasterLayer {
    if (this.#layers.some((layer) => layer.descriptor.id === descriptor.id)) {
      throw new Error(`Duplicate layer id: ${descriptor.id}`);
    }
    const surface = new RasterSurface(
      `${this.descriptor.id}/${descriptor.id}`,
      this.descriptor.width, this.descriptor.height
    );
    const layer = { descriptor, surface };
    this.#layers.splice(Math.max(0, Math.min(index, this.#layers.length)), 0, layer);
    this.#activeLayerId = descriptor.id;
    return layer;
  }

  selectLayer(id: string): void {
    if (!this.#layers.some(({ descriptor }) => descriptor.id === id)) {
      throw new Error(`Unknown layer: ${id}`);
    }
    this.#activeLayerId = id;
  }

  updateLayer(id: string, update: Partial<Omit<LayerDescriptor, "id">>): void {
    const layer = this.#layers.find(({ descriptor }) => descriptor.id === id);
    if (!layer) throw new Error(`Unknown layer: ${id}`);
    layer.descriptor = { ...layer.descriptor, ...update, id };
  }

  editableSurface(): RasterSurface {
    const layer = this.activeLayer;
    if (!layer.descriptor.visible || layer.descriptor.locked) {
      throw new Error("Active layer is not editable");
    }
    return layer.surface;
  }

  compositePixel(x: number, y: number): RgbaColor {
    let output: RgbaColor = { red: 0, green: 0, blue: 0, alpha: 0 };
    for (const layer of this.#layers) {
      if (!layer.descriptor.visible) continue;
      output = sourceOver(output, layer.surface.getPixel(x, y), layer.descriptor.opacity);
    }
    return output;
  }

  snapshot(): DocumentSnapshot {
    return { ...this.descriptor, activeLayerId: this.#activeLayerId,
      layers: this.#layers.map(({ descriptor }) => ({ ...descriptor })) };
  }
}
