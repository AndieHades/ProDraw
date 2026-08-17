// Reversible layer-tree topology. Raster payloads stay on their existing layer
// objects; stable identities let full-document snapshots replace live clones safely.
const STRUCTURE_ID = Symbol('prodraw.structure-history-id');
let identitySequence = 0;

const defineIdentity = (target, value) => {
  Object.defineProperty(target, STRUCTURE_ID, {
    configurable: false, enumerable: false, writable: false, value,
  });
  identitySequence = Math.max(identitySequence, value);
  return value;
};

const identityOf = (target) => target[STRUCTURE_ID] ??
  defineIdentity(target, ++identitySequence);

export function inheritStructureIdentity(source, clone) {
  const identity = source?.[STRUCTURE_ID];
  if (identity != null && clone?.[STRUCTURE_ID] == null)
    defineIdentity(clone, identity);
  return clone;
}

const field = (target, property) => ({
  present: Object.prototype.hasOwnProperty.call(target, property),
  value: target[property],
});

const restoreField = (target, property, stored) => {
  if (stored.present) target[property] = stored.value;
  else delete target[property];
};

const selectedEffects = (state) => new Set([
  ...state.layers.flatMap((layer) => layer.effects || []),
  ...state.folders.flatMap((folder) => folder.effects || []),
]);

export function createStructureEntry(state) {
  return {
    kind: 'structure-patch',
    layers: state.layers.map((ref) => ({
      identity: identityOf(ref), ref, fid: field(ref, 'fid'),
    })),
    folders: state.folders.map((ref) => ({
      identity: identityOf(ref), ref, parent: field(ref, 'parent'),
      emptyPos: field(ref, 'emptyPos'),
    })),
    selection: {
      cur: state.cur, bgSel: state.bgSel, selFolder: state.selFolder,
      marked: [...state.marked], markedFolders: [...state.markedFolders],
      fxSel: [...state.fxSel], fxCur: state.fxCur,
    },
    layerSeq: state.layerSeq, folderSeq: state.folderSeq,
  };
}

export const isStructureEntry = (entry) => entry?.kind === 'structure-patch';

const resolve = (stored, current) => {
  const currentByIdentity = new Map(current.map((ref) => [identityOf(ref), ref]));
  return stored.map((item) => currentByIdentity.get(item.identity) || item.ref);
};

export function swapStructureEntry(entry, state) {
  if (!isStructureEntry(entry)) return null;
  const inverse = createStructureEntry(state);
  const layers = resolve(entry.layers, state.layers);
  const folders = resolve(entry.folders, state.folders);
  entry.layers.forEach((stored, index) => restoreField(layers[index], 'fid', stored.fid));
  entry.folders.forEach((stored, index) => {
    restoreField(folders[index], 'parent', stored.parent);
    restoreField(folders[index], 'emptyPos', stored.emptyPos);
  });
  state.layers = layers; state.folders = folders;
  state.layerSeq = entry.layerSeq; state.folderSeq = entry.folderSeq;
  state.cur = entry.selection.cur; state.bgSel = entry.selection.bgSel;
  state.selFolder = entry.selection.selFolder;
  state.marked = new Set(entry.selection.marked);
  state.markedFolders = new Set(entry.selection.markedFolders);
  const effects = selectedEffects(state);
  state.fxSel = new Set(entry.selection.fxSel.filter((effect) => effects.has(effect)));
  state.fxCur = effects.has(entry.selection.fxCur) ? entry.selection.fxCur : null;
  state.fxDraft = null;
  return inverse;
}
