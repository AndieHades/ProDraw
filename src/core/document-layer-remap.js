import { inheritStructureIdentity } from './history/structurePatch.js';
import { cloneTextSource, isTextLayer } from '../logic/text-model.js';
import { cloneTilemap } from '../logic/tilemap-data.js';

function cloneValue(value) {
  if (Array.isArray(value)) return value.map(cloneValue);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value)
    .map(([key, item]) => [key, cloneValue(item)]));
}

export function remappedLayer(layer, raster, options = {}) {
  const text = isTextLayer(layer) ? cloneTextSource(layer.text) : layer.text;
  const next = {
    ...layer, grid: raster.grid, ext: raster.ext,
    effects: (layer.effects || []).map(cloneValue),
    text: options.moveText && text ? options.moveText(text) : text,
    tilemap: options.tilemap || (layer.tilemap ? cloneTilemap(layer.tilemap) : undefined),
    tilemapSettings: layer.tilemapSettings ? { ...layer.tilemapSettings } : undefined,
  };
  return inheritStructureIdentity(layer, next);
}

export function applyLayerRemap(layer, raster, options = {}) {
  layer.grid = raster.grid; layer.ext = raster.ext;
  if (isTextLayer(layer)) {
    const text = cloneTextSource(layer.text);
    layer.text = options.moveText ? options.moveText(text) : text;
  }
  if (options.tilemap) layer.tilemap = options.tilemap;
  else if (layer.tilemap) layer.tilemap = cloneTilemap(layer.tilemap);
  return layer;
}
