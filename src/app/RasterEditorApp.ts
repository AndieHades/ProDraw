import type { BrushPreset, LoadedBrush } from "../contracts/brush";
import type { ViewState } from "../contracts/view";
import { VIEW_INPUT } from "../config/input";
import { BrushCatalog } from "../core/brush/BrushCatalog";
import type { BrushLibraryService } from "../core/brush-library/BrushLibraryService";
import { createRasterDocument } from "../core/document/createRasterDocument";
import type { RasterDocument } from "../core/document/RasterDocument";
import { TileHistory } from "../core/history/TileHistory";
import { DocumentRepository } from "../core/persistence/DocumentRepository";
import { t, type MessageKey } from "../i18n/raster/translate";
import { fitView, rotateViewAt } from "../logic/view/viewTransform";
import type { PlatformPort } from "../contracts/platform";
import { AutosaveSystem } from "../systems/autosave/AutosaveSystem";
import { DrawingSystem } from "../systems/drawing/DrawingSystem";
import { ExportSystem } from "../systems/export/ExportSystem";
import { ViewportSystem } from "../systems/viewport/ViewportSystem";
import { BrushLibraryPresenter } from "../ui/brushes/BrushLibraryPresenter";
import { BrushStudioPresenter } from "../ui/brushes/BrushStudioPresenter";
import { CanvasPresenter } from "../ui/canvas/CanvasPresenter";
import { NewDocumentPresenter, type NewDocumentValues } from "../ui/document/NewDocumentPresenter";
import { LayerPresenter } from "../ui/layers/LayerPresenter";
import { WorkspacePresenter } from "../ui/workspace/WorkspacePresenter";
export class RasterEditorApp {
  readonly #workspace = new WorkspacePresenter();
  readonly #history = new TileHistory();
  readonly #catalog = new BrushCatalog();
  #document: RasterDocument;
  #view: ViewState;
  #brush: BrushPreset | LoadedBrush;
  readonly #canvas: CanvasPresenter;
  readonly #layers = new LayerPresenter();
  readonly #autosave: AutosaveSystem;
  readonly #brushes: BrushLibraryPresenter;
  readonly #studio: BrushStudioPresenter;
  readonly #newDocument: NewDocumentPresenter;

  constructor(platform: PlatformPort, repository: DocumentRepository, document: RasterDocument,
    library: BrushLibraryService) {
    this.#document = document;
    const initialBrush = library.snapshot.sets.flatMap(({ brushes }) => brushes)[0];
    if (!initialBrush) throw new Error("Brush library is empty");
    this.#brush = initialBrush;
    this.registerSurfaces();
    this.#view = fitView(document.descriptor, {
      width: this.#workspace.canvas.clientWidth, height: this.#workspace.canvas.clientHeight
    });
    this.#canvas = new CanvasPresenter(this.#workspace.canvas,
      () => this.#document, () => this.#view);
    this.#autosave = new AutosaveSystem(repository, () => this.#document);
    this.#studio = new BrushStudioPresenter(async (source, draft) => {
      const applied = await library.applyDraft(source, draft);
      this.#catalog.clear(source.id);
      this.selectBrush(applied);
      this.#brushes.select(applied.id);
    });
    this.#brushes = new BrushLibraryPresenter(library, this.#brush.id, {
      select: (brush) => this.selectBrush(brush),
      edit: (brush) => this.#studio.open(brush)
    });
    this.#newDocument = new NewDocumentPresenter((values) => this.createDocument(values));
    this.mountSystems(platform);
    this.refreshUi();
  }

  private mountSystems(platform: PlatformPort): void {
    const viewport = new ViewportSystem({ canvas: this.#workspace.canvas,
      getView: () => this.#view, setView: (view) => { this.#view = view; },
      requestRender: () => this.#canvas.requestRender() });
    viewport.mount();
    new DrawingSystem({ canvas: this.#workspace.canvas, viewport: this.#canvas,
      history: this.#history, getDocument: () => this.#document,
      getBrush: () => this.#brush, getColor: () => this.#workspace.color,
      getSize: () => this.#workspace.brushSize, getOpacity: () => this.#workspace.brushOpacity,
      getTool: () => this.#workspace.tool, canDraw: (event) => !viewport.isPanning(event),
      onCommit: () => { this.#autosave.schedule(); this.refreshUi(); },
      onBlocked: () => this.#workspace.showStatus("status.layerBlocked") }).mount();
    const exporter = new ExportSystem({ platform, getDocument: () => this.#document,
      onStatus: (status) => this.#workspace.showStatus(`status.${status}` as MessageKey) });
    this.bindActions(exporter);
  }

  private bindActions(exporter: ExportSystem): void {
    this.#workspace.bind({ newDocument: () => this.#newDocument.open(),
      exportPng: () => void exporter.exportPng(), undo: () => this.historyStep("undo"),
      redo: () => this.historyStep("redo"), selectTool: (tool) => this.#workspace.setTool(tool),
      fitView: () => this.fit(), rotateView: (direction) => this.rotate(direction),
      openBrushes: () => this.#brushes.open(), addLayer: () => this.addLayer() });
  }

  private selectBrush(brush: BrushPreset): void {
    this.#brush = brush;
    this.#workspace.setBrushName(brush.name);
    void this.#catalog.load(brush).then((loaded) => {
      if (this.#brush.id === loaded.id) this.#brush = loaded;
    });
  }

  private createDocument(values: NewDocumentValues): void {
    this.#document = createRasterDocument({ ...values, layerName: t("layers.default") });
    this.#history.clear();
    this.registerSurfaces();
    this.fit();
    this.#autosave.schedule();
    this.refreshUi();
  }

  private addLayer(): void {
    const index = this.#document.layers.length + 1;
    const layer = this.#document.addLayer({ id: crypto.randomUUID(),
      name: `${t("layers.default")} ${index}`, visible: true, locked: false,
      opacity: 1, blendMode: "normal" });
    this.#history.registerSurface(layer.surface);
    this.#autosave.schedule();
    this.refreshUi();
  }

  private historyStep(direction: "undo" | "redo"): void {
    this.#history[direction]();
    this.#autosave.schedule();
    this.refreshUi();
  }

  private fit(): void {
    this.#view = fitView(this.#document.descriptor, this.#canvas.size);
    this.refreshUi();
  }

  private rotate(direction: -1 | 1): void {
    const center = { x: this.#canvas.size.width / 2, y: this.#canvas.size.height / 2 };
    this.#view = rotateViewAt(this.#view, center, direction * VIEW_INPUT.buttonRotationRadians);
    this.refreshUi();
  }

  private registerSurfaces(): void {
    for (const layer of this.#document.layers) this.#history.registerSurface(layer.surface);
  }

  private refreshUi(): void {
    this.#workspace.setBrushName(this.#brush.name);
    this.#workspace.updateDocument(this.#document);
    this.#workspace.updateView(this.#view);
    this.#workspace.updateHistory(this.#history);
    this.#layers.render(this.#document, { select: (id) => {
      this.#document.selectLayer(id); this.refreshUi();
    }, toggleVisible: (id, visible) => {
      this.#document.updateLayer(id, { visible }); this.#autosave.schedule(); this.refreshUi();
    } });
    this.#canvas.requestRender();
  }
}
