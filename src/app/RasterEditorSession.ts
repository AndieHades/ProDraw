import type { BrushPreset, LoadedBrush } from "../contracts/brush";
import type { NewDocumentRequest } from "../contracts/editorCommands";
import type { CanvasFrameViewModel, EditorViewModel } from "../contracts/editorView";
import type { DocumentSessionSnapshot } from "../contracts/persistence";
import type { RasterSize } from "../contracts/raster";
import type { ViewState } from "../contracts/view";
import { VIEW_INPUT } from "../config/input";
import { BrushCatalog } from "../core/brush/BrushCatalog";
import { createRasterDocument } from "../core/document/createRasterDocument";
import type { RasterDocument } from "../core/document/RasterDocument";
import { DocumentCompositor } from "../core/editor/DocumentCompositor";
import { createEditorView } from "../core/editor/createEditorView";
import { TileHistory } from "../core/history/TileHistory";
import { fitView, rotateViewAt } from "../logic/view/viewTransform";

export class RasterEditorSession {
  readonly #catalog = new BrushCatalog();
  readonly #history = new TileHistory();
  readonly #compositor = new DocumentCompositor();
  #document: RasterDocument;
  #view: ViewState;
  #brush: BrushPreset | LoadedBrush;
  #session: DocumentSessionSnapshot;

  constructor(document: RasterDocument, brush: BrushPreset, viewport: RasterSize,
    session: DocumentSessionSnapshot = {
      revision: 0, savedRevision: 0, nativeLocation: null
    }) {
    this.#document = document;
    this.#brush = brush;
    this.#view = fitView(document.descriptor, viewport);
    this.#session = session;
    this.registerSurfaces();
    this.loadSelectedBrush(brush);
  }

  get document(): RasterDocument { return this.#document; }
  get history(): TileHistory { return this.#history; }
  get view(): ViewState { return this.#view; }
  get brush(): BrushPreset | LoadedBrush { return this.#brush; }
  get isDirty(): boolean { return this.#session.revision !== this.#session.savedRevision; }
  get sessionSnapshot(): DocumentSessionSnapshot { return { ...this.#session }; }

  setView(view: ViewState): void { this.#view = view; }

  selectBrush(brush: BrushPreset): void {
    this.#brush = brush;
    this.loadSelectedBrush(brush);
  }

  loadBrush(brush: BrushPreset): Promise<LoadedBrush> { return this.#catalog.load(brush); }

  forgetBrush(id: string): void { this.#catalog.clear(id); }

  createDocument(request: NewDocumentRequest, layerName: string, viewport: RasterSize): void {
    this.replaceDocument(createRasterDocument({ ...request, layerName }), viewport,
      { revision: 1, savedRevision: 0, nativeLocation: null });
  }

  replaceDocument(document: RasterDocument, viewport: RasterSize,
    session: DocumentSessionSnapshot): void {
    this.#document = document;
    this.#session = session;
    this.#history.reset();
    this.#compositor.reset(document.descriptor.id);
    this.registerSurfaces();
    this.fit(viewport);
  }

  addLayer(name: string): void {
    const layer = this.#document.addLayer({ id: crypto.randomUUID(), name,
      visible: true, locked: false, opacity: 1, blendMode: "normal" });
    this.#history.registerSurface(layer.surface);
    this.markDocumentChanged();
  }

  selectLayer(id: string): void { this.#document.selectLayer(id); }
  setLayerVisible(id: string, visible: boolean): void {
    this.#document.updateLayer(id, { visible });
    this.markDocumentChanged();
  }

  historyStep(direction: "undo" | "redo"): boolean {
    const changed = this.#history[direction]() !== null;
    if (changed) this.markDocumentChanged();
    return changed;
  }
  markDocumentChanged(): void {
    this.#session = { ...this.#session, revision: this.#session.revision + 1 };
  }
  markNativeSaved(location: string | null): void {
    this.#session = { ...this.#session, savedRevision: this.#session.revision,
      nativeLocation: location };
  }
  fit(viewport: RasterSize): void { this.#view = fitView(this.#document.descriptor, viewport); }

  rotate(direction: -1 | 1, viewport: RasterSize): void {
    const center = { x: viewport.width / 2, y: viewport.height / 2 };
    this.#view = rotateViewAt(this.#view, center, direction * VIEW_INPUT.buttonRotationRadians);
  }

  viewModel(): EditorViewModel {
    return createEditorView(this.#document, this.#history, this.#view, this.#brush,
      this.#session);
  }

  canvasFrame(viewport: RasterSize): CanvasFrameViewModel {
    return this.#compositor.frame(this.#document, this.#view, viewport);
  }

  private registerSurfaces(): void {
    for (const layer of this.#document.layers) this.#history.registerSurface(layer.surface);
  }

  private loadSelectedBrush(brush: BrushPreset): void {
    void this.loadBrush(brush).then((loaded) => {
      if (this.#brush.id === loaded.id && this.#brush.revision === loaded.revision) {
        this.#brush = loaded;
      }
    });
  }
}
