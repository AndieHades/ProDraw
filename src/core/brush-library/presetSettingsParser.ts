import type {
  BrushFilteringMode, BrushGrainBehavior, BrushInputStyle, BrushPreset,
  BrushRenderingMode
} from "../../contracts/brush";
import type { BrushPresetFileV1 } from "../../contracts/brushLibrary";
import { normalizedResponseCurve } from "../../logic/brush/responseCurve";

export const clamp = (value: unknown, minimum: number, maximum: number,
  fallback: number): number => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.max(minimum, Math.min(maximum, numeric)) : fallback;
};
const choice = <T extends string>(value: unknown, allowed: readonly T[], fallback: T): T =>
  typeof value === "string" && allowed.includes(value as T) ? value as T : fallback;
const bool = (value: unknown, fallback: boolean): boolean =>
  typeof value === "boolean" ? value : fallback;
const filtering = (value: unknown, fallback: BrushFilteringMode) =>
  choice(value, ["none", "classic", "improved"], fallback);
const sourceName = (value: unknown, fallback: string | undefined) =>
  typeof value === "string" ? value.slice(0, 200) : fallback;
const curve = (value: unknown, fallback: readonly [number, number, number, number]) =>
  !Array.isArray(value) || value.length !== 4 ? fallback : value.map((point, index) =>
    clamp(point, 0, 1, fallback[index]!)) as unknown as [number, number, number, number];

export function parsePresetSettings(parsed: Partial<BrushPresetFileV1>,
  base: BrushPreset): Pick<BrushPreset, "strokePath" | "stabilization" | "taper" |
    "shape" | "grain" | "rendering" | "dynamics" | "smudge" | "stylus" |
    "properties" | "preview"> {
  const path = parsed.strokePath, stabilization = parsed.stabilization;
  const taper = parsed.taper, shape = parsed.shape, grain = parsed.grain;
  const rendering = parsed.rendering, dynamics = parsed.dynamics, smudge = parsed.smudge;
  const stylus = parsed.stylus, properties = parsed.properties, preview = parsed.preview;
  const shapeSource = sourceName(shape?.sourceName, base.shape.sourceName);
  const grainSource = sourceName(grain?.sourceName, base.grain.sourceName);
  return {
    strokePath: { spacing: clamp(path?.spacing, 0.01, 4, base.strokePath.spacing),
      spacingJitter: clamp(path?.spacingJitter, 0, 1, base.strokePath.spacingJitter),
      lateralJitter: clamp(path?.lateralJitter, 0, 4, base.strokePath.lateralJitter),
      linearJitter: clamp(path?.linearJitter, 0, 4, base.strokePath.linearJitter),
      fallOff: clamp(path?.fallOff, 0, 1, base.strokePath.fallOff),
      scatter: clamp(path?.scatter, 0, 4, base.strokePath.scatter) },
    stabilization: {
      streamlineAmount: clamp(stabilization?.streamlineAmount, 0, 1,
        base.stabilization.streamlineAmount),
      streamlinePressure: clamp(stabilization?.streamlinePressure, 0, 1,
        base.stabilization.streamlinePressure),
      stabilizationAmount: clamp(stabilization?.stabilizationAmount, 0, 1,
        base.stabilization.stabilizationAmount),
      motionFilteringAmount: clamp(stabilization?.motionFilteringAmount, 0, 1,
        base.stabilization.motionFilteringAmount),
      motionFilteringExpression: clamp(stabilization?.motionFilteringExpression, 0, 1,
        base.stabilization.motionFilteringExpression) },
    taper: { start: clamp(taper?.start, 0, 1, base.taper.start),
      end: clamp(taper?.end, 0, 1, base.taper.end),
      pressure: clamp(taper?.pressure, 0, 1, base.taper.pressure),
      size: clamp(taper?.size, 0, 1, base.taper.size),
      opacity: clamp(taper?.opacity, 0, 1, base.taper.opacity),
      tip: clamp(taper?.tip, 0, 1, base.taper.tip),
      tipAnimation: bool(taper?.tipAnimation, base.taper.tipAnimation),
      linkTipSizes: bool(taper?.linkTipSizes, base.taper.linkTipSizes),
      touchStart: clamp(taper?.touchStart, 0, 1, base.taper.touchStart),
      touchEnd: clamp(taper?.touchEnd, 0, 1, base.taper.touchEnd),
      touchSize: clamp(taper?.touchSize, 0, 1, base.taper.touchSize),
      touchOpacity: clamp(taper?.touchOpacity, 0, 1, base.taper.touchOpacity),
      touchTip: clamp(taper?.touchTip, 0, 1, base.taper.touchTip),
      touchLinkTipSizes: bool(taper?.touchLinkTipSizes, base.taper.touchLinkTipSizes) },
    shape: { hardness: clamp(shape?.hardness, 0, 1, base.shape.hardness),
      angle: clamp(shape?.angle, -Math.PI, Math.PI, base.shape.angle),
      roundness: clamp(shape?.roundness, 0.05, 1, base.shape.roundness),
      ...(shapeSource ? { sourceName: shapeSource } : {}),
      inputStyle: choice<BrushInputStyle>(shape?.inputStyle,
        ["touch", "azimuth", "azimuth-roll"], base.shape.inputStyle),
      relativeToStroke: bool(shape?.relativeToStroke, base.shape.relativeToStroke),
      rotation: clamp(shape?.rotation, -1, 1, base.shape.rotation),
      scatter: clamp(shape?.scatter, 0, 1, base.shape.scatter),
      count: Math.round(clamp(shape?.count, 1, 16, base.shape.count)),
      countJitter: clamp(shape?.countJitter, 0, 1, base.shape.countJitter),
      randomized: bool(shape?.randomized, base.shape.randomized),
      flipX: bool(shape?.flipX, base.shape.flipX), flipY: bool(shape?.flipY, base.shape.flipY),
      pressureRoundness: clamp(shape?.pressureRoundness, 0, 1, base.shape.pressureRoundness),
      tiltRoundness: clamp(shape?.tiltRoundness, 0, 1, base.shape.tiltRoundness),
      horizontalJitter: clamp(shape?.horizontalJitter, 0, 1, base.shape.horizontalJitter),
      verticalJitter: clamp(shape?.verticalJitter, 0, 1, base.shape.verticalJitter),
      filtering: filtering(shape?.filtering, base.shape.filtering) },
    grain: { strength: clamp(grain?.strength, 0, 1, base.grain.strength),
      scale: clamp(grain?.scale, 0.01, 10, base.grain.scale),
      ...(grainSource ? { sourceName: grainSource } : {}),
      behavior: choice<BrushGrainBehavior>(grain?.behavior,
        ["moving", "texturized"], base.grain.behavior),
      movement: clamp(grain?.movement, 0, 1, base.grain.movement),
      zoom: clamp(grain?.zoom, 0.05, 4, base.grain.zoom),
      rotation: clamp(grain?.rotation, -Math.PI, Math.PI, base.grain.rotation),
      minimumDepth: clamp(grain?.minimumDepth, 0, 1, base.grain.minimumDepth),
      depthJitter: clamp(grain?.depthJitter, 0, 1, base.grain.depthJitter),
      offsetJitter: bool(grain?.offsetJitter, base.grain.offsetJitter),
      brightness: clamp(grain?.brightness, -1, 1, base.grain.brightness),
      contrast: clamp(grain?.contrast, -1, 1, base.grain.contrast),
      filtering: filtering(grain?.filtering, base.grain.filtering) },
    rendering: { flow: clamp(rendering?.flow, 0.01, 1, base.rendering.flow),
      opacity: clamp(rendering?.opacity, 0.01, 1, base.rendering.opacity),
      mode: choice<BrushRenderingMode>(rendering?.mode, ["light-glaze", "uniform-glaze",
        "intense-glaze", "heavy-glaze", "uniform-blending", "intense-blending"],
      base.rendering.mode) },
    dynamics: { sizeByPressure: clamp(dynamics?.sizeByPressure, 0, 1,
      base.dynamics.sizeByPressure), opacityByPressure: clamp(dynamics?.opacityByPressure,
      0, 1, base.dynamics.opacityByPressure), tiltToSize: clamp(dynamics?.tiltToSize,
      -1, 1, base.dynamics.tiltToSize),
      pressureSizeCurve: normalizedResponseCurve(dynamics?.pressureSizeCurve ??
        base.dynamics.pressureSizeCurve),
      pressureOpacityCurve: normalizedResponseCurve(dynamics?.pressureOpacityCurve ??
        base.dynamics.pressureOpacityCurve),
      opacityJitter: clamp(dynamics?.opacityJitter, 0, 1,
        base.dynamics.opacityJitter ?? 0), speedOpacity: clamp(dynamics?.speedOpacity,
        -1, 1, base.dynamics.speedOpacity ?? 0), tiltOpacity: clamp(dynamics?.tiltOpacity,
        -1, 1, base.dynamics.tiltOpacity ?? 0) },
    smudge: { flow: clamp(smudge?.flow, 0, 1, base.smudge.flow),
      pickup: clamp(smudge?.pickup, 0, 1, base.smudge.pickup),
      pull: clamp(smudge?.pull, 0, 1, base.smudge.pull) },
    stylus: { minimumPressure: clamp(stylus?.minimumPressure, 0, 0.5,
      base.stylus.minimumPressure), pressureCurve: curve(stylus?.pressureCurve,
      base.stylus.pressureCurve), tiltEnabled: bool(stylus?.tiltEnabled,
      base.stylus.tiltEnabled), barrelAction: choice(stylus?.barrelAction,
      ["none", "eraser", "smudge"], base.stylus.barrelAction),
      eraserAction: choice(stylus?.eraserAction, ["eraser", "smudge"],
        base.stylus.eraserAction) },
    properties: { maximumSize: clamp(properties?.maximumSize, 1, 2000,
      base.properties.maximumSize), minimumSize: clamp(properties?.minimumSize, 0.1, 500,
      base.properties.minimumSize), maximumOpacity: clamp(properties?.maximumOpacity,
      0, 1, base.properties.maximumOpacity), minimumOpacity: clamp(properties?.minimumOpacity,
      0, 1, base.properties.minimumOpacity), orientToScreen: bool(properties?.orientToScreen,
      base.properties.orientToScreen) },
    preview: { stamp: bool(preview?.stamp, base.preview.stamp),
      size: clamp(preview?.size, 0.05, 2, base.preview.size),
      pressureMinimum: clamp(preview?.pressureMinimum, 0, 1, base.preview.pressureMinimum),
      pressureScale: clamp(preview?.pressureScale, 0, 2, base.preview.pressureScale),
      tiltAngle: clamp(preview?.tiltAngle, -1, 1, base.preview.tiltAngle) }
  };
}
