import type { BrushControlDefinition, BrushStudioSectionId } from "./brushStudioTypes";

const percent = (path: string, labelKey: string, maximum = 1): BrushControlDefinition =>
  ({ path, labelKey, kind: "range", minimum: 0, maximum, step: 0.01,
    display: "percent" });
const toggle = (path: string, labelKey: string): BrushControlDefinition =>
  ({ path, labelKey, kind: "checkbox" });
const select = (path: string, labelKey: string,
  options: readonly string[]): BrushControlDefinition =>
  ({ path, labelKey, kind: "select", options });
const degrees = (path: string, labelKey: string): BrushControlDefinition =>
  ({ path, labelKey, kind: "range", minimum: -180, maximum: 180, step: 1,
    display: "degrees" });

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
    percent("taper.end", "control.taperEnd"), percent("taper.size", "control.taperSize"),
    percent("taper.opacity", "control.taperOpacity"),
    percent("taper.pressure", "control.taperPressure"),
    percent("taper.tip", "control.taperTip"),
    toggle("taper.tipAnimation", "control.tipAnimation"),
    toggle("taper.linkTipSizes", "control.linkTipSizes"),
    percent("taper.touchStart", "control.touchTaperStart"),
    percent("taper.touchEnd", "control.touchTaperEnd"),
    percent("taper.touchSize", "control.touchTaperSize"),
    percent("taper.touchOpacity", "control.touchTaperOpacity"),
    percent("taper.touchTip", "control.touchTaperTip"),
    toggle("taper.touchLinkTipSizes", "control.touchLinkTipSizes")],
  shape: [
    percent("shape.hardness", "control.hardness"), degrees("shape.angle", "control.angle"),
    percent("shape.roundness", "control.roundness"),
    select("shape.inputStyle", "control.inputStyle", ["touch", "azimuth", "azimuth-roll"]),
    toggle("shape.relativeToStroke", "control.relativeToStroke"),
    percent("shape.rotation", "control.shapeRotation"),
    percent("shape.scatter", "control.shapeScatter"),
    { path: "shape.count", labelKey: "control.shapeCount", kind: "range",
      minimum: 1, maximum: 16, step: 1, display: "number" },
    percent("shape.countJitter", "control.countJitter"),
    toggle("shape.randomized", "control.randomized"),
    toggle("shape.flipX", "control.flipX"), toggle("shape.flipY", "control.flipY"),
    percent("shape.pressureRoundness", "control.pressureRoundness"),
    percent("shape.tiltRoundness", "control.tiltRoundness"),
    percent("shape.horizontalJitter", "control.horizontalJitter"),
    percent("shape.verticalJitter", "control.verticalJitter"),
    select("shape.filtering", "control.shapeFiltering", ["none", "classic", "improved"])
  ],
  grain: [
    select("grain.behavior", "control.grainBehavior", ["moving", "texturized"]),
    percent("grain.movement", "control.grainMovement"),
    percent("grain.strength", "control.grainDepth"),
    { path: "grain.scale", labelKey: "control.grainScale", kind: "range",
      minimum: 0.01, maximum: 10, step: 0.01, display: "number" },
    { path: "grain.zoom", labelKey: "control.grainZoom", kind: "range",
      minimum: 0.05, maximum: 4, step: 0.01, display: "number" },
    degrees("grain.rotation", "control.grainRotation"),
    percent("grain.minimumDepth", "control.minimumDepth"),
    percent("grain.depthJitter", "control.depthJitter"),
    toggle("grain.offsetJitter", "control.offsetJitter"),
    { path: "grain.brightness", labelKey: "control.brightness", kind: "range",
      minimum: -1, maximum: 1, step: 0.01, display: "percent" },
    { path: "grain.contrast", labelKey: "control.contrast", kind: "range",
      minimum: -1, maximum: 1, step: 0.01, display: "percent" },
    select("grain.filtering", "control.grainFiltering", ["none", "classic", "improved"])
  ],
  rendering: [select("rendering.mode", "control.renderingMode", ["light-glaze",
    "uniform-glaze", "intense-glaze", "heavy-glaze", "uniform-blending",
    "intense-blending"]), percent("rendering.flow", "control.flow"),
  percent("rendering.opacity", "control.brushOpacity")],
  dynamics: [percent("dynamics.sizeByPressure", "control.sizePressure"),
    percent("dynamics.opacityByPressure", "control.opacityPressure"),
    percent("dynamics.opacityJitter", "control.opacityJitter"),
    { path: "dynamics.speedOpacity", labelKey: "control.speedOpacity", kind: "range",
      minimum: -1, maximum: 1, step: 0.01, display: "percent" },
    { path: "dynamics.tiltOpacity", labelKey: "control.tiltOpacity", kind: "range",
      minimum: -1, maximum: 1, step: 0.01, display: "percent" },
    { path: "dynamics.tiltToSize", labelKey: "control.tiltSize", kind: "range",
      minimum: -1, maximum: 1, step: 0.01, display: "percent" }],
  huion: [percent("stylus.minimumPressure", "control.minimumPressure", 0.5),
    percent("stylus.pressureCurve.1", "control.pressureCurveLow"),
    percent("stylus.pressureCurve.2", "control.pressureCurveHigh"),
    toggle("stylus.tiltEnabled", "control.tiltEnabled"),
    select("stylus.barrelAction", "control.barrelAction", ["none", "eraser", "smudge"]),
    select("stylus.eraserAction", "control.eraserAction", ["eraser", "smudge"])],
  properties: [{ path: "name", labelKey: "control.brushName", kind: "text" },
    toggle("properties.orientToScreen", "control.orientToScreen"),
    percent("smudge.pull", "control.smudgePull"),
    { path: "properties.maximumSize", labelKey: "control.maximumSize", kind: "range",
      minimum: 1, maximum: 2000, step: 1, display: "pixels" },
    { path: "properties.minimumSize", labelKey: "control.minimumSize", kind: "range",
      minimum: 0.1, maximum: 500, step: 0.1, display: "pixels" },
    percent("properties.maximumOpacity", "control.maximumOpacity"),
    percent("properties.minimumOpacity", "control.minimumOpacity")],
  preview: [toggle("preview.stamp", "control.stampPreview"),
    percent("preview.size", "control.previewSize", 2),
    percent("preview.pressureMinimum", "control.previewPressureMinimum"),
    percent("preview.pressureScale", "control.previewPressureScale", 2),
    percent("preview.tiltAngle", "control.previewTiltAngle")]
};
