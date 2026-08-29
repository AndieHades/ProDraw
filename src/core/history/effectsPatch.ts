import type { EffectsEntry, EffectsOwner, EffectsState, EffectsTarget,
  EffectsTargetInput, StoredEffectsTarget } from "./effectsPatchTypes.ts";

function cloneValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(cloneValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value)
    .map(([key, item]) => [key, cloneValue(item)]));
}

export const cloneEffects = (effects: readonly unknown[] = []): unknown[] =>
  effects.map(cloneValue);

const targetLike = (value: unknown): Partial<EffectsTarget> | null =>
  value && typeof value === "object" ? value as Partial<EffectsTarget> : null;

function describeTarget(target: EffectsTargetInput, state: EffectsState): EffectsTarget | null {
  if (typeof target === "number" && Number.isInteger(target))
    return { kind: "layer", index: target };
  const descriptor = targetLike(target);
  if (descriptor?.kind === "layer" && Number.isInteger(descriptor.index))
    return { kind: "layer", index: descriptor.index ?? -1 };
  if (descriptor?.kind === "folder" && Number.isInteger(descriptor.id))
    return { kind: "folder", id: descriptor.id ?? -1 };
  const index = state.layers.indexOf(target as EffectsOwner);
  if (index >= 0) return { kind: "layer", index };
  const folder = state.folders.find((item) => item === target);
  return folder ? { kind: "folder", id: folder.id } : null;
}

const resolveTarget = (target: EffectsTarget, state: EffectsState): EffectsOwner | undefined =>
  target.kind === "layer" ? state.layers[target.index]
    : state.folders.find((folder) => folder.id === target.id);
const targetKey = (target: EffectsTarget): string => target.kind === "layer"
  ? `layer:${target.index}` : `folder:${target.id}`;

export function createEffectsEntry(targets: EffectsTargetInput | readonly EffectsTargetInput[] |
  null | undefined, state: EffectsState): EffectsEntry | null {
  const list: readonly EffectsTargetInput[] = Array.isArray(targets)
    ? targets : [targets ?? state.cur];
  const described = list.map((target) => describeTarget(target, state));
  if (!described.length || described.some((target) => !target)) return null;
  const unique = [...new Map(described.map((target) =>
    [targetKey(target as EffectsTarget), target as EffectsTarget])).values()];
  const stored: StoredEffectsTarget[] = [];
  for (const target of unique) {
    const owner = resolveTarget(target, state); if (!owner) return null;
    stored.push({ ...target, effects: cloneEffects(owner.effects) });
  }
  return { kind: "effects-patch", targets: stored };
}

export function isEffectsEntry(entry: unknown): entry is EffectsEntry {
  return !!entry && typeof entry === "object" &&
    (entry as Partial<EffectsEntry>).kind === "effects-patch" &&
    Array.isArray((entry as Partial<EffectsEntry>).targets);
}

export function swapEffectsEntry(entry: unknown, state: EffectsState): EffectsEntry | null {
  if (!isEffectsEntry(entry)) return null;
  const resolved = entry.targets.map((target) => resolveTarget(target, state));
  if (resolved.some((target) => !target)) return null;
  const inverse: StoredEffectsTarget[] = [];
  entry.targets.forEach((target, index) => {
    const owner = resolved[index]; if (!owner) return;
    inverse.push({ ...(target.kind === "layer"
      ? { kind: "layer" as const, index: target.index }
      : { kind: "folder" as const, id: target.id }),
      effects: cloneEffects(owner.effects) });
    owner.effects = cloneEffects(target.effects);
  });
  return { kind: "effects-patch", targets: inverse };
}
