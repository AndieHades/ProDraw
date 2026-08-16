import type { BrushPreset } from "../contracts/brush";
import type { BrushLibraryPort } from "../contracts/brushLibraryPort";
import type { EditorCommand, EditorCommandDispatch } from "../contracts/editorCommands";
import type { PlatformPort } from "../contracts/platform";
import type { RasterDocument } from "../core/document/RasterDocument";
import { EditorEventBus } from "../core/events/EditorEventBus";
import { DocumentRepository } from "../core/persistence/DocumentRepository";
import { t, type MessageKey } from "../i18n/raster/translate";
import { AutosaveSystem } from "../systems/autosave/AutosaveSystem";
import { DrawingSystem } from "../systems/drawing/DrawingSystem";
import { ExportSystem } from "../systems/export/ExportSystem";
import { ViewportSystem } from "../systems/viewport/ViewportSystem";
import { BrushLibraryPresenter } from "../ui/brushes/BrushLibraryPresenter";
import { BrushStudioPresenter } from "../ui/brushes/BrushStudioPresenter";
import { CanvasPresenter } from "../ui/canvas/CanvasPresenter";
import { NewDocumentPresenter } from "../ui/document/NewDocumentPresenter";
import { LayerPresenter } from "../ui/layers/LayerPresenter";
import { WorkspacePresenter } from "../ui/workspace/WorkspacePresenter";
import { RasterEditorSession } from "./RasterEditorSession";

export class RasterEditorApp {
  readonly #workspace = new WorkspacePresenter();
  readonly #events = new EditorEventBus();
  readonly #layers = new LayerPresenter();
  readonly #session: RasterEditorSession;
  readonly #canvas: CanvasPresenter;
  readonly #autosave: AutosaveSystem;
  readonly #exporter: ExportSystem;
  readonly #brushes: BrushLibraryPresenter;
  readonly #studio: BrushStudioPresenter;
  readonly #newDocument: NewDocumentPresenter;

  constructor(platform: PlatformPort, repository: DocumentRepository, document: RasterDocument,
    library: BrushLibraryPort) {
    const brush = library.snapshot.sets.flatMap(({ brushes }) => brushes)[0];
    if (!brush) throw new Error("Brush library is empty");
    const viewport = { width: this.#workspace.canvas.clientWidth,
      height: this.#workspace.canvas.clientHeight };
    this.#session = new RasterEditorSession(document, brush, viewport);
    this.#canvas = new CanvasPresenter(this.#workspace.canvas,
      () => this.#session.canvasFrame(), () => this.#session.view);
    this.#autosave = new AutosaveSystem(repository, () => this.#session.document,
      (status) => this.status(`status.${status}` as MessageKey));
    this.#exporter = new ExportSystem({ platform, getDocument: () => this.#session.document,
      onStatus: (status) => this.status(`status.${status}` as MessageKey) });
    this.#studio = new BrushStudioPresenter(async (source, draft) => {
      const applied = await library.applyDraft(source, draft);
      this.#session.forgetBrush(source.id);
      this.selectBrush(applied);
      this.#brushes.select(applied.id);
    });
    this.#brushes = new BrushLibraryPresenter(library, brush.id, {
      select: (selected) => this.selectBrush(selected),
      edit: (selected) => this.#studio.open(selected)
    });
    this.#newDocument = new NewDocumentPresenter(this.dispatch);
    this.#events.subscribe((event) => event.type === "editor.changed"
      ? this.refreshUi() : this.#workspace.showStatus(event.key as MessageKey));
    this.mountSystems();
    this.#workspace.bind(this.dispatch);
    this.refreshUi();
  }

  private readonly dispatch: EditorCommandDispatch = (command): void => {
    this.handleCommand(command);
  };

  private handleCommand(command: EditorCommand): void {
    switch (command.type) {
      case "document.new": this.#newDocument.open(); return;
      case "document.exportPng": void this.#exporter.exportPng(); return;
      case "document.create":
        this.#session.createDocument(command.request, t("layers.default"), this.#canvas.size);
        this.changed(true); return;
      case "history.undo": case "history.redo":
        this.#session.historyStep(command.type === "history.undo" ? "undo" : "redo");
        this.changed(true); return;
      case "tool.select": this.#workspace.setTool(command.tool); return;
      case "view.fit": this.#session.fit(this.#canvas.size); this.changed(); return;
      case "view.rotate":
        this.#session.rotate(command.direction, this.#canvas.size); this.changed(); return;
      case "brush.library.open": this.#brushes.open(); return;
      case "layer.add": this.addLayer(); return;
      case "layer.select": this.#session.selectLayer(command.id); this.changed(); return;
      case "layer.visibility":
        this.#session.setLayerVisible(command.id, command.visible); this.changed(true); return;
    }
  }

  private mountSystems(): void {
    const viewport = new ViewportSystem({ canvas: this.#workspace.canvas,
      getView: () => this.#session.view, setView: (view) => this.#session.setView(view),
      requestRender: () => this.#canvas.requestRender() });
    viewport.mount();
    new DrawingSystem({ canvas: this.#workspace.canvas, viewport: this.#canvas,
      history: this.#session.history, getDocument: () => this.#session.document,
      getBrush: () => this.#session.brush, getColor: () => this.#workspace.color,
      getSize: () => this.#workspace.brushSize, getOpacity: () => this.#workspace.brushOpacity,
      getTool: () => this.#workspace.tool, canDraw: (event) => !viewport.isPanning(event),
      onCommit: () => this.changed(true), onBlocked: () => this.status("status.layerBlocked")
    }).mount();
  }

  private selectBrush(brush: BrushPreset): void {
    this.#session.selectBrush(brush);
    this.changed();
  }

  private addLayer(): void {
    const index = this.#session.document.layers.length + 1;
    this.#session.addLayer(`${t("layers.default")} ${index}`);
    this.changed(true);
  }

  private changed(save = false): void {
    if (save) this.#autosave.schedule();
    this.#events.emit({ type: "editor.changed" });
  }

  private status(key: MessageKey): void {
    this.#events.emit({ type: "editor.status", key });
  }

  private refreshUi(): void {
    const model = this.#session.viewModel();
    this.#workspace.render(model);
    this.#layers.render(model.layers, this.dispatch);
    this.#canvas.requestRender();
  }
}
