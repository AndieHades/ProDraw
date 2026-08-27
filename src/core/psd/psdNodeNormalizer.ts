import { getLayerImageData, getLayerMaskImageData,
  getLayerRealMaskImageData, type Layer } from "ag-psd";
import type {
  PsdBlendMode, PsdImportGroup, PsdImportLayer, PsdImportNode
} from "../../contracts/psdImport.ts";
import { normalizePsdEffects } from "./psdEffectNormalizer.ts";
import { psdJsonObject } from "./psdJson.ts";
import { normalizeBitmap, normalizeMask } from "./psdPixels.ts";

const blendMode = (value: Layer["blendMode"]): PsdBlendMode => value ?? "normal";

function common(layer: Layer, warnings: string[]) {
  return { name: layer.name ?? "", visible: layer.hidden !== true,
    opacity: Math.max(0, Math.min(1, layer.opacity ?? 1)),
    blendMode: blendMode(layer.blendMode),
    effects: normalizePsdEffects(layer.effects, warnings) };
}

type ReserveBytes = (bytes: number) => void;

function normalizeLayer(layer: Layer, warnings: string[], reserve: ReserveBytes): PsdImportLayer {
  const bitmap = normalizeBitmap(getLayerImageData(layer), layer.left ?? 0,
    layer.top ?? 0, true, reserve);
  const masks = [normalizeMask("user", layer.mask, getLayerMaskImageData(layer), reserve),
    normalizeMask("real", layer.realMask, getLayerRealMaskImageData(layer), reserve)]
    .filter((mask) => mask !== undefined);
  const adjustment = psdJsonObject(layer.adjustment);
  if (layer.adjustment) warnings.push(`adjustment.${layer.adjustment.type}`);
  return { kind: "layer", ...common(layer, warnings),
    ...(bitmap ? { bitmap } : {}), masks,
    clipping: layer.clipping === true,
    locked: layer.protected?.composite === true,
    alphaLocked: layer.transparencyProtected === true ||
      layer.protected?.transparency === true,
    ...(adjustment ? { adjustment } : {}) };
}

function normalizeGroup(layer: Layer, warnings: string[], reserve: ReserveBytes): PsdImportGroup {
  return { kind: "group", ...common(layer, warnings), opened: layer.opened !== false,
    children: normalizePsdNodes(layer.children ?? [], warnings, reserve) };
}

export function normalizePsdNodes(
  layers: readonly Layer[], warnings: string[], reserve: ReserveBytes = () => undefined
): readonly PsdImportNode[] {
  return layers.map((layer) => layer.children
    ? normalizeGroup(layer, warnings, reserve) : normalizeLayer(layer, warnings, reserve));
}

export function countPsdNodes(nodes: readonly Layer[]): number {
  let count = 0;
  for (const node of nodes) {
    count += 1;
    if (node.children) count += countPsdNodes(node.children);
  }
  return count;
}
