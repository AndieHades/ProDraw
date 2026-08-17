import { TEXT_DEFAULT, TEXT_BOX } from '../config/text.js';
import { cloneTextSource, normalizeTextPrefs, normalizeTextSource, isTextLayer } from '../logic/text-model.js';
import { gridBoundsMetadata, setGridBounds } from '../logic/raster.js';
import { textRasterBounds } from './text-canvas-raster.js';
import { materializeTextGrid, rasterTextGrid } from './text-grid-raster.js';

const validGrid = (grid, width, height) => Array.isArray(grid) &&
  grid.length === height && grid[0]?.length === width;

function ensureTextGridBounds(layer, width, height, source = layer.text) {
  if (!validGrid(layer.grid, width, height) || gridBoundsMetadata(layer.grid)) return;
  setGridBounds(layer.grid, source?.value?.trim()
    ? textRasterBounds(source, width, height) : null, false);
}

export function makeTextLayer(name, W, H, prefs = {}, at = {}) {
  const p = normalizeTextPrefs(prefs);
  const layer = { name, grid: [], opacity: 1, visible: true, fid: null, clip: false, lock: false,
    alphaLock: false, reference: false, ext: new Map(), effects: [], kind: 'text',
    text: normalizeTextSource({ ...TEXT_DEFAULT, ...prefs, ...p, box: { ...TEXT_BOX, x: at.x || 0, y: at.y || 0 } }) };
  updateTextLayerGrid(layer, W, H);
  return layer;
}

export function normalizeTextLayer(L, W, H, fonts) {
  if (!isTextLayer(L)) return L;
  L.text = cloneTextSource(L.text);
  const usable = validGrid(L.grid, W, H);
  L.ext = L.ext || new Map();
  if (!usable) { L.grid = []; updateTextLayerGrid(L, W, H, fonts); }
  else if (!gridBoundsMetadata(L.grid)) setGridBounds(L.grid,
    L.text.value.trim() ? textRasterBounds(L.text, W, H) : null, false);
  return L;
}

export function updateTextLayerGrid(L, W, H, fonts, previousText = L.text) {
  if (!isTextLayer(L)) return false;
  ensureTextGridBounds(L, W, H, previousText);
  L.text = cloneTextSource(L.text);
  L.grid = rasterTextGrid(L.text, W, H, fonts, L.grid);
  L.ext = new Map();
  return true;
}

export function clearTextLayerGrid(L, W, H) {
  if (!isTextLayer(L)) return false;
  ensureTextGridBounds(L, W, H);
  L.grid = rasterTextGrid({ ...L.text, value: '' }, W, H, undefined, L.grid);
  L.ext = new Map(); return true;
}

export const textLayerBounds = (L, W, H) => isTextLayer(L)
  ? textRasterBounds(L.text, W, H) : null;

export function textDamageBounds(before, after, W, H) {
  const left = before ? textRasterBounds(before, W, H) : null;
  const right = after ? textRasterBounds(after, W, H) : null;
  if (!left) return right; if (!right) return left;
  return { minx: Math.min(left.minx, right.minx), miny: Math.min(left.miny, right.miny),
    maxx: Math.max(left.maxx, right.maxx), maxy: Math.max(left.maxy, right.maxy) };
}

export function rasterizeTextLayer(L, W, H, fonts) {
  if (!updateTextLayerGrid(L, W, H, fonts)) return false;
  materializeTextGrid(L.grid, W, H);
  L.kind = 'pixel';
  delete L.text;
  return true;
}
