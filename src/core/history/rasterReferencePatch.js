import { cloneTextSource, isTextLayer } from '../../logic/text-model.js';
import { gridBoundsMetadata, setGridBounds } from '../../logic/raster.js';

const field = (target, property, cloneText = false) => ({
  present: Object.prototype.hasOwnProperty.call(target, property),
  value: cloneText && target[property]
    ? cloneTextSource(target[property]) : target[property],
});

const restoreField = (target, property, stored) => {
  if (stored.present) target[property] = stored.value;
  else delete target[property];
};

const uniqueIndices = (indices) => [...new Set(indices || [])];
const isRasterLayer = (layer) => !!layer && (!layer.kind || layer.kind === 'pixel');
const isReferenceLayer = (layer) => isRasterLayer(layer) || isTextLayer(layer);

function captureLayer(layer, index, textLayer = isTextLayer(layer)) {
  return { textLayer,
    index,
    grid: field(layer, 'grid'),
    rasterBounds: gridBoundsMetadata(layer.grid),
    ext: field(layer, 'ext'),
    text: field(layer, 'text', textLayer),
    ...(textLayer ? { name: field(layer, 'name'), kind: field(layer, 'kind') } : {}),
  };
}

const mergeBounds = (left, right) => !left ? right && { ...right }
  : !right ? { ...left } : ({ minx: Math.min(left.minx, right.minx),
    miny: Math.min(left.miny, right.miny), maxx: Math.max(left.maxx, right.maxx),
    maxy: Math.max(left.maxy, right.maxy) });

function damageBetween(before, after) {
  const outside = before.ext.value?.size || after.ext.value?.size;
  if (outside || !before.rasterBounds || !after.rasterBounds)
    return { known: false, bounds: null };
  return { known: true, bounds: mergeBounds(before.rasterBounds.bounds,
    after.rasterBounds.bounds) };
}

export function createRasterReferenceEntry(indices, state) {
  const targets = uniqueIndices(indices);
  if (!targets.length || targets.some((index) => !Number.isInteger(index) ||
    !isReferenceLayer(state.layers[index]))) return null;
  return {
    kind: 'raster-reference-patch',
    width: state.W,
    height: state.H,
    layers: targets.map((index) => captureLayer(state.layers[index], index)),
  };
}

export const isRasterReferenceEntry = (entry) =>
  entry?.kind === 'raster-reference-patch';

export function swapRasterReferenceEntry(entry, state, onDirty) {
  if (!isRasterReferenceEntry(entry) || entry.width !== state.W ||
    entry.height !== state.H) return null;
  const live = entry.layers.map((stored) => state.layers[stored.index]);
  if (live.some((layer, index) => entry.layers[index].textLayer
    ? !isReferenceLayer(layer) : !isRasterLayer(layer))) return null;
  const inverse = {
    kind: entry.kind,
    width: entry.width,
    height: entry.height,
    layers: live.map((layer, index) => captureLayer(layer,
      entry.layers[index].index, entry.layers[index].textLayer)),
  };
  entry.layers.forEach((stored, index) => {
    const layer = live[index];
    const damage = damageBetween(inverse.layers[index], stored);
    restoreField(layer, 'grid', stored.grid);
    restoreField(layer, 'ext', stored.ext);
    restoreField(layer, 'text', stored.text);
    if (stored.textLayer) {
      restoreField(layer, 'name', stored.name);
      restoreField(layer, 'kind', stored.kind);
    }
    if (!damage.known) onDirty(stored.index);
    else if (damage.bounds) onDirty(stored.index, damage.bounds);
    if (stored.rasterBounds) setGridBounds(layer.grid,
      stored.rasterBounds.bounds, stored.rasterBounds.exact);
  });
  return inverse;
}
