// PSD-формат: разворачивает ExportDocument в дескрипторы (слои + разделители
// групп lsct), эффекты слоёв/папок запекаются в пиксели (живые lfx2 не пишем —
// сохраняем визуал и структуру). Объявляет свои возможности для UI.
import { S } from '../../core/state.js';
import { folderFx } from '../../core/effects-render.js';
import { flattenNodes, leafCanvas, splitChannels } from './render.js';
import { writePsd } from './psd-write.js';

const leafDesc = (n) => ({ name: n.name, opacity: Math.round((n.opacity ?? 1) * 255), hidden: !n.visible, clip: false, lsct: 0, data: splitChannels(leafCanvas(n), S.W, S.H) });
const rasterDesc = (name, canvas) => ({ name, opacity: 255, hidden: false, clip: false, lsct: 0, data: splitChannels(canvas, S.W, S.H) });
const divider = (lsct, name, hidden) => ({ name, opacity: 255, hidden: !!hidden, clip: false, lsct, data: null });

// дерево → плоский список слоёв (низ→верх) с разделителями групп
function emit(nodes, out) {
  for (const n of nodes) {
    if (n.kind === 'layer') { out.push(leafDesc(n)); continue; }
    out.push(divider(3, '</Layer group>', false));
    const below = n.effects.length ? folderFx(n.folder, 'below') : null;
    if (below) out.push(rasterDesc(n.name + ' fx', below));
    emit(n.children, out);
    const above = n.effects.length ? folderFx(n.folder, 'above') : null;
    if (above) out.push(rasterDesc(n.name + ' fx+', above));
    out.push(divider(n.open ? 1 : 2, n.name, !n.visible));
  }
}

export const PSD = {
  id: 'psd', label: 'PSD', ext: 'psd', mime: 'image/vnd.adobe.photoshop', desc: 'Photoshop PSD',
  supportsFlattened: true, supportsLayered: true, supportsSeparateFiles: true,
  supportsFolders: true, supportsLayerEffects: true, supportsHiddenLayers: true,
  // один файл со всей структурой слоёв/папок
  encodeLayered(doc, base) {
    const layers = []; emit(doc.root, layers);
    const comp = splitChannels(flattenNodes(doc.root, false, true), S.W, S.H);
    return Promise.resolve({ name: base + '.psd', blob: writePsd({ W: S.W, H: S.H, layers, comp }), mime: this.mime, desc: this.desc });
  },
  // одиночный склеенный canvas → однослойный PSD (для flattened/separate)
  encode(canvas, name) {
    const W = canvas.width, H = canvas.height, ch = splitChannels(canvas, W, H);
    const layers = [{ name, opacity: 255, hidden: false, clip: false, lsct: 0, data: ch }];
    return Promise.resolve({ name: name + '.psd', blob: writePsd({ W, H, layers, comp: ch }), mime: this.mime, desc: this.desc });
  },
};
