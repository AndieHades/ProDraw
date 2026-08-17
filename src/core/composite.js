// Раскладка композита: слои в порядке стопки, их bounded effect surfaces,
// обтравка, эффекты папок (под группой и поверх неё) и живые превью move/transform.
// Единая точка для видимого рендера, экспорта и окна-превью.
import { S } from './state.js';
import { effVis, clipBase, folderChain } from './layers.js';
import { layerSrcSurface, clippedShift } from './layer-cache.js';
import { folderFx, folderEffectsFor, layerMoveCanvas } from './effects-render.js';
import { drawEffectSurface, drawPsdSurface, fullCanvasSurface } from './effect-surface.js';
import { buildCanvasEffectSurface } from './effect-canvas.js';
import { makeCanvas } from './canvas.js';

const memberOf = (i, fid) => folderChain(S.layers[i].fid).some((f) => f.id === fid);
const folderVis = (f) => folderChain(f.id).every((x) => x.visible);
const depth = (f) => folderChain(f.id).length;
const opacityFor = (fid, omitted) => folderChain(fid).reduce((value, folder) =>
  omitted?.has(folder.id) ? value : value * (folder.opacity ?? 1), 1);
const documentBounds = () => ({ minx: 0, miny: 0, maxx: S.W - 1, maxy: S.H - 1 });

// папки с эффектами: границы поддерева (нижний/верхний индекс слоёв в стопке).
// opt.inc ограничивает состав (экспорт подмножества), opt.showHidden — игнор видимости.
function fxGroups(opt) { const res = [];
  for (const f of S.folders) { if (!folderEffectsFor(f).length) continue;
    if (opt.omitEffects?.has(f.id)) continue;
    if (!opt.showHidden && !folderVis(f)) continue;
    let bottom = Infinity, top = -1;
    for (let i = 0; i < S.layers.length; i++) if (memberOf(i, f.id) && opt.inc(i)) { if (i < bottom) bottom = i; if (i > top) top = i; }
    if (top >= 0) res.push({ f, bottom, top }); }
  return res; }

function groupInterval(folder, opt) {
  let bottom = Infinity, top = -1;
  for (let index = 0; index < S.layers.length; index++) {
    if (!opt.inc(index) || !memberOf(index, folder.id)) continue;
    bottom = Math.min(bottom, index); top = Math.max(top, index);
  }
  return top < 0 ? null : { f: folder, bottom, top };
}

const needsIsolation = (folder) => (folder.blendMode &&
  (folder.blendMode !== 'pass through' || (folder.opacity ?? 1) < 1)) ||
  folderEffectsFor(folder).some((effect) => effect.visible !== false);

function isolatedGroups(opt) {
  const candidates = S.folders.filter((folder) => !opt.skipIsolation?.has(folder.id) &&
    (opt.showHidden || folderVis(folder)) && needsIsolation(folder));
  const ids = new Set(candidates.map((folder) => folder.id));
  return candidates.filter((folder) => !folderChain(folder.parent).some(
    (parent) => ids.has(parent.id))).map((folder) => groupInterval(folder, opt))
    .filter(Boolean);
}

function isolatedSurface(folder, live, opt) {
  const canvas = makeCanvas(S.W, S.H), context = canvas.getContext('2d');
  context.imageSmoothingEnabled = false;
  const chain = new Set(folderChain(folder.id).map((item) => item.id));
  paintStack(context, live, { include: (index) => opt.inc(index) && memberOf(index, folder.id),
    showHidden: opt.showHidden, skipIsolation: new Set([...(opt.skipIsolation || []), folder.id]),
    omitOpacity: new Set([...(opt.omitOpacity || []), ...chain]),
    omitEffects: new Set([...(opt.omitEffects || []), folder.id]) });
  const effects = folderEffectsFor(folder);
  return effects.length ? buildCanvasEffectSurface(fullCanvasSurface(canvas), effects,
    documentBounds()) : canvas;
}

function drawIsolated(ctx, entry, live, opt) {
  const folder = entry.f, mode = folder.blendMode === 'pass through'
    ? 'normal' : folder.blendMode || 'normal';
  const opacity = (folder.opacity ?? 1) * opacityFor(folder.parent, opt.omitOpacity);
  drawPsdSurface(ctx, isolatedSurface(folder, live, opt), 0, 0, opacity, mode);
}

// фон-слой Background: плоская заливка под всем стеком (если задан цвет и видим)
function paintBackground(ctx) {
  if (!S.bg || !S.bg.visible || !S.bg.color) return;
  ctx.globalAlpha = 1; ctx.fillStyle = `rgb(${S.bg.color[0]},${S.bg.color[1]},${S.bg.color[2]})`;
  ctx.fillRect(0, 0, S.W, S.H);
}

// opt0: { include(i), showHidden, bg } — по умолчанию весь видимый стек (видимый рендер).
export function paintStack(ctx, live, opt0 = {}) {
  const opt = { inc: opt0.include || (() => true), showHidden: !!opt0.showHidden,
    skipIsolation: opt0.skipIsolation || new Set(), omitOpacity: opt0.omitOpacity || new Set(),
    omitEffects: opt0.omitEffects || new Set() };
  const vis = (i) => opt.inc(i) && (opt.showHidden || effVis(i));
  if (opt0.bg) paintBackground(ctx);
  const iox = live && S.cropMode ? S.cropMode.idx : 0, ioy = live && S.cropMode ? S.cropMode.idy : 0;
  const groups = fxGroups(opt);
  const isolated = isolatedGroups(opt);
  const drawC = (c, f) => { if (c) { ctx.globalAlpha = f ? opacityFor(f.id, opt.omitOpacity) : 1;
    drawEffectSurface(ctx, c, iox, ioy); } }; // эффекты папки гаснут вместе с её прозрачностью
  for (let i = 0; i < S.layers.length; i++) {
    const entry = isolated.find((group) => group.bottom === i);
    if (entry) { drawIsolated(ctx, entry, live, opt); i = entry.top; continue; }
    groups.filter((g) => g.bottom === i).sort((a, b) => depth(a.f) - depth(b.f)).forEach((g) => drawC(folderFx(g.f, 'below'), g.f));
    drawLayer(ctx, i, live, iox, ioy, vis, opt.omitOpacity);
    groups.filter((g) => g.top === i).sort((a, b) => depth(b.f) - depth(a.f)).forEach((g) => drawC(folderFx(g.f, 'above'), g.f));
  }
  ctx.globalAlpha = 1;
}

function drawLayer(ctx, i, live, iox, ioy, vis, omitted) { const L = S.layers[i]; if (!vis(i) || L.opacity <= 0) return;
  const cb = clipBase(i); if (L.clip && (cb < 0 || !vis(cb))) return;
  const alpha = L.opacity * opacityFor(L.fid, omitted); // прозрачность слоя × прозрачность его папок
  const draw = (surface, dx = iox, dy = ioy) => drawPsdSurface(ctx, surface,
    dx, dy, alpha, L.blendMode || 'normal');
  const inRot = live && S.rotMode && S.rotMode.idxs && S.rotMode.idxs.includes(i);
  if (inRot && !S.rotMode.selection) { // живое превью трансформации целого слоя/папки
    if (i === (S.rotPrev && S.rotPrev.idx) && S.rotPrev.canvas) {
      ctx.globalAlpha = alpha; ctx.drawImage(S.rotPrev.canvas, S.rotPrev.px,
        S.rotPrev.py, S.rotPrev.ow, S.rotPrev.oh); }
    return; }
  const md = live ? S.moveDrag : null, di = (md && md.idxs.includes(i)) ? md : null;
  if (cb >= 0) { const db = (md && md.idxs.includes(cb)) ? md : null;
    draw(clippedShift(i, cb, di ? di.dx : 0, di ? di.dy : 0,
      db ? db.dx : 0, db ? db.dy : 0));
  } else if (di) draw(layerMoveCanvas(i, di.dx, di.dy));
  else draw(layerSrcSurface(i));
  if (inRot && S.rotMode.selection && i === S.rotMode.idx && S.rotPrev && S.rotPrev.canvas) {
    ctx.globalAlpha = alpha; ctx.drawImage(S.rotPrev.canvas, S.rotPrev.px,
      S.rotPrev.py, S.rotPrev.ow, S.rotPrev.oh); }
}
