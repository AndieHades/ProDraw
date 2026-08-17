export type BrushStudioSectionId = "strokePath" | "stabilization" | "taper" |
  "shape" | "grain" | "rendering" | "dynamics" | "huion" | "properties" |
  "preview" | "about";

export interface BrushStudioSection {
  readonly id: BrushStudioSectionId;
  readonly labelKey: string;
}

export interface BrushControlDefinition {
  readonly path: string;
  readonly labelKey: string;
  readonly kind: "range" | "text" | "checkbox" | "select";
  readonly minimum?: number;
  readonly maximum?: number;
  readonly step?: number;
  readonly display?: "percent" | "number" | "degrees" | "pixels";
  readonly options?: readonly string[];
}

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

const percent = (path: string, labelKey: string, maximum = 1): BrushControlDefinition =>
  ({ path, labelKey, kind: "range", minimum: 0, maximum, step: 0.01,
    display: "percent" });

export const BRUSH_STUDIO_CONTROLS: Readonly<
  Partial<Record<BrushStudioSectionId, readonly BrushControlDefinition[]>>
> = {
  strokePath: [
    { ...percent("strokePath.spacing", "control.spacing", 4), minimum: 0.01 },
    percent("strokePath.spacingJitter", "control.spacingJitter"),
    percent("strokePath.lateralJitter", "control.lateralJitter", 4),
    percent("strokePath.linearJitter", "control.linearJitter", 4),
    percent("strokePath.fallOff", "control.fallOff")
  ],
  stabilization: [
    percent("stabilization.streamlineAmount", "control.streamlineAmount"),
    percent("stabilization.streamlinePressure", "control.streamlinePressure"),
    percent("stabilization.stabilizationAmount", "control.stabilizationAmount"),
    percent("stabilization.motionFilteringAmount", "control.motionFilteringAmount"),
    percent("stabilization.motionFilteringExpression", "control.motionFilteringExpression")
  ],
  taper: [percent("taper.start", "control.taperStart"),
    percent("taper.end", "control.taperEnd"),
    percent("taper.pressure", "control.taperPressure")],
  shape: [percent("shape.hardness", "control.hardness"),
    { path: "shape.angle", labelKey: "control.angle", kind: "range",
      minimum: -180, maximum: 180, step: 1, display: "degrees" },
    percent("shape.roundness", "control.roundness")],
  grain: [percent("grain.strength", "control.grainStrength"),
    { path: "grain.scale", labelKey: "control.grainScale", kind: "range",
      minimum: 0.05, maximum: 10, step: 0.05, display: "number" }],
  rendering: [percent("rendering.flow", "control.flow"),
    percent("rendering.opacity", "control.brushOpacity")],
  dynamics: [percent("dynamics.sizeByPressure", "control.sizePressure"),
    percent("dynamics.opacityByPressure", "control.opacityPressure"),
    { path: "dynamics.tiltToSize", labelKey: "control.tiltSize", kind: "range",
      minimum: -1, maximum: 1, step: 0.01, display: "percent" }],
  huion: [percent("stylus.minimumPressure", "control.minimumPressure", 0.5),
    percent("stylus.pressureCurve.1", "control.pressureCurveLow"),
    percent("stylus.pressureCurve.2", "control.pressureCurveHigh"),
    { path: "stylus.tiltEnabled", labelKey: "control.tiltEnabled", kind: "checkbox" },
    { path: "stylus.barrelAction", labelKey: "control.barrelAction", kind: "select",
      options: ["none", "eraser", "smudge"] },
    { path: "stylus.eraserAction", labelKey: "control.eraserAction", kind: "select",
      options: ["eraser", "smudge"] }],
  properties: [{ path: "name", labelKey: "control.brushName", kind: "text" },
    percent("smudge.pull", "control.smudgePull"),
    percent("smudge.pickup", "control.smudgePickup"),
    percent("smudge.flow", "control.smudgeFlow"),
    { path: "properties.maximumSize", labelKey: "control.maximumSize", kind: "range",
      minimum: 1, maximum: 2000, step: 1, display: "pixels" },
    { path: "properties.minimumSize", labelKey: "control.minimumSize", kind: "range",
      minimum: 0.1, maximum: 500, step: 0.1, display: "pixels" }]
};
