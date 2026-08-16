import type { BrushStylusSettings } from "../../contracts/brush";
import type { DrawingTool } from "../../contracts/stroke";

export interface PointerButtonState {
  readonly pointerType: string;
  readonly button: number;
  readonly buttons: number;
}

export function resolveStrokeTool(
  selected: DrawingTool,
  pointer: PointerButtonState,
  stylus: BrushStylusSettings
): DrawingTool {
  if (selected !== "brush" || pointer.pointerType !== "pen") return selected;
  if (pointer.button === 5 || (pointer.buttons & 32) !== 0) return stylus.eraserAction;
  if (pointer.button === 2 || (pointer.buttons & 2) !== 0) {
    return stylus.barrelAction === "none" ? "brush" : stylus.barrelAction;
  }
  return "brush";
}
