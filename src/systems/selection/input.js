// Жесты выделения: новая рамка, перенос изнутри, растяжение за ручку (NN-масштаб).
import { S } from '../../core/state.js';
import * as bus from '../../core/bus.js';
import { symA, symHA } from '../../core/layers.js';
import { snapshot } from '../../core/history.js';
import { registerTool } from '../../core/canvas-handlers.js';
import { selHit } from '../../core/selection.js';
import { $, toast, t } from '../../core/dom.js';
import { normSel, symmetrizeSelection, selHasPixels, deselect, maskFromCells } from './model.js';
import { liftSelection, liftSelectionSym, commitFloat, symFloatBounds } from './float.js';

let selDrag = null, hinted = false;

// Tile Mode: рамка, вышедшая за край, заворачивается в маску (выделение через шов).
const tileRectWraps = (ax, ay, bx, by) => Math.min(ax, bx) < 0 || Math.min(ay, by) < 0 || Math.max(ax, bx) >= S.W || Math.max(ay, by) >= S.H;
function setWrappedRect(ax, ay, bx, by) { const x0 = Math.min(ax, bx), y0 = Math.min(ay, by), x1 = Math.max(ax, bx), y1 = Math.max(ay, by), set = new Set();
  for (let dy = 0; dy <= y1 - y0 && dy < S.H; dy++) for (let dx = 0; dx <= x1 - x0 && dx < S.W; dx++)
    set.add((((x0 + dx) % S.W) + S.W) % S.W + ',' + ((((y0 + dy) % S.H) + S.H) % S.H));
  maskFromCells(set); }

function squareEnd(sx, sy, gx, gy) {
  const dx = gx - sx, dy = gy - sy;
  const ix = dx < 0 ? -1 : dx > 0 ? 1 : (sx > (S.W - 1) / 2 ? -1 : 1);
  const iy = dy < 0 ? -1 : dy > 0 ? 1 : (sy > (S.H - 1) / 2 ? -1 : 1);
  let d = Math.max(Math.abs(dx), Math.abs(dy));
  if (!(S.tile && S.tile.on)) d = Math.min(d, ix < 0 ? sx : S.W - 1 - sx, iy < 0 ? sy : S.H - 1 - sy);
  return [sx + ix * d, sy + iy * d];
}

function selZone(e) { if (!S.sel) return null;
  const r = $('cv').getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top, z = S.view.zoom;
  const lx = S.view.ox + S.sel.x0 * z, rx = S.view.ox + (S.sel.x1 + 1) * z, ty = S.view.oy + S.sel.y0 * z, by = S.view.oy + (S.sel.y1 + 1) * z, tol = 14;
  const nl = Math.abs(px - lx) < tol, nr = Math.abs(px - rx) < tol, nt = Math.abs(py - ty) < tol, nb = Math.abs(py - by) < tol;
  const inX = px > lx - tol && px < rx + tol, inY = py > ty - tol && py < by + tol;
  const zn = { l: nl && inY, r: nr && inY, t: nt && inX, b: nb && inX };
  return (zn.l || zn.r || zn.t || zn.b) ? zn : null; }

function down({ gx, gy, e }) {
  if (S.sel && e) { const zn = selZone(e);
    if (zn) { const sX = !!(S.selMask && symA()), sY = !!(S.selMask && symHA());
      if (S.selFloat && S.selFloat.symItems) commitFloat(); // sym-фрагмент масштабируем уже осевшим
      if (!S.selFloat) { snapshot(); liftSelection(); }     // обычный плавающий масштабируется «в воздухе»
      selDrag = { mode: 'scale', zn, src: new Map(S.selFloat.cells), sw: S.selFloat.w, sh: S.selFloat.h, x0: S.sel.x0, y0: S.sel.y0, x1: S.sel.x1, y1: S.sel.y1, symX: sX, symY: sY }; return; } }
  const inSel = selHit(gx, gy);
  if (S.selFloat && inSel) { // фрагмент уже в воздухе — продолжаем нести, не трогая слой
    if (S.selFloat.symItems) selDrag = { mode: 'move', sx: gx, sy: gy, lifted: true, moved: false, bdx: S.selFloat.dx, bdy: S.selFloat.dy };
    else { S.selFloat.ox = S.selFloat.x; S.selFloat.oy = S.selFloat.y; selDrag = { mode: 'move', sx: gx, sy: gy, lifted: true, moved: false }; }
    return; }
  if (S.selFloat) commitFloat(); // клик мимо фрагмента — он оседает
  if (inSel)
    selDrag = { mode: 'move', sx: gx, sy: gy, lifted: false, moved: false, sym: !!(S.selMask && (symA() || symHA())) };
  else if (S.sel) deselect();
  else { S.selMask = null; selDrag = { mode: 'new', sx: gx, sy: gy, moved: false }; }
}

function scaleMove(gx, gy) { const d = selDrag; let nw = d.sw, nh = d.sh, nx0 = d.x0, ny0 = d.y0;
  if (d.zn.l) { nw = Math.max(1, d.x1 + 1 - gx); nx0 = d.x1 + 1 - nw; }
  if (d.zn.r) nw = Math.max(1, gx - d.x0 + 1);
  if (d.zn.t) { nh = Math.max(1, d.y1 + 1 - gy); ny0 = d.y1 + 1 - nh; }
  if (d.zn.b) nh = Math.max(1, gy - d.y0 + 1);
  if ((d.zn.l || d.zn.r) && (d.zn.t || d.zn.b)) { const k = Math.max(nw / d.sw, nh / d.sh);
    nw = Math.max(1, Math.round(d.sw * k)); nh = Math.max(1, Math.round(d.sh * k)); if (d.zn.l) nx0 = d.x1 + 1 - nw; if (d.zn.t) ny0 = d.y1 + 1 - nh; }
  if (d.symX) { nw = Math.max(1, d.sw + 2 * Math.round((nw - d.sw) / 2)); nx0 = Math.round((S.W - nw) / 2); }
  if (d.symY) { nh = Math.max(1, d.sh + 2 * Math.round((nh - d.sh) / 2)); ny0 = Math.round((S.H - nh) / 2); }
  if (nw > 640 || nh > 640) return;
  let cells = new Map();
  for (let y = 0; y < nh; y++) for (let x = 0; x < nw; x++) { const sx = Math.min(d.sw - 1, Math.floor(x * d.sw / nw)), sy = Math.min(d.sh - 1, Math.floor(y * d.sh / nh)); const c = d.src.get(sx + ',' + sy); if (c) cells.set(x + ',' + y, c); }
  if (d.symX || d.symY) { const sm = new Map();
    for (const [k, c] of cells) { const ci = k.indexOf(','), x = +k.slice(0, ci), y = +k.slice(ci + 1);
      if ((d.symX && x * 2 > nw - 1) || (d.symY && y * 2 > nh - 1)) continue;
      const xs = d.symX ? [x, nw - 1 - x] : [x], ys = d.symY ? [y, nh - 1 - y] : [y];
      for (const xx of xs) for (const yy of ys) sm.set(xx + ',' + yy, c); } cells = sm; }
  S.selFloat = { cells, w: nw, h: nh, x: nx0, y: ny0, ox: nx0, oy: ny0 };
  S.sel = { x0: nx0, y0: ny0, x1: nx0 + nw - 1, y1: ny0 + nh - 1 }; bus.emit('selection'); bus.emit('render'); }

function move({ gx, gy, e }) { if (!selDrag) return;
  if (selDrag.mode !== 'new' && selDrag.lifted && !S.selFloat) { selDrag = null; return; } // фрагмент осел извне (undo) — жест обрывается
  if (selDrag.mode === 'scale') { scaleMove(gx, gy); return; }
  if (selDrag.mode === 'new') { if (gx !== selDrag.sx || gy !== selDrag.sy) selDrag.moved = true;
    const [ex, ey] = e && e.shiftKey ? squareEnd(selDrag.sx, selDrag.sy, gx, gy) : [gx, gy];
    if (S.tile && S.tile.on && tileRectWraps(selDrag.sx, selDrag.sy, ex, ey)) setWrappedRect(selDrag.sx, selDrag.sy, ex, ey);
    else { S.selMask = null; S.sel = normSel(selDrag.sx, selDrag.sy, ex, ey); } }
  else { if (!selDrag.lifted) { if (gx === selDrag.sx && gy === selDrag.sy) return; snapshot();
      if (selDrag.sym) liftSelectionSym(selDrag.sx, selDrag.sy); else liftSelection(); selDrag.lifted = true; }
    if (S.selFloat.symItems) { S.selFloat.dx = (selDrag.bdx || 0) + gx - selDrag.sx; S.selFloat.dy = (selDrag.bdy || 0) + gy - selDrag.sy; symFloatBounds(); }
    else { S.selFloat.x = S.selFloat.ox + (gx - selDrag.sx); S.selFloat.y = S.selFloat.oy + (gy - selDrag.sy);
      S.sel = { x0: S.selFloat.x, y0: S.selFloat.y, x1: S.selFloat.x + S.selFloat.w - 1, y1: S.selFloat.y + S.selFloat.h - 1 }; }
    selDrag.moved = true; }
  bus.emit('selection'); bus.emit('render'); }

function up() { if (!selDrag) return;
  if (selDrag.mode === 'move' || selDrag.mode === 'scale') { // фрагмент НЕ оседает: висит до клика вне/деселекта — подложка под ним цела
    S.sel = S.sel ? normSel(S.sel.x0, S.sel.y0, S.sel.x1, S.sel.y1) : null;
    if (!S.sel) { commitFloat(); S.selMask = null; } } // унесли совсем за холст — осел в ext
  else if (!selDrag.moved) S.sel = null;
  else { symmetrizeSelection(); // пустую рамку (без пикселей под ней) не создаём — нечего таскать
    if (S.sel && !selHasPixels()) { deselect(); toast(t('toast.noPixelsToSelect')); }
    else if (S.sel && !hinted) hinted = true; }
  selDrag = null; bus.emit('selection'); bus.emit('render'); }

// курсоры на десктопе: двойные стрелки на ручках/рёбрах, move внутри рамки
function hover({ gx, gy, e }) { if (!S.sel) return null;
  const zn = e ? selZone(e) : null;
  if (zn) return ((zn.l && zn.t) || (zn.r && zn.b)) ? 'nwse-resize' : ((zn.r && zn.t) || (zn.l && zn.b)) ? 'nesw-resize' : (zn.l || zn.r) ? 'ew-resize' : 'ns-resize';
  return (gx >= S.sel.x0 && gx <= S.sel.x1 && gy >= S.sel.y0 && gy <= S.sel.y1) ? 'move' : null; }

registerTool('select', { down, move, up, hover });
