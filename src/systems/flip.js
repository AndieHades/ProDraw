// Отражение по горизонтали/вертикали. С Selection — активная область слоя,
// без Selection — весь документ (все слои).
import { S } from '../core/state.js';
import * as bus from '../core/bus.ts';
import * as actions from '../core/actions.ts';
import { snapshot, snapshotRasterReferences } from '../core/history.js';
import { flipRaster } from '../logic/raster-remap.js';
import { markDirty } from '../core/layer-cache.js';
import { toast, t } from '../core/dom.js';
import { flipSelection } from './selection-transform.js';

function flipOne(L, horiz) {
  const raster = flipRaster(L.grid, L.ext, S.W, S.H, horiz);
  markDirty(S.layers.indexOf(L)); L.grid = raster.grid; L.ext = raster.ext;
}

export function flipLayer(horiz) {
  if (S.sel) { if (flipSelection(horiz)) toast(horiz ? t('toast.flippedH') : t('toast.flippedV')); return; }
  const ts = S.layers.filter(Boolean); if (!ts.length) return;
  const indices = ts.map((layer) => S.layers.indexOf(layer));
  if (!snapshotRasterReferences(indices)) snapshot();
  for (const L of ts) flipOne(L, horiz);
  bus.emit('render'); bus.emit('layers'); toast(horiz ? t('toast.flippedH') : t('toast.flippedV'));
}

actions.register('layer.flipH', () => flipLayer(true));
actions.register('layer.flipV', () => flipLayer(false));
