import type { CommandLayer, LayerCommandState } from "./LayerCommandState.ts";

export type LayerBooleanFlag = "lock" | "alphaLock" | "clip";

export function toggleLayerFlag(layer: CommandLayer,
  flag: LayerBooleanFlag): boolean {
  const value = !layer[flag]; layer[flag] = value; return value;
}

export function setOpacity(target: { opacity?: number }, value: number): number {
  const opacity = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 1));
  target.opacity = opacity; return opacity;
}

export function toggleVisibleChain(target: { visible?: boolean },
  ancestors: readonly { visible?: boolean }[]): boolean {
  const visible = target.visible === false || ancestors.some(
    (ancestor) => ancestor.visible === false);
  target.visible = visible;
  if (visible) for (const ancestor of ancestors) ancestor.visible = true;
  return visible;
}

export function toggleExclusiveReference(state: LayerCommandState,
  layer: CommandLayer): boolean | null {
  if (!state.layers.includes(layer)) return null;
  const enabled = !layer.reference;
  for (const item of state.layers) item.reference = item === layer && enabled;
  return enabled;
}
