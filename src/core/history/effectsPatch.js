function cloneValue(value) {
  if (Array.isArray(value)) return value.map(cloneValue);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value)
    .map(([key, item]) => [key, cloneValue(item)]));
}

export const cloneEffects = (effects = []) => effects.map(cloneValue);

function describeTarget(target, state) {
  if (Number.isInteger(target)) return { kind: 'layer', index: target };
  if (target?.kind === 'layer' && Number.isInteger(target.index))
    return { kind: 'layer', index: target.index };
  if (target?.kind === 'folder' && Number.isInteger(target.id))
    return { kind: 'folder', id: target.id };
  const index = state.layers.indexOf(target);
  if (index >= 0) return { kind: 'layer', index };
  if (state.folders.includes(target) && Number.isInteger(target.id))
    return { kind: 'folder', id: target.id };
  return null;
}

const resolveTarget = (target, state) => target.kind === 'layer'
  ? state.layers[target.index]
  : state.folders.find((folder) => folder.id === target.id);
const targetKey = (target) => target.kind === 'layer'
  ? `layer:${target.index}` : `folder:${target.id}`;

export function createEffectsEntry(targets, state) {
  const list = Array.isArray(targets) ? targets : [targets ?? state.cur];
  const described = list.map((target) => describeTarget(target, state));
  if (!described.length || described.some((target) => !target)) return null;
  const unique = [...new Map(described.map((target) =>
    [targetKey(target), target])).values()];
  const resolved = unique.map((target) => resolveTarget(target, state));
  if (resolved.some((target) => !target)) return null;
  return { kind: 'effects-patch', targets: unique.map((target, index) => ({
    ...target, effects: cloneEffects(resolved[index].effects),
  })) };
}

export const isEffectsEntry = (entry) => entry?.kind === 'effects-patch';

export function swapEffectsEntry(entry, state) {
  const resolved = entry.targets.map((target) => resolveTarget(target, state));
  if (resolved.some((target) => !target)) return null;
  const inverse = { kind: 'effects-patch', targets: [] };
  entry.targets.forEach((target, index) => {
    inverse.targets.push({ kind: target.kind,
      ...(target.kind === 'layer' ? { index: target.index } : { id: target.id }),
      effects: cloneEffects(resolved[index].effects) });
    resolved[index].effects = cloneEffects(target.effects);
  });
  return inverse;
}
