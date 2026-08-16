// Конвертация картинки в пиксель-арт: дискретизация → палитра → чистка →
// предпросмотр; применение создаёт новый документ. Чистые алгоритмы — в logic.
import { S } from '../../core/state.js';
import * as bus from '../../core/bus.js';
import * as actions from '../../core/actions.js';
import { rgb, eqc } from '../../logic/color.js';
import { sampleGrid } from '../../logic/sample.js';
import { medianCut, nearest, paletteFromGrid } from '../../logic/quantize.js';
import { cloneGrid } from '../../logic/raster.js';
import { makeCanvas, syncCanvasSize } from '../../core/canvas.js';
import { C } from '../../styles/canvas-colors.js';
import { symmetrizeV, despeckle, cropEmpty } from '../../logic/cleanup.js';
import { setTool } from '../../core/tools.js';
import { dirtyAll } from '../../core/layer-cache.js';
import { addImageLayerTop } from '../../core/document.js';
import { snapshot } from '../../core/history.js';
import { MAX_LAYERS } from '../../config/limits.js';
import { $, toast, t } from '../../core/dom.js';

let impData = null, impGrid = null, importMode = 'replace'; // 'replace' — новый проект; 'layer' — верхним слоем
export const setImpData = (d) => { impData = d; };
export const getImpData = () => impData;
export const setImportMode = (m) => { importMode = m; };
export const getImportMode = () => importMode;

export function impConvert() {
  if (!impData) return;
  const colors = +$('imp-colors').value, detail = +$('imp-cell').value, bgtol = +$('imp-bgtol').value;
  const cell = detail > 0 ? impData.width / detail : 0; // «Детализация» = ширина результата в клетках
  const r = sampleGrid({ w: impData.width, h: impData.height, ch: 4, data: impData.data }, cell, bgtol);
  let g = r.grid;
  if (colors > 0 && r.samples.length) { const pal = medianCut(r.samples, colors); g = g.map((row) => row.map((c) => (c ? nearest(c, pal) : null))); }
  if ($('imp-sym').checked) g = symmetrizeV(g, r.nx, r.ny);
  if ($('imp-clean').checked) g = despeckle(g, r.nx, r.ny);
  impGrid = g; drawTo($('imp-prev'), g, r.nx, r.ny);
}

export function rotateImp() { // поворот исходника на 90° до конвертации
  if (!impData) return;
  const w = impData.width, h = impData.height;
  const a = makeCanvas(w, h); a.getContext('2d').putImageData(impData, 0, 0);
  const b = makeCanvas(h, w);
  const x = b.getContext('2d'); x.translate(h, 0); x.rotate(Math.PI / 2); x.drawImage(a, 0, 0);
  impData = x.getImageData(0, 0, h, w); impConvert();
}

export function drawTo(cvp, g, nx, ny) {
  const dpr = window.devicePixelRatio || 1, cw = cvp.clientWidth, chh = cvp.clientHeight;
  if (cw < 2 || chh < 2) { if (!cvp._retry && typeof requestAnimationFrame === 'function') { cvp._retry = 1; requestAnimationFrame(() => drawTo(cvp, g, nx, ny)); } return; } // раскладка ещё не готова — одна повторная попытка
  cvp._retry = 0;
  syncCanvasSize(cvp, cw, chh, dpr);
  const c = cvp.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.imageSmoothingEnabled = false;
  c.fillStyle = C.prevBg; c.fillRect(0, 0, cw, chh);
  const z = Math.max(1, Math.floor(Math.min((cw - 8) / nx, (chh - 8) / ny))), ox = Math.floor((cw - nx * z) / 2), oy = Math.floor((chh - ny * z) / 2);
  for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) { const col = g[y][x]; c.fillStyle = col ? rgb(col) : (((x + y) & 1) ? C.checkA : C.checkB); c.fillRect(ox + x * z, oy + y * z, z, z); }
}

// вставить результат пикселизации ВЕРХНИМ слоем текущего документа (не стирая его);
// перебор за холст — в ext (Trim покажет). Цвета результата добавляем в палитру.
function insertGridAsLayer(g) {
  const w = g[0].length, h = g.length, d = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const c = g[y][x]; if (!c) continue;
    const o = (y * w + x) * 4; d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = c.length > 3 ? c[3] : 255; }
  if (S.layers.length >= MAX_LAYERS) { toast(t('toast.maxLayersDel')); $('imp-ovl').classList.remove('on'); importMode = 'replace'; return; }
  snapshot(); addImageLayerTop(w, h, d);
  for (const c of paletteFromGrid(g, 64)) if (!S.palette.some((p) => eqc(p, c))) S.palette.push(c.slice());
  bus.emit('palette'); bus.emitDoc(); bus.emit('fit');
  $('imp-ovl').classList.remove('on'); importMode = 'replace'; toast(t('toast.imgImported'));
}

export function applyImport() {
  if (!impGrid) return;
  const g = cropEmpty(cloneGrid(impGrid));
  if (importMode === 'layer') { insertGridAsLayer(g); return; } // в редактор — верхним слоем
  S.W = g[0].length; S.H = g.length;
  S.layerSeq = 1; S.layers = [{ name: t('layer.name') + ' 1', grid: g, opacity: 1, visible: true, fid: null, clip: false, reference: false, ext: new Map(), effects: [] }]; S.cur = 0;
  S.folders = []; S.folderSeq = 0; S.marked.clear();
  // при квантовании держим в палитре ВСЕ цвета результата (включая редкие — белые
  // остатки в волосах и т.п.), чтобы их можно было найти через «Выбрать все пиксели»
  const cap = (+$('imp-colors').value) || 64;
  S.palette = paletteFromGrid(g, Math.max(cap, 16)); if (S.palette.length) S.active = S.palette[0].slice();
  S.sym = $('imp-sym').checked; S.symEnabled = true; $('sym').classList.toggle('on', S.sym);
  S.undoStack.length = S.redoStack.length = 0; dirtyAll();
  bus.emit('palette'); setTool('pencil'); bus.emit('layers');
  $('imp-ovl').classList.remove('on'); actions.run('gallery.hide'); bus.emit('fit'); // применили — уходим с галереи в редактор
  toast(t('toast.importReady', { w: S.W, h: S.H }));
}
