import type { BrushPreset, LoadedBrush } from "../contracts/brush";
import type { NewDocumentRequest } from "../contracts/editorCommands";
import type { CanvasFrameViewModel, EditorViewModel } from "../contracts/editorView";
import type { RasterSize } from "../contracts/raster";
import type { ViewState } from "../contracts/view";
import { VIEW_INPUT } from "../config/input";
import { BrushCatalog } from "../core/brush/BrushCatalog";
import { createRasterDocument } from "../core/document/createRasterDocument";
import type { RasterDocument } from "../core/document/RasterDocument";
import { createCanvasFrame } from "../core/editor/createCanvasFrame";
import { createEditorView } from "../core/editor/createEditorView";
import { TileHistory } from "../core/history/TileHistory";
import { fitView, rotateViewAt } from "../logic/view/viewTransform";

export class RasterEditorSession {
  readonly #catalog = new BrushCatalog();
  readonly #history = new TileHistory();
  #document: RasterDocument;
  #view: ViewState;
  #brush: BrushPreset | LoadedBrush;

  constructor(document: RasterDocument, brush: BrushPreset, viewport: RasterSize) {
    this.#document = document;
    this.#brush = brush;
    this.#view = fitView(document.descriptor, viewport);
    this.registerSurfaces();
  }

  get document(): RasterDocument { return this.#document; }
  get history(): TileHistory { return this.#history; }
  get view(): ViewState { return this.#view; }
  get brush(): BrushPreset | LoadedBrush { return this.#brush; }

  setView(view: ViewState): void { this.#view = view; }

  selectBrush(brush: BrushPreset): void {
    this.#brush = brush;
    void this.#catalog.load(brush).then((loaded) => {
      if (this.#brush.id === loaded.id) this.#brush = loaded;
    });
  }

  forgetBrush(id: string): void { this.#catalog.clear(id); }

  createDocument(request: NewDocumentRequest, layerName: string, viewport: RasterSize): void {
    this.#document = createRasterDocument({ ...request, layerName });
    this.#history.clear();
    this.registerSurfaces();
    this.fit(viewport);
  }

  addLayer(name: string): void {
    const layer = this.#document.addLayer({ id: crypto.randomUUID(), name,
      visible: true, locked: false, opacity: 1, blendMode: "normal" });
    this.#history.registerSurface(layer.surface);
  }

  selectLayer(id: string): void { this.#document.selectLayer(id); }
  setLayerVisible(id: string, visible: boolean): void {
    this.#document.updateLayer(id, { visible });
  }

  historyStep(direction: "undo" | "redo"): void { this.#history[direction](); }
  fit(viewport: RasterSize): void { this.#view = fitView(this.#document.descriptor, viewport); }

  rotate(direction: -1 | 1, viewport: RasterSize): void {
    const center = { x: viewport.width / 2, y: viewport.height / 2 };
    this.#view = rotateViewAt(this.#view, center, direction * VIEW_INPUT.buttonRotationRadians);
  }

  viewModel(): EditorViewModel {
    return createEditorView(this.#document, this.#history, this.#view, this.#brush);
  }

  canvasFrame(): CanvasFrameViewModel { return createCanvasFrame(this.#document); }

  private registerSurfaces(): void {
    for (const layer of this.#document.layers) this.#history.registerSurface(layer.surface);
  }
}
