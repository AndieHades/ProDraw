import type { BrushStudioSection } from "./brushStudioTypes";

export type { BrushControlDefinition, BrushStudioSection,
  BrushStudioSectionId } from "./brushStudioTypes";

export { BRUSH_STUDIO_CONTROLS } from "./brushStudioControls";

export const BRUSH_STUDIO_SECTIONS: readonly BrushStudioSection[] = [
  { id: "strokePath", labelKey: "studio.strokePath" },
  { id: "stabilization", labelKey: "studio.stabilization" },
  { id: "taper", labelKey: "studio.taper" },
  { id: "shape", labelKey: "studio.shape" },
  { id: "grain", labelKey: "studio.grain" },
  { id: "rendering", labelKey: "studio.rendering" },
  { id: "dynamics", labelKey: "studio.dynamics" },
  { id: "huion", labelKey: "studio.huion" },
  { id: "properties", labelKey: "studio.properties" },
  { id: "preview", labelKey: "studio.preview" },
  { id: "about", labelKey: "studio.about" }
];
