import type { BrushPreset, LoadedBrush } from "../../contracts/brush.ts";
import type { OpenBrushSettings } from "../../contracts/liveBrushSettings.ts";
import { liveBrushPreferences } from "../../core/brush/LiveBrushPreferences.ts";
import { brushShape, brushTool, rememberBrushToolControls, restoreBrushToolControls } from
  "../../core/brush/liveBrushToolControls.ts";
import * as bus from "../../core/bus.ts";
import { presetBrushForShape } from "./preset-brush.ts";

const model = (brush: LoadedBrush) => {
  const runtime = new Set(["shapeMap", "grainMap", "nativeShapeMap", "nativeGrainMap", "compatibility", "warnings"]);
  const preset = Object.fromEntries(Object.entries(brush).filter(([key]) => !runtime.has(key))) as unknown as BrushPreset;
  return { preset, hasGrain: brush.grainMap !== null };
};

export function openBrushSettings(open: OpenBrushSettings): void {
  const tool = brushTool(), shape = brushShape(tool);
  const brush = presetBrushForShape(shape); if (!brush) return;
  rememberBrushToolControls(tool);
  open(model(brush), {
    change(path, value) {
      liveBrushPreferences.update(shape, { values: { [path]: value } });
      const next = presetBrushForShape(shape);
      if (next && path.startsWith("properties.")) restoreBrushToolControls(tool, next);
    },
    reset() {
      liveBrushPreferences.reset(shape);
      const original = presetBrushForShape(shape) ?? brush;
      restoreBrushToolControls(tool, original); return model(original);
    },
    close() { bus.emit("tool"); bus.emit("render"); }
  });
}
