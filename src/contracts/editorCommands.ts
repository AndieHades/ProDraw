import type { DrawingTool } from "./stroke";

export interface NewDocumentRequest {
  readonly name: string;
  readonly width: number;
  readonly height: number;
  readonly dpi: number;
}

export type EditorCommand =
  | { readonly type: "document.new" }
  | { readonly type: "document.create"; readonly request: NewDocumentRequest }
  | { readonly type: "document.exportPng" }
  | { readonly type: "history.undo" }
  | { readonly type: "history.redo" }
  | { readonly type: "tool.select"; readonly tool: DrawingTool }
  | { readonly type: "view.fit" }
  | { readonly type: "view.rotate"; readonly direction: -1 | 1 }
  | { readonly type: "brush.library.open" }
  | { readonly type: "layer.add" }
  | { readonly type: "layer.select"; readonly id: string }
  | { readonly type: "layer.visibility"; readonly id: string; readonly visible: boolean };

export type EditorCommandDispatch = (command: EditorCommand) => void;
