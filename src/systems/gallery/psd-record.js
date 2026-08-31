import { newEffect, newLayerRecord } from '../../core/state.js';
import { defaultPalette, DEFAULT_ACTIVE } from '../../config/palette.js';
import { defaultReferenceBoard } from '../../core/reference-board.js';
import { runtimePsdEffectSpecs } from '../../logic/psd-effects.js';
import { psdGalleryPreview } from './psd-preview.ts';
import { createRasterCellInterner } from '../../logic/raster-cell-interner.js';
import { packedRgbaRecordFromBitmap } from '../../logic/raster/packedRgbaRecord.ts';

const copyEffects = (effects) => effects.map((effect) => ({ ...effect,
  properties: structuredClone(effect.properties) }));
const copyMasks = (masks) => masks.map((mask) => ({ ...mask,
  alpha: mask.alpha.slice() }));
const runtimePsdEffects = (sources, warnings) => runtimePsdEffectSpecs(sources, warnings)
  .map((spec) => ({ ...newEffect(spec.type, spec.params),
    visible: spec.visible, opacity: spec.opacity }));

function offCanvasPixels(bitmap, width, height, cells) {
  const ext = new Map(); if (!bitmap) return ext;
  for (let y = 0; y < bitmap.height; y++) for (let x = 0,
    offset = y * bitmap.width * 4; x < bitmap.width; x++, offset += 4) {
    const alpha = bitmap.rgba[offset + 3]; if (!alpha) continue;
    const px = bitmap.left + x, py = bitmap.top + y;
    if (px >= 0 && py >= 0 && px < width && py < height) continue;
    ext.set(`${px},${py}`, cells.rgba(bitmap.rgba[offset], bitmap.rgba[offset + 1],
      bitmap.rgba[offset + 2], alpha));
  }
  return ext;
}

function rasterLayer(node, width, height, fid, warnings, cells) {
  const layer = newLayerRecord(node.name, width, height), bitmap = node.bitmap;
  if (node.masks.some((mask) => mask.feather > 0)) warnings.add('mask.feather.approximate');
  const rasterRows = packedRgbaRecordFromBitmap(width, height, bitmap);
  return { ...layer, grid: [], rasterRows,
    ext: offCanvasPixels(bitmap, width, height, cells),
    fid, visible: node.visible, opacity: node.opacity,
    blendMode: node.blendMode, clip: node.clipping, lock: node.locked,
    alphaLock: node.alphaLocked, masks: copyMasks(node.masks),
    psdBounds: bitmap ? { left: bitmap.left, top: bitmap.top,
      width: bitmap.width, height: bitmap.height } : undefined,
    effects: runtimePsdEffects(node.effects, warnings),
    psdEffects: copyEffects(node.effects),
    ...(node.adjustment ? { psdAdjustment: structuredClone(node.adjustment) } : {}) };
}

function documentTree(document, warnings) {
  const layers = [], folders = [], cells = createRasterCellInterner(); let folderSeq = 0;
  const walk = (nodes, parent) => {
    const bottomFirst = document.stackOrder === 'bottom-first' ? nodes : [...nodes].reverse();
    for (const node of bottomFirst) {
      if (['height', 'linear height'].includes(node.blendMode)) {
        warnings.add(`blend.${node.blendMode}.approximate`);
      }
      if (node.kind === 'layer') {
        layers.push(rasterLayer(node, document.width, document.height,
          parent, warnings, cells));
      } else {
        const folder = { id: ++folderSeq, parent, name: node.name,
          open: node.opened, visible: node.visible, opacity: node.opacity,
          blendMode: node.blendMode, symLock: false,
          effects: runtimePsdEffects(node.effects, warnings),
          psdEffects: copyEffects(node.effects) };
        folders.push(folder); walk(node.children, folder.id);
      }
    }
  };
  walk(document.children, null);
  if (!layers.length) layers.push(newLayerRecord('Layer 1', document.width, document.height));
  return { layers, folders, folderSeq };
}

export function buildPsdGalleryRecord(id, name, document, sourceLocation = null) {
  const warnings = new Set(document.warnings), tree = documentTree(document, warnings);
  const palette = defaultPalette(), now = Date.now();
  return { id, kind: 'doc', folder: null, name, W: document.width, H: document.height,
    dpi: document.dpi, layerSeq: tree.layers.length, folderSeq: tree.folderSeq,
    layers: tree.layers, folders: tree.folders, animator: null,
    referenceBoard: defaultReferenceBoard(), grid: {}, bg: { color: null, visible: true },
    palette, active: palette[DEFAULT_ACTIVE].slice(), colorMode: 'rgba',
    preview: psdGalleryPreview(document),
    psdWarnings: [...warnings], sourceFormat: 'psd', sourceLocation,
    order: now, updated: now };
}
