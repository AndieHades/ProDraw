// Свободная трансформация слоя(ёв): рамка с углами (поворот) и сторонами
// (растяжение). Живое превью в S.rotPrev (рендер рисует), рамка — оверлеем.
import { S } from '../../core/state.js';
import * as bus from '../../core/bus.ts';
import * as actions from '../../core/actions.ts';
import { $, showMenuAt, toast, t } from '../../ui/dom/ShellDom.ts';
import { setUndoGuard, snapshot, snapshotRasterReferences } from '../../core/history.js';
import { layerContentBounds, markDirty } from '../../core/layer-cache.js';
import { maskHas } from '../../core/selection.js';
import { registerMode } from '../../core/canvas-handlers.js';
import { symA, symHA } from '../../core/layers.js';
import { selectedLayerTargets } from '../../core/targets.js';
import { cloneSelectionMask } from '../../logic/mask-ops.js';
import { setTool } from '../../core/tools.js';
import { updateTextLayerGrid } from '../../core/text-layer.js';
import { isTextLayer, transformTextSource } from '../../logic/text-model.js';
import { rotBuildCellsSym, rotHasChanges, rotRestoreState } from './math.js';
import { rotGrab, rotDrag, rotHover, drawTransformFrame, rotHit } from './drag.js';
import { buildTransformPreview } from './preview.js';
import { applySelectionResults, boundsWithExtReferences, canvasBounds, intersectBounds, liftSelectionSources,
  rasterizeTransformResult, restoreRasterReferences, sourceFromRect,
  unionBounds } from './raster-state.js';

let rotRAF = 0;

const buildResults = (mode) => mode.sources.map((s) =>
  ({ s, r: rotBuildCellsSym(mode, s.src, S.W, S.H, s.srcBounds) }));
function rotRebuild() { if (!S.rotMode) return;
  S.rotPrev = buildTransformPreview(buildResults(S.rotMode), S.W, S.H);
  bus.emit('render'); }
const rotRebuildSoon = () => { cancelAnimationFrame(rotRAF); rotRAF = requestAnimationFrame(rotRebuild); };
bus.on('visibility', () => { if (S.rotMode) rotRebuild(); });

const cloneSel = (s) => (s ? { x0: s.x0, y0: s.y0, x1: s.x1, y1: s.y1 } : null);
const cloneMask = (m, sel) => cloneSelectionMask(m, sel, S.W, S.H);

function selectionSource(L, sel, mask, keep, contentBounds) {
  const bounds = { minx: sel.x0, miny: sel.y0, maxx: sel.x1, maxy: sel.y1 };
  return sourceFromRect(L, bounds, S.W,
    (x, y) => maskHas(mask, x, y) && (!keep || keep(x, y)),
    intersectBounds(bounds, contentBounds));
}

const activeTargets = () => selectedLayerTargets();

function enterSelectionRotMode() { const sel = cloneSel(S.sel), mask = cloneMask(S.selMask, S.sel);
  if (!sel || S.selFloat) return false;
  const sa = symA(), sha = symHA(), sym = (sa || sha) ? { sx: sa, sy: sha } : null; // трансформируем одну сторону, зеркала достраиваются симметрично
  const keep = sym ? (x, y) => (!sa || x * 2 <= S.W - 1) && (!sha || y * 2 <= S.H - 1) : null;
  const sources = [];
  for (const L of activeTargets()) { const idx = S.layers.indexOf(L), bounds = layerContentBounds(idx);
    const source = selectionSource(L, sel, mask, keep, bounds);
    if (idx >= 0 && source) sources.push({ L, idx, src: source.rows,
      srcBounds: source.localBounds, bounds }); }
  if (!sources.length) { toast(t('toast.transformEmpty')); return false; }
  const backups = liftSelectionSources(sources, sel, mask);
  for (const backup of backups) if (backup.changedBounds)
    markDirty(backup.idx, backup.changedBounds);
  S.sel = null; S.selMask = null;
  const idxs = sources.map((s) => s.idx).sort((a, b) => a - b), idx = idxs[idxs.length - 1];
  S.cur = idx;
  S.rotMode = { idx, idxs, sources, src: sources[0].src, b: { x0: sel.x0, y0: sel.y0, w: sel.x1 - sel.x0 + 1, h: sel.y1 - sel.y0 + 1 }, ang: 0, sx: 1, sy: 1, tx: 0, ty: 0, grab: null, changed: false, hist: [], selection: { idx, sel, mask, layers: backups }, sym };
  bus.emit('selection'); bus.emit('tool', S.tool); rotRebuild(); toast(t('toast.transformHint')); return true; }

export function enterRotMode(target) { const targets = (Array.isArray(target) ? target : [target]).filter((L) => S.layers.includes(L));
  if (!targets.length) return; let b0 = null;
  const layerBounds = new Map();
  for (const L of targets) { const idx = S.layers.indexOf(L);
    const lb = boundsWithExtReferences(layerContentBounds(idx), L.ext); layerBounds.set(L, lb);
    b0 = unionBounds(b0, lb); }
  if (!b0) { toast(t('toast.layerEmpty')); return; }
  const idxs = targets.map((L) => S.layers.indexOf(L)).sort((a, b) => a - b), i = idxs[idxs.length - 1]; S.cur = i;
  const sources = targets.slice().sort((a, b) => S.layers.indexOf(a) - S.layers.indexOf(b)).map((L) => {
    const idx = S.layers.indexOf(L), bounds = layerBounds.get(L);
    const source = sourceFromRect(L, b0, S.W, null, bounds);
    return source ? { L, idx, src: source.rows, srcBounds: source.localBounds, bounds } : null;
  }).filter(Boolean);
  if (!sources.length) { toast(t('toast.layerEmpty')); return; }
  S.rotMode = { idx: i, idxs, sources, src: sources[0].src, b: { x0: b0.minx, y0: b0.miny, w: b0.maxx - b0.minx + 1, h: b0.maxy - b0.miny + 1 }, ang: 0, sx: 1, sy: 1, tx: 0, ty: 0, grab: null, changed: false, hist: [] };
  bus.emit('layers'); bus.emit('tool', S.tool); rotRebuild();
  toast(t('toast.transformHint')); }

function applyRotMode(m) { let res = null; const per = buildResults(m);
  for (const { r } of per) { if (!r) continue;
    res = res ? { minx: Math.min(res.minx, r.minx), miny: Math.min(res.miny, r.miny), maxx: Math.max(res.maxx, r.maxx), maxy: Math.max(res.maxy, r.maxy) } : r; }
  if (!res) { toast(t('toast.transformEmpty')); return false; }
  if (m.selection) return applySelectionRotMode(m, per);
  if (!snapshotRasterReferences(m.idxs)) snapshot();
  for (const { s, r } of per) { const L = s.L; if (!S.layers.includes(L)) continue;
    if (isTextLayer(L)) { L.text = transformTextSource(L.text, m); updateTextLayerGrid(L, S.W, S.H); markDirty(s.idx); continue; }
    const next = rasterizeTransformResult(r, S.W, S.H);
    const dirty = unionBounds(canvasBounds(s.bounds, S.W, S.H), canvasBounds(r, S.W, S.H));
    markDirty(s.idx, dirty); L.grid = next.grid; L.ext = next.ext; }
  bus.emitDoc(); return true; }

function restoreSelectionMode(m) { const b = m.selection;
  if (!b) return;
  restoreRasterReferences(b.layers || [b]);
  for (const backup of (b.layers || [b])) if (backup.changedBounds)
    markDirty(backup.idx, backup.changedBounds);
  S.cur = b.idx; S.sel = null; S.selMask = null; }

function applySelectionRotMode(m, per) { const b = m.selection, backups = b.layers || [b];
  restoreRasterReferences(backups); S.cur = b.idx; S.sel = cloneSel(b.sel);
  S.selMask = cloneMask(b.mask, b.sel); const indices = backups.map(({ idx }) => idx);
  if (!snapshotRasterReferences(indices)) snapshot();
  const changes = applySelectionResults(backups, per, b.sel, b.mask, S.W, S.H);
  S.sel = null; S.selMask = null;
  for (const change of changes) markDirty(change.idx, change.bounds);
  bus.emit('selection'); bus.emitDoc(); return true; }

export function undoRotStep() { if (!S.rotMode) return false;
  if (!S.rotMode.hist.length) { toast(t('toast.noTransformUndo')); return true; }
  rotRestoreState(S.rotMode, S.rotMode.hist.pop()); rotRebuild(); toast(t('toast.transformStepUndone')); return true; }

export function exitRotMode(apply) { if (!S.rotMode) return; const m = S.rotMode, changed = rotHasChanges(m);
  S.rotMode = null; S.rotPrev = null; S.rotQuad = null; $('cv').style.cursor = '';
  bus.emit('tool', S.tool);
  if (m.selection && !changed) { restoreSelectionMode(m); bus.emit('selection'); bus.emit('render'); if (apply) toast(t('toast.transformApplied')); }
  else if (apply && changed) { if (applyRotMode(m)) toast(t('toast.transformApplied')); }
  else if (m.selection) { restoreSelectionMode(m); bus.emit('selection'); bus.emit('render'); if (!apply && changed) toast(t('toast.transformCancelled')); }
  else { bus.emit('render'); if (!apply && changed) toast(t('toast.transformCancelled')); } }

function menuStep(fn) { if (!S.rotMode) return; S.rotMode.hist.push({ ang: S.rotMode.ang, sx: S.rotMode.sx, sy: S.rotMode.sy, tx: S.rotMode.tx, ty: S.rotMode.ty }); fn(S.rotMode); S.rotMode.changed = rotHasChanges(S.rotMode); rotRebuild(); }

export function mount() {
  $('trctx-flip-h').onclick = () => { $('trctx').classList.remove('on'); menuStep((m) => { m.sx *= -1; }); };
  $('trctx-flip-v').onclick = () => { $('trctx').classList.remove('on'); menuStep((m) => { m.sy *= -1; }); };
  $('trctx-rot-r').onclick = () => { $('trctx').classList.remove('on'); menuStep((m) => { m.ang += Math.PI / 2; }); };
  $('trctx-rot-l').onclick = () => { $('trctx').classList.remove('on'); menuStep((m) => { m.ang -= Math.PI / 2; }); };
  registerMode('transform', {
    down: ({ e }) => { if (e && e.pointerType !== 'touch' && !rotHit(e)) { if (S.rotMode) S.rotMode.exitOnUp = true; return; } // ЛКМ/перо вне рамки — применить (как клик вне выделения)
      if (S.rotMode) S.rotMode.exitOnUp = false; rotGrab({ e }); },
    move: ({ e }) => rotDrag(e, rotRebuildSoon),
    up: () => { if (!S.rotMode) return; if (S.rotMode.exitOnUp) { exitRotMode(true); return; } S.rotMode.grab = null; },
    hover: rotHover });
  bus.on('overlay', ({ ctx }) => drawTransformFrame(ctx));
  bus.on('transform-menu', (e) => { if (S.rotMode && e) showMenuAt($('trctx'), e.clientX, e.clientY, true); });
  setUndoGuard(() => { if (!S.rotMode) return false; exitRotMode(false); return true; });
  window.addEventListener('keydown', (e) => { if (!S.rotMode) return;
    if (e.key === 'Enter') { e.preventDefault(); exitRotMode(true); }
    else if (e.key === 'Escape') { e.preventDefault(); exitRotMode(false); } });
}

actions.register('transform.enter', () => { if (S.sel || S.selFloat) { if (S.tool === 'lasso') setTool('pencil'); enterSelectionRotMode(); return; } enterRotMode(activeTargets()); });
actions.register('transform.enterTargets', (targets) => enterRotMode(targets));
actions.register('transform.cancel', () => exitRotMode(false));
actions.register('transform.apply', () => exitRotMode(true)); // повторное нажатие кнопки трансформации — применить и выключить
