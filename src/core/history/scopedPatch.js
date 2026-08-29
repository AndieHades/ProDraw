import { isPixelEntry, swapPixelEntry } from './pixelPatch.ts';
import { isEffectsEntry, swapEffectsEntry } from './effectsPatch.ts';
import { isDescriptorEntry, swapDescriptorEntry } from './descriptorPatch.js';
import { isStructureEntry, swapStructureEntry } from './structurePatch.ts';
import { isRasterReferenceEntry,
  swapRasterReferenceEntry } from './rasterReferencePatch.js';
import { isCompoundEntry, swapCompoundEntry } from './compoundPatch.js';
import { isDocumentRemapEntry,
  swapDocumentRemapEntry } from './documentRemapPatch.ts';
import { isLegacyTileEntry, swapLegacyTileEntry } from './legacyTilePatch.ts';

const handlers = [
  [isLegacyTileEntry, (entry, env) => swapLegacyTileEntry(
    entry, env.state, env.markDirty)],
  [isPixelEntry, (entry, env) => swapPixelEntry(entry, env.state.layers,
    env.state.W, env.state.H, env.markDirty)],
  [isEffectsEntry, (entry, env) => swapEffectsEntry(entry, env.state)],
  [isDescriptorEntry, (entry, env) => swapDescriptorEntry(entry, env.state)],
  [isStructureEntry, (entry, env) => {
    const inverse = swapStructureEntry(entry, env.state);
    if (inverse) env.dirtyAll({ preserveGridBounds: true }); return inverse;
  }],
  [isRasterReferenceEntry, (entry, env) =>
    swapRasterReferenceEntry(entry, env.state, env.markDirty)],
  [isDocumentRemapEntry, (entry, env) => swapDocumentRemapEntry(
    entry, env.state, () => env.dirtyAll({ preserveGridBounds: true }))],
];

export const isScopedEntry = (entry) => isCompoundEntry(entry) ||
  handlers.some(([accepts]) => accepts(entry));

export function swapScopedEntry(entry, environment) {
  const inverse = isCompoundEntry(entry)
    ? swapCompoundEntry(entry, (child) => swapScopedEntry(child, environment))
    : handlers.find(([accepts]) => accepts(entry))?.[1](entry, environment);
  if (inverse && (isEffectsEntry(entry) || isCompoundEntry(entry))) {
    environment.state.fxSel.clear(); environment.state.fxCur = null;
    environment.state.fxDraft = null;
  }
  return inverse || null;
}
