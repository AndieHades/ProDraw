import { BRUSH_STUDIO_CONTROLS } from "./brushStudioControls.ts";
import type { BrushControlDefinition, BrushStudioSectionId } from "./brushStudioTypes.ts";

const sections: readonly BrushStudioSectionId[] = ["strokePath", "stabilization", "taper",
  "shape", "grain", "rendering", "dynamics", "huion", "properties"];
const unavailable = new Set(["shape.hardness", "rendering.mode", "smudge.pull",
  "stylus.barrelAction", "stylus.eraserAction", "name"]);

export const LIVE_BRUSH_SECTIONS = sections.map(id => ({ id, labelKey: `studio.${id}`,
  controls: (BRUSH_STUDIO_CONTROLS[id] ?? []).filter(control => !unavailable.has(control.path))
    .map((control): BrushControlDefinition => {
      if (control.path === "shape.rotation") return { ...control, minimum: -1 };
      if (control.path === "shape.inputStyle") return { ...control, options: ["touch", "azimuth"] };
      return control;
    }) }));
export const LIVE_BRUSH_CONTROLS = LIVE_BRUSH_SECTIONS.flatMap(section => section.controls);
export const LIVE_BRUSH_STORE = "prodraw.live-brush-preferences.v1";
