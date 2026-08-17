const captureFrames = (state) => state.animator
  ? { present: true, value: state.animator.frames } : { present: false, value: null };

const field = (target, property) => ({
  present: Object.prototype.hasOwnProperty.call(target, property),
  value: target[property],
});

const restoreField = (target, property, stored) => {
  if (stored.present) target[property] = stored.value;
  else delete target[property];
};

const captureLayer = (layer, index) => ({ index, ref: layer,
  grid: field(layer, 'grid'), ext: field(layer, 'ext'),
  text: field(layer, 'text') });

export function createDocumentRemapEntry(state) {
  if (!state || !Number.isInteger(state.W) || !Number.isInteger(state.H) ||
    !Array.isArray(state.layers)) return null;
  return {
    kind: 'document-remap-patch', width: state.W, height: state.H,
    layers: state.layers.map(captureLayer), cur: state.cur,
    frames: captureFrames(state),
  };
}

export const isDocumentRemapEntry = (entry) =>
  entry?.kind === 'document-remap-patch';

export function swapDocumentRemapEntry(entry, state, onDirty) {
  if (!isDocumentRemapEntry(entry) || !Array.isArray(entry.layers) ||
    (entry.frames.present && !state.animator))
    return null;
  const layers = entry.layers.map((stored) => state.layers[stored.index]);
  if (layers.some((layer, index) => layer !== entry.layers[index].ref)) return null;
  const inverse = createDocumentRemapEntry(state); if (!inverse) return null;
  state.W = entry.width; state.H = entry.height;
  entry.layers.forEach((stored, index) => {
    const layer = layers[index];
    restoreField(layer, 'grid', stored.grid); restoreField(layer, 'ext', stored.ext);
    restoreField(layer, 'text', stored.text);
  });
  state.cur = Math.min(entry.cur, Math.max(0, state.layers.length - 1));
  if (state.animator) state.animator.frames = entry.frames.present
    ? entry.frames.value : {};
  onDirty?.(); return inverse;
}
