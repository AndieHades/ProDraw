import type { Layer } from "ag-psd";
import type {
  PsdBlendMode, PsdImportGroup, PsdImportLayer, PsdImportNode
} from "../../contracts/psdImport";
import { normalizePsdEffects } from "./psdEffectNormalizer";
import { psdJsonObject } from "./psdJson";
import { normalizeBitmap, normalizeMask } from "./psdPixels";

const blendMode = (value: Layer["blendMode"]): PsdBlendMode => value ?? "normal";

function common(layer: Layer, warnings: string[]) {
  return { name: layer.name ?? "", visible: layer.hidden !== true,
    opacity: Math.max(0, Math.min(1, layer.opacity ?? 1)),
    blendMode: blendMode(layer.blendMode),
    effects: normalizePsdEffects(layer.effects, warnings) };
}

function normalizeLayer(layer: Layer, warnings: string[]): PsdImportLayer {
  const bitmap = normalizeBitmap(layer.imageData, layer.left ?? 0, layer.top ?? 0);
  const masks = [normalizeMask("user", layer.mask), normalizeMask("real", layer.realMask)]
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

function normalizeGroup(layer: Layer, warnings: string[]): PsdImportGroup {
  return { kind: "group", ...common(layer, warnings), opened: layer.opened !== false,
    children: normalizePsdNodes(layer.children ?? [], warnings) };
}

export function normalizePsdNodes(
  layers: readonly Layer[], warnings: string[]
): readonly PsdImportNode[] {
  return layers.map((layer) => layer.children
    ? normalizeGroup(layer, warnings) : normalizeLayer(layer, warnings));
}

export function countPsdNodes(nodes: readonly PsdImportNode[]): number {
  let count = 0;
  for (const node of nodes) {
    count += 1;
    if (node.kind === "group") count += countPsdNodes(node.children);
  }
  return count;
}
