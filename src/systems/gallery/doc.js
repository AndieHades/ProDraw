// Персистентность активной работы: снимок S → запись, восстановление, новая
// работа (в т.ч. из картинки), автосохранение.
import { S, newLayer, cloneFx, cloneLayer } from '../../core/state.js';
import * as bus from '../../core/bus.js';
import { cloneTileset } from '../../logic/tileset-data.js';
import { isTilemap, rasterLayer } from '../../core/tilemap.js';
import { compositeLayers, dirtyAll } from '../../core/layer-cache.js';
import { makeCanvas } from '../../core/canvas.js';
import { cloneReferenceBoard, defaultReferenceBoard, normalizeReferenceBoard } from '../../core/reference-board.js';
import { dedupePal } from '../../logic/quantize.js';
import { defaultPalette, grayscalePalette, DEFAULT_ACTIVE } from '../../config/palette.js';
import { saveDoc, getDoc } from '../../core/storage.js';
import { ensureGrid } from '../../core/grid.js';
import { cloneAnimator, loadFrame, saveActiveFrame } from '../../core/animation.js';
import { t } from '../../i18n/index.js';
import { uid } from './store.js';

let curId = null, curFolder = null, saveT = null;
export const curWorkId = () => curId;

function record() {
  saveActiveFrame();
  const c = makeCanvas(S.W, S.H); compositeLayers(c.getContext('2d'));
  return { id: curId, kind: 'doc', folder: curFolder, name: S.docName || t('gallery.untitled'), W: S.W, H: S.H,
    layerSeq: S.layerSeq, folderSeq: S.folderSeq,
    tilesetSeq: S.tilesetSeq, tilesets: S.tilesets.map(cloneTileset), // тайлсеты: id/индекс/bitmap/имя/порядок/группы
    layers: S.layers.map((L) => cloneLayer(L)),
    animator: cloneAnimator(),
    referenceBoard: cloneReferenceBoard(S.referenceBoard),
    grid: { ...ensureGrid() },
    bg: { color: S.bg.color ? S.bg.color.slice() : null, visible: S.bg.visible !== false },
    folders: S.folders.map((f) => ({ ...f, effects: cloneFx(f.effects) })), palette: S.palette.map((p) => p.slice()), active: S.active.slice(), colorMode: S.colorMode || 'rgba',
    preview: c.toDataURL('image/png'), order: Date.now(), updated: Date.now() };
}

export async function saveCurrent() { if (!curId) return;
  try { const rec = record(); const old = await getDoc(curId); if (old) { rec.folder = old.folder ?? null; rec.order = old.order ?? rec.order; } await saveDoc(rec); } catch (e) {} }
export const autosave = () => { clearTimeout(saveT); saveT = setTimeout(saveCurrent, 800); };

function applyRec(rec) { S.W = rec.W; S.H = rec.H; S.layerSeq = rec.layerSeq || 1;
  S.layers = rec.layers; S.folders = rec.folders || [];
  S.layers.forEach((L) => { if (!L.effects) L.effects = []; L.reference = !!L.reference; if (!L.kind) L.kind = 'pixel'; }); S.folders.forEach((f) => { if (!f.effects) f.effects = []; }); // старые проекты без эффектов/reference/kind
  S.tilesets = rec.tilesets || []; S.tilesetSeq = rec.tilesetSeq || 0; S.activeTile = null; S.placeTile = null; S.tileMarks = new Set(); S.tileSel = null; S.tileset = { on: false };
  S.layers.forEach((L, i) => { if (isTilemap(L)) rasterLayer(i); }); // восстановить пиксельный кеш из cells + тайлсетов
  // folderSeq всегда впереди реальных id — иначе новые папки могут получить чужой id (старые проекты)
  S.folderSeq = S.folders.reduce((m, f) => Math.max(m, f.id), rec.folderSeq || 0); S.palette = dedupePal(rec.palette); S.active = (rec.active || S.palette[0]).slice();
  S.bg = rec.bg ? { color: rec.bg.color ? rec.bg.color.slice() : null, visible: rec.bg.visible !== false } : { color: null, visible: true }; S.bgSel = false;
  S.grid = rec.grid ? { ...rec.grid } : {}; ensureGrid();
  S.shading = { colors: [], on: false, open: false, picking: false };
  S.referenceBoard = normalizeReferenceBoard(rec.referenceBoard);
  S.animator = rec.animator ? cloneAnimator(rec.animator) : null;
  S.docName = rec.name; S.colorMode = rec.colorMode || 'rgba'; S.cur = 0; S.marked.clear(); S.undoStack.length = 0; S.redoStack.length = 0;
  S.sel = S.selMask = S.selFloat = S.cropMode = S.rotMode = S.fxDraft = null;
  if (S.animator) loadFrame(S.animator.liveFrameId || S.animator.timelines[0].selectedFrameId, { emit: false });
  dirtyAll(); bus.emit('palette'); bus.emit('layers'); bus.emit('selection'); bus.emit('grid'); bus.emit('fit'); bus.emit('reference'); }

function blankWork(w, h, name, colorMode = 'rgba') { curId = uid('d'); curFolder = null;
  S.W = w; S.H = h; S.layerSeq = 1; S.folderSeq = 0; S.layers = [newLayer(t('layer.name') + ' 1', w, h)]; S.folders = []; S.cur = 0; S.marked.clear();
  S.tilesets = []; S.tilesetSeq = 0; S.activeTile = null; S.placeTile = null; S.tileMarks = new Set(); S.tileSel = null; S.tileset = { on: false };
  S.colorMode = colorMode; S.palette = colorMode === 'grayscale' ? grayscalePalette() : defaultPalette();
  S.active = colorMode === 'grayscale' ? S.palette[S.palette.length - 1].slice() : S.palette[DEFAULT_ACTIVE].slice(); S.docName = name || t('gallery.untitled');
  S.shading = { colors: [], on: false, open: false, picking: false };
  S.grid = {}; ensureGrid();
  S.referenceBoard = defaultReferenceBoard(); bus.emit('reference');
  S.bg = { color: null, visible: true }; S.bgSel = false;
  S.animator = null;
  S.undoStack.length = 0; S.redoStack.length = 0; S.sel = S.selMask = S.selFloat = S.cropMode = S.rotMode = S.fxDraft = null; }

export function newWork(w, h, name, bg = null, colorMode = 'rgba') { blankWork(w, h, name, colorMode);
  S.bg = { color: bg ? bg.slice(0, 3) : null, visible: true }; // выбранный при создании цвет → фон-слой Background (не пиксели слоя)
  dirtyAll(); bus.emit('palette'); bus.emit('layers'); bus.emit('fit'); saveCurrent(); }

export function newWorkFromImage(w, h, data, name) { blankWork(w, h, name);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const o = (y * w + x) * 4; if (data[o + 3] < 8) continue; S.layers[0].grid[y][x] = [data[o], data[o + 1], data[o + 2], data[o + 3]]; }
  dirtyAll(); bus.emit('palette'); bus.emit('layers'); bus.emit('fit'); saveCurrent(); }

export function newWorkFromLayers(w, h, layers, name) { blankWork(w, h, name);
  S.layers = layers.map((L, i) => ({ name: L.name || (t('layer.name') + ' ' + (i + 1)), grid: L.grid, opacity: 1, visible: true, fid: null, clip: false, lock: false, alphaLock: false, reference: false, ext: new Map(), effects: [] }));
  if (!S.layers.length) S.layers = [newLayer(t('layer.name') + ' 1', w, h)];
  S.cur = S.layers.length - 1;
  dirtyAll(); bus.emit('palette'); bus.emit('layers'); bus.emit('fit'); saveCurrent(); }

// заготовка нового документа под результат конвертера (applyImport заполнит S)
export function beginConvertedWork() { curId = uid('d'); curFolder = null; S.docName = t('gallery.untitled'); }

export async function openWork(id) { const rec = await getDoc(id); if (!rec || rec.kind === 'folder') return false;
  await saveCurrent(); curId = id; curFolder = rec.folder ?? null; applyRec(rec); return true; }
