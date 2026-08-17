import { DrawingSystem } from "../systems/drawing/DrawingSystem";
import { ViewportSystem } from "../systems/viewport/ViewportSystem";
import type { CanvasPresenter } from "../ui/canvas/CanvasPresenter";
import type { WorkspacePresenter } from "../ui/workspace/WorkspacePresenter";
import type { RasterEditorSession } from "./RasterEditorSession";

export interface InputSystemComposition {
  readonly workspace: WorkspacePresenter;
  readonly session: RasterEditorSession;
  readonly canvas: CanvasPresenter;
  readonly onCommit: () => void;
  readonly onBlocked: () => void;
}

export function mountInputSystems(options: InputSystemComposition): void {
  const input: { drawing?: DrawingSystem } = {};
  const viewport = new ViewportSystem({ canvas: options.workspace.canvas,
    getView: () => options.session.view, setView: (view) => options.session.setView(view),
    requestRender: () => options.canvas.requestRender(),
    canTouchNavigate: () => !input.drawing?.isActive ||
      input.drawing.activePointerKind === "touch",
    onTouchGestureStart: () => input.drawing?.cancelActive(false) });
  viewport.mount();
  input.drawing = new DrawingSystem({ canvas: options.workspace.canvas,
    viewport: options.canvas, history: options.session.history,
    getDocument: () => options.session.document, getBrush: () => options.session.brush,
    getColor: () => options.workspace.color, getSize: () => options.workspace.brushSize,
    getOpacity: () => options.workspace.brushOpacity, getTool: () => options.workspace.tool,
    getFingerPaintEnabled: () => options.workspace.fingerPaintEnabled,
    canDraw: (event) => !viewport.isNavigating(event),
    onCommit: options.onCommit, onBlocked: options.onBlocked });
  input.drawing.mount();
}
