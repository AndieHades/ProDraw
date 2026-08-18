// Растеризация ExportDocument в canvas: единственная точка композита (paintStack)
// переиспользуется с фильтром состава и флагом скрытых слоёв. Без своих циклов.
import { S } from '../../core/state.js';
import { paintStack } from '../../core/composite.js';
import { clipBase, folderOpacity } from '../../core/layers.js';
import { clippedShift, layerSrcSurface } from '../../core/layer-cache.js';
import { makeCanvas as cv } from '../../core/canvas.js';
import { drawEffectSurface } from '../../core/effect-surface.js';
import { collectIdx } from './tree.js';

// склейка набора узлов в один canvas W×H (эффекты слоёв/папок и обтравка — внутри paintStack).
// withBg — подложить фон-слой Background (для цельного экспорта всего документа)
export function flattenNodes(nodes, showHidden, withBg = false) {
  const set = collectIdx(nodes), c = cv(S.W, S.H), x = c.getContext('2d'); x.imageSmoothingEnabled = false;
  paintStack(x, false, { include: (i) => set.has(i), showHidden, bg: withBg });
  return c;
}

// canvas одного слоя со своими (запечёнными) эффектами
export function leafCanvas(node) {
  const c = cv(S.W, S.H), x = c.getContext('2d'); x.imageSmoothingEnabled = false;
  drawEffectSurface(x, layerSrcSurface(node.idx)); return c;
}

// Standalone leaf keeps document registration, layer/folder opacity, masks and
// clipping, but does not duplicate group-wide pixel effects into every PNG.
export function standaloneLayerCanvas(node) {
  const c = cv(S.W, S.H), x = c.getContext('2d'); x.imageSmoothingEnabled = false;
  const layer = S.layers[node.idx], base = clipBase(node.idx);
  const surface = layer.clip && base >= 0
    ? clippedShift(node.idx, base, 0, 0, 0, 0) : layerSrcSurface(node.idx);
  x.globalAlpha = (layer.opacity ?? 1) * folderOpacity(layer.fid);
  drawEffectSurface(x, surface); x.globalAlpha = 1; return c;
}

// RGBA-буфер canvas → планарные каналы {0:R,1:G,2:B,3:A} по W×H (для PSD)
export function splitChannels(canvas, W, H) {
  const d = canvas.getContext('2d').getImageData(0, 0, W, H).data, n = W * H, out = { 0: new Uint8Array(n), 1: new Uint8Array(n), 2: new Uint8Array(n), 3: new Uint8Array(n) };
  for (let p = 0; p < n; p++) { out[0][p] = d[p * 4]; out[1][p] = d[p * 4 + 1]; out[2][p] = d[p * 4 + 2]; out[3][p] = d[p * 4 + 3]; }
  return out;
}
