// Персистентность активной работы: снимок S → запись, восстановление, новая работа и автосохранение.
import { S, newLayer } from '../../core/state.js';
import * as bus from '../../core/bus.ts';
import { dirtyAll } from '../../core/layer-cache.js';
import { defaultReferenceBoard, normalizeReferenceBoard } from '../../core/reference-board.js';
import { dedupePal } from '../../logic/quantize.js';
import { defaultPalette, grayscalePalette, DEFAULT_ACTIVE } from '../../config/palette.js';
import { saveDoc, getGalleryDoc, removeDoc } from '../../core/storage.ts';
import { ensureGrid } from '../../core/grid.js';
import { cloneAnimator, loadFrame } from '../../core/animation.js';
import { t } from '../../i18n/index.ts';
import { DEFAULT_CANVAS_BACKGROUND } from '../../config/canvas-background.ts';
import { AUTOSAVE_DELAY_MS, AUTOSAVE_IDLE_TIMEOUT_MS,
  AUTOSAVE_STROKE_RETRY_MS } from '../../config/timings.ts';
import { LegacyAutosaveController } from './LegacyAutosaveController.ts';
import { buildGalleryRecord } from './record.js';
import { loadStoredWork, uid } from './store.js';
import { retireTilemapRecord } from '../../logic/retiredTilemap.ts';
import { applyImportedImage } from '../../logic/importedImage.ts';
import { buildPsdGalleryRecord } from './psd-record.js';
import { DocumentSession } from '../../core/session/DocumentSession.ts';
const session = new DocumentSession();
let persistChain = Promise.resolve(false);
export const curWorkId = () => session.id;

async function persist(capture, isCurrent) {
  if (!capture || !isCurrent()) return false;
  const current = () => isCurrent() && session.isSaveCurrent(capture);
  const rec = await buildGalleryRecord(capture.id, capture.folder, current);
  if (!rec || !current()) return false;
  const old = await getGalleryDoc(capture.id); if (!current()) return false;
  if (old) { rec.folder = old.folder ?? null; rec.order = old.order ?? rec.order; }
  await saveDoc(rec); return true; }
function queuePersist(capture, isCurrent) {
  const run = () => persist(capture, isCurrent);
  persistChain = persistChain.catch(() => false).then(run); return persistChain; }
const autosaveController = new LegacyAutosaveController({
  delayMs: AUTOSAVE_DELAY_MS, retryMs: AUTOSAVE_STROKE_RETRY_MS,
  idleTimeoutMs: AUTOSAVE_IDLE_TIMEOUT_MS, isInputActive: () => S.stroke,
  save: async (isCurrent) => { const capture = session.captureSave();
    if (capture && await queuePersist(capture, () => isCurrent() &&
      session.isSaveCurrent(capture))) session.markSaved(capture); },
});
export async function saveCurrent() { if (!session.dirty) return true;
  if (S.stroke) { autosaveController.request(); return false; }
  autosaveController.supersede(); const capture = session.captureSave();
  if (!capture) return true;
  try { const ok = await queuePersist(capture, () => !S.stroke &&
      session.isSaveCurrent(capture));
    if (ok) session.markSaved(capture); return ok; } catch (error) { return false; } }
export const autosave = () => { session.markDirty(); autosaveController.request(); };
export const autosaveInputStarted = () => autosaveController.inputStarted();
function applyRec(rec) { retireTilemapRecord(rec);
  S.W = rec.W; S.H = rec.H; S.dpi = rec.dpi || 72; S.layerSeq = rec.layerSeq || 1;
  S.layers = rec.layers; S.folders = rec.folders || [];
  S.layers.forEach((L) => { if (!L.effects) L.effects = []; L.reference = !!L.reference;
    if (!L.kind) L.kind = 'pixel'; L.blendMode ||= 'normal'; L.masks ||= [];
    L.psdEffects ||= []; });
  S.folders.forEach((f) => { if (!f.effects) f.effects = [];
    f.blendMode ||= 'pass through'; f.psdEffects ||= []; });
  // folderSeq всегда впереди реальных id — иначе новые папки могут получить чужой id (старые проекты)
  S.folderSeq = S.folders.reduce((m, f) => Math.max(m, f.id), rec.folderSeq || 0); S.palette = dedupePal(rec.palette); S.active = (rec.active || S.palette[0]).slice();
  S.bg = rec.bg ? { color: rec.bg.color ? rec.bg.color.slice() : null, visible: rec.bg.visible !== false } : { color: null, visible: true }; S.bgSel = false;
  S.grid = rec.grid ? { ...rec.grid } : {}; ensureGrid();
  S.shading = { colors: [], on: false, open: false, picking: false };
  S.referenceBoard = normalizeReferenceBoard(rec.referenceBoard);
  S.animator = rec.animator ? cloneAnimator(rec.animator) : null;
  S.docName = rec.name; S.colorMode = rec.colorMode || 'rgba';
  S.psdWarnings = (rec.psdWarnings || []).slice(); S.sourceFormat = rec.sourceFormat || null; S.sourceLocation = rec.sourceLocation || null;
  S.cur = 0; S.marked.clear(); S.undoStack.length = 0; S.redoStack.length = 0;
  S.sel = S.selMask = S.selFloat = S.cropMode = S.rotMode = S.fxDraft = null;
  if (S.animator) loadFrame(S.animator.liveFrameId || S.animator.timelines[0].selectedFrameId, { emit: false });
  dirtyAll(); bus.emit('palette'); bus.emit('layers'); bus.emit('selection'); bus.emit('grid'); bus.emit('fit'); bus.emit('reference'); }

function blankWork(w, h, name, colorMode = 'rgba') { session.activateNew(uid('d'));
  S.W = w; S.H = h; S.dpi = 72; S.layerSeq = 1; S.folderSeq = 0; S.layers = [newLayer(t('layer.name') + ' 1', w, h)]; S.folders = []; S.cur = 0; S.marked.clear();
  S.colorMode = colorMode; S.palette = colorMode === 'grayscale' ? grayscalePalette() : defaultPalette();
  S.active = colorMode === 'grayscale' ? S.palette[S.palette.length - 1].slice() : S.palette[DEFAULT_ACTIVE].slice(); S.docName = name || t('gallery.untitled');
  S.shading = { colors: [], on: false, open: false, picking: false };
  S.grid = {}; ensureGrid();
  S.referenceBoard = defaultReferenceBoard(); bus.emit('reference');
  S.bg = { color: null, visible: true }; S.bgSel = false;
  S.animator = null;
  S.psdWarnings = []; S.sourceFormat = null; S.sourceLocation = null;
  S.undoStack.length = 0; S.redoStack.length = 0; S.sel = S.selMask = S.selFloat = S.cropMode = S.rotMode = S.fxDraft = null; }

function activateNewWork(w, h, name, bg, colorMode) { blankWork(w, h, name, colorMode);
  S.bg = { color: bg ? bg.slice(0, 3) : null, visible: true }; // выбранный при создании цвет → фон-слой Background (не пиксели слоя)
  dirtyAll({ preserveGridBounds: true }); bus.emit('palette'); bus.emit('layers'); bus.emit('fit'); }

export function newWork(w, h, name, bg = DEFAULT_CANVAS_BACKGROUND.color, colorMode = 'rgba') {
  activateNewWork(w, h, name, bg, colorMode); saveCurrent(); }

async function restoreWork(id, expectedChange) { if (!session.isCurrent(expectedChange)) return;
  const restore = session.supersede();
  if (!id) { session.clear(restore); return; }
  try { const rec = await loadStoredWork(id); if (!rec || rec.kind === 'folder') return;
    if (!session.isCurrent(restore)) return; applyRec(rec);
    session.activate(restore, id, rec.folder ?? null, !!rec.preview);
    autosaveController.supersede(); } catch (error) {} }

export async function createNewWork(w, h, name, bg = DEFAULT_CANVAS_BACKGROUND.color, colorMode = 'rgba', setup = null) {
  const sourceId = session.id, change = session.supersede();
  if (!await saveCurrent() || !session.isCurrent(change)) return false;
  activateNewWork(w, h, name, bg, colorMode); setup?.(); const created = session.checkpoint();
  if (await saveCurrent() && session.isCurrent(created)) return true;
  await restoreWork(sourceId, created); return false;
}
export async function newWorkFromImage(w, h, data, name, format = null, location = null) {
  return createNewWork(w, h, name, null, 'rgba', () => {
    applyImportedImage(S, w, h, data, name, format, location); dirtyAll();
    bus.emit('palette'); bus.emit('layers'); bus.emit('fit'); }); }

export function newWorkFromLayers(w, h, layers, name) { blankWork(w, h, name);
  S.layers = layers.map((L, i) => ({ name: L.name || (t('layer.name') + ' ' + (i + 1)), grid: L.grid, opacity: 1, visible: true, fid: null, clip: false, lock: false, alphaLock: false, reference: false, ext: new Map(), effects: [] }));
  if (!S.layers.length) S.layers = [newLayer(t('layer.name') + ' 1', w, h)];
  S.cur = S.layers.length - 1;
  dirtyAll(); bus.emit('palette'); bus.emit('layers'); bus.emit('fit'); saveCurrent(); }

// заготовка нового документа под результат конвертера (applyImport заполнит S)
export function beginConvertedWork() { session.activateNew(uid('d'));
  S.docName = t('gallery.untitled'); S.sourceFormat = null; S.sourceLocation = null; }
export const beginPsdImport = () => session.supersede();
export async function completePsdImport(token, document, name, sourceLocation = null, progress = null) {
  if (!session.isCurrent(token)) return { status: 'superseded', layerCount: 0, warningCount: 0 };
  if (!await saveCurrent() || !session.isCurrent(token)) {
    return { status: session.isCurrent(token) ? 'failed' : 'superseded',
      layerCount: 0, warningCount: 0 };
  }
  progress?.stage('preparing');
  const id = uid('d'), record = buildPsdGalleryRecord(id, name, document, sourceLocation);
  progress?.stage('saving');
  try { await saveDoc(record); } catch (error) {
    return { status: 'failed', layerCount: 0, warningCount: 0 };
  }
  if (!session.isCurrent(token)) { await removeDoc(id);
    return { status: 'superseded', layerCount: 0, warningCount: 0 }; }
  progress?.stage('opening'); const opened = await openWork(id);
  if (!opened) { await removeDoc(id);
    return { status: 'failed', layerCount: 0, warningCount: 0 }; }
  return { status: 'opened', layerCount: record.layers.length,
    warningCount: record.psdWarnings.length };
}
export async function openWork(id) { const change = session.supersede();
  if (id === session.id) return await saveCurrent() && session.isCurrent(change);
  if (!await saveCurrent() || !session.isCurrent(change)) return false;
  const rec = await loadStoredWork(id);
  if (!session.isCurrent(change) || !rec || rec.kind === 'folder') return false;
  applyRec(rec); session.activate(change, id, rec.folder ?? null, !!rec.preview);
  autosaveController.supersede(); return true; }
