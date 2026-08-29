export interface TrimBounds {
  readonly minx: number;
  readonly miny: number;
  readonly maxx: number;
  readonly maxy: number;
}

export interface TrimPort {
  readonly apply: (bounds: TrimBounds) => void;
  readonly canvasBounds: () => TrimBounds | null;
  readonly dimensions: () => { readonly width: number; readonly height: number };
  readonly feedback: (key: "canvasEmpty" | "nothingTrim" |
    "selectedLayersEmpty") => void;
  readonly selectedBounds: () => TrimBounds | null;
}

export class TrimSystem {
  readonly #port: TrimPort;

  constructor(port: TrimPort) { this.#port = port; }

  trimCanvas(): boolean {
    return this.#apply(this.#port.canvasBounds(), "canvasEmpty");
  }

  trimSelectedLayers(): boolean {
    return this.#apply(this.#port.selectedBounds(), "selectedLayersEmpty");
  }

  #apply(bounds: TrimBounds | null,
    emptyKey: "canvasEmpty" | "selectedLayersEmpty"): boolean {
    if (!bounds) { this.#port.feedback(emptyKey); return false; }
    const { width, height } = this.#port.dimensions();
    if (bounds.minx === 0 && bounds.miny === 0 &&
      bounds.maxx === width - 1 && bounds.maxy === height - 1) {
      this.#port.feedback("nothingTrim"); return false;
    }
    this.#port.apply(bounds); return true;
  }
}
