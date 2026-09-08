import { S } from "../state.ts";
import type { LoadedBrush } from "../../contracts/brush.ts";
import { BP_SMAX } from "../../config/limits.ts";
import { savedBrushControls, type SavedBrushControls } from "../../logic/brush/savedBrushControls.ts";
import { liveBrushPreferences } from "./LiveBrushPreferences.ts";

export type BrushTool = "pencil" | "eraser";
export const brushTool = (): BrushTool => S["tool"] === "eraser" ? "eraser" : "pencil";
export const brushShape = (tool: BrushTool = brushTool()): string =>
  (S["brushShape"] as Record<string, string>)[tool] ?? "round";
const sizeKey = (tool: BrushTool): string => tool === "eraser" ? "eraserSize" : "pencilSize";

export function rememberBrushToolControls(tool: BrushTool = brushTool()): void {
  liveBrushPreferences.update(brushShape(tool), { size: Number(S[sizeKey(tool)]),
    opacity: (S["brushOpacity"] as Record<string, number>)[tool] ?? 1 });
}

export function restoreBrushToolControls(tool: BrushTool, brush: LoadedBrush,
  fallback?: SavedBrushControls): void {
  const stored = liveBrushPreferences.get(brushShape(tool));
  const defaults = fallback ?? savedBrushControls(brush, BP_SMAX);
  const minimum = Math.max(1, Math.min(BP_SMAX, brush.properties.minimumSize));
  const maximum = Math.max(minimum, Math.min(BP_SMAX, brush.properties.maximumSize));
  S[sizeKey(tool)] = Math.max(minimum, Math.min(maximum, stored?.size ?? defaults.size));
  (S["brushOpacity"] as Record<string, number>)[tool] = stored?.opacity ?? defaults.opacity;
}
