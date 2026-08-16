// Свободная трансформация слоя(ёв): рамка с углами (поворот) и сторонами
// (растяжение). Живое превью в S.rotPrev (рендер рисует), рамка — оверлеем.
import { S, blank } from '../../core/state.js';
import * as bus from '../../core/bus.js';
import * as actions from '../../core/actions.js';
import { $, showMenuAt, toast, t } from '../../core/dom.js';
import { snapshot, setUndoGuard, cloneGrid } from '../../core/history.js';
import { dirtyAll, markDirty } from '../../core/layer-cache.js';
import { registerMode } from '../../core/canvas-handlers.js';
import { effVis, symA, symHA } from '../../core/layers.js';
import { selectedLayerTargets } from '../../core/targets.js';
import { boundsWithExt } from '../../logic/raster.js';
import { fxPreview } from '../../core/effects-render.js';
import { paintCanvas } from '../../core/canvas.js';
import { setTool } from '../../core/tools.js';
import { updateTextLayerGrid } from '../../core/text-layer.js';
import { isTextLayer, transformTextSource } from '../../logic/text-model.js';
import { rotBuildCellsSym, rotHasChanges, rotRestoreState } from './math.js';
import { rotGrab, rotDrag, rotHover, drawTransformFrame, rotHit } from './drag.js';

let rotRAF = 0;

// трансформированный контент одного слоя на полном W×H (вне холста — скрыт в превью,
// при применении уходит в ext); эффекты накладываются в fxPreview по новой форме
function memberCanvas(cells, W, H) { return paintCanvas(W, H, (d) => {
  for (const [px, py, cc] of cells) { if (px < 0 || py < 0 || px >= W || py >= H) continue;
    const o = (py * W + px) * 4; d[o] = cc[0]; d[o + 1] = cc[1]; d[o + 2] = cc[2]; d[o + 3] = cc.length > 3 ? cc[3] : 255; } }); }

function rotRebuild() { if (!S.rotMode) return; const W = S.W, H = S.H, mems = []; let drawIdx = -1;
  for (const s of S.rotMode.sources) { const r = rotBuildCellsSym(S.rotMode, s.src, W, H); if (!r) continue;
    const L = S.layers[s.idx]; if (L && effVis(s.idx) && L.opacity > 0) { mems.push({ idx: s.idx, L, content: memberCanvas(r.cells, W, H) }); drawIdx = Math.max(drawIdx, s.idx); } }
  S.rotPrev = mems.length ? { idx: drawIdx, canvas: fxPreview(mems, W, H), px: 0, py: 0, ow: W, oh: H } : { idx: drawIdx, canvas: null };
  bus.emit('render'); }
const rotRebuildSoon = () => { cancelAnimationFrame(rotRAF); rotRAF = requestAnimationFrame(rotRebuild); };
bus.on('visibility', () => { if (S.rotMode) rotRebuild(); });

const cloneSel = (s) => (s ? { x0: s.x0, y0: s.y0, x1: s.x1, y1: s.y1 } : null);
const cloneMask = (m) => (m ? new Set(m) : null);

function selectionSource(L, sel, mask, keep) {
  const src = []; let any = false;
  for (let y = sel.y0; y <= sel.y1; y++) { const row = [];
    for (let x = sel.x0; x <= sel.x1; x++) { const ok = (!mask || mask.has(x + ',' + y)) && (!keep || keep(x, y)), c = ok && L.grid[y][x] ? L.grid[y][x].slice() : null;
      if (c) any = true; row.push(c); }
    src.push(row); }
  return any ? src : null;
}

function clearSelectionCells(L, sel, mask, dx, dy) {
  for (let y = sel.y0; y <= sel.y1; y++) for (let x = sel.x0; x <= sel.x1; x++) {
    if (mask && !mask.has(x + ',' + y)) continue; const xx = x + dx, yy = y + dy;
    if (L.grid[yy] && xx >= 0 && xx < L.grid[yy].length) L.grid[yy][xx] = null; }
}

const activeTargets = () => selectedLayerTargets();

function enterSelectionRotMode() { const sel = cloneSel(S.sel), mask = cloneMask(S.selMask);
  if (!sel || S.selFloat) return false;
  const sa = symA(), sha = symHA(), sym = (sa || sha) ? { sx: sa, sy: sha } : null; // трансформируем одну сторону, зеркала достраиваются симметрично
  const keep = sym ? (x, y) => (!sa || x * 2 <= S.W - 1) && (!sha || y * 2 <= S.H - 1) : null;
  const sources = [];
  for (const L of activeTargets()) { const idx = S.layers.indexOf(L), src = selectionSource(L, sel, mask, keep); if (idx >= 0 && src) sources.push({ L, idx, src }); }
  if (!sources.length) { toast(t('toast.transformEmpty')); return false; }
  const backups = sources.map(({ L, idx }) => ({ L, idx, grid: cloneGrid(L.grid), ext: new Map(L.ext) }));
  for (const { L, idx } of sources) { clearSelectionCells(L, sel, mask, 0, 0); markDirty(idx); }
  S.sel = null; S.selMask = null;
  const idxs = sources.map((s) => s.idx).sort((a, b) => a - b), idx = idxs[idxs.length - 1];
  S.cur = idx;
  S.rotMode = { idx, idxs, sources, src: sources[0].src, b: { x0: sel.x0, y0: sel.y0, w: sel.x1 - sel.x0 + 1, h: sel.y1 - sel.y0 + 1 }, ang: 0, sx: 1, sy: 1, tx: 0, ty: 0, grab: null, changed: false, hist: [], selection: { idx, sel, mask, layers: backups }, sym };
  bus.emit('selection'); bus.emit('tool', S.tool); rotRebuild(); toast(t('toast.transformHint')); return true; }

export function enterRotMode(target) { const targets = (Array.isArray(target) ? target : [target]).filter((L) => S.layers.includes(L));
  if (!targets.length) return; let b0 = null;
  for (const L of targets) { const lb = boundsWithExt(L.grid, L.ext); if (!lb) continue; b0 = b0 ? { minx: Math.min(b0.minx, lb.minx), miny: Math.min(b0.miny, lb.miny), maxx: Math.max(b0.maxx, lb.maxx), maxy: Math.max(b0.maxy, lb.maxy) } : lb; }
  if (!b0) { toast(t('toast.layerEmpty')); return; }
  const idxs = targets.map((L) => S.layers.indexOf(L)).sort((a, b) => a - b), i = idxs[idxs.length - 1]; S.cur = i;
  const sources = targets.slice().sort((a, b) => S.layers.indexOf(a) - S.layers.indexOf(b)).map((L) => { const src = [];
    for (let y = b0.miny; y <= b0.maxy; y++) { const row = []; for (let x = b0.minx; x <= b0.maxx; x++) {
      const c = L.grid[y] && x >= 0 && x < S.W ? L.grid[y][x] : L.ext.get(x + ',' + y); row.push(c ? c.slice() : null); }
    src.push(row); } return { L, idx: S.layers.indexOf(L), src }; });
  S.rotMode = { idx: i, idxs, sources, src: sources[0].src, b: { x0: b0.minx, y0: b0.miny, w: b0.maxx - b0.minx + 1, h: b0.maxy - b0.miny + 1 }, ang: 0, sx: 1, sy: 1, tx: 0, ty: 0, grab: null, changed: false, hist: [] };
  bus.emit('layers'); bus.emit('tool', S.tool); rotRebuild();
  toast(t('toast.transformHint')); }

function applyRotMode(m) { let res = null, per = [];
  for (const s of m.sources) { const r = rotBuildCellsSym(m, s.src, S.W, S.H); per.push({ s, r }); if (!r) continue;
    res = res ? { minx: Math.min(res.minx, r.minx), miny: Math.min(res.miny, r.miny), maxx: Math.max(res.maxx, r.maxx), maxy: Math.max(res.maxy, r.maxy) } : r; }
  if (!res) { toast(t('toast.transformEmpty')); return false; }
  if (m.selection) return applySelectionRotMode(m, per);
  snapshot();
  for (const { s, r } of per) { const L = s.L; if (!S.layers.includes(L)) continue;
    if (isTextLayer(L)) { L.text = transformTextSource(L.text, m); updateTextLayerGrid(L, S.W, S.H); markDirty(s.idx); continue; }
    const g = blank(S.W, S.H);
    const ext = new Map();
    if (r) for (const [x, y, c] of r.cells) { if (x >= 0 && y >= 0 && x < S.W && y < S.H) g[y][x] = c.slice(); else ext.set(x + ',' + y, c.slice()); }
    L.grid = g; L.ext = ext; const idx = S.layers.indexOf(L); if (idx >= 0) markDirty(idx); }
  dirtyAll(); bus.emitDoc(); return true; }

function restoreSelectionMode(m) { const b = m.selection;
  if (!b) return;
  for (const layerBackup of (b.layers || [b])) { const L = layerBackup.L || S.layers[layerBackup.idx]; if (!L) continue;
    L.grid = cloneGrid(layerBackup.grid); L.ext = new Map(layerBackup.ext); markDirty(layerBackup.idx); }
  S.cur = b.idx; S.sel = null; S.selMask = null; }

function applySelectionRotMode(m, per) { const b = m.selection, backups = b.layers || [b];
  for (const layerBackup of backups) { const L = layerBackup.L || S.layers[layerBackup.idx]; if (!L) continue;
    L.grid = cloneGrid(layerBackup.grid); L.ext = new Map(layerBackup.ext); }
  S.cur = b.idx; S.sel = cloneSel(b.sel); S.selMask = cloneMask(b.mask); snapshot();
  for (const layerBackup of backups) { const L = layerBackup.L || S.layers[layerBackup.idx]; if (L) clearSelectionCells(L, b.sel, b.mask, 0, 0); }
  for (const { s, r } of per) if (r) for (const [x, y, c] of r.cells) {
    if (x >= 0 && y >= 0 && x < S.W && y < S.H) s.L.grid[y][x] = c.slice(); else s.L.ext.set(x + ',' + y, c.slice()); }
  S.sel = null; S.selMask = null;
  for (const layerBackup of backups) markDirty(layerBackup.idx);
  dirtyAll(); bus.emit('selection'); bus.emitDoc(); return true; }

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
