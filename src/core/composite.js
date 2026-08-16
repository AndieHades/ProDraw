// Раскладка композита: слои в порядке стопки, их эффекты (через layerSrcCanvas),
// обтравка, эффекты папок (под группой и поверх неё) и живые превью move/transform.
// Единая точка для видимого рендера, экспорта и окна-превью.
import { S } from './state.js';
import { effVis, clipBase, folderChain, folderOpacity } from './layers.js';
import { layerSrcCanvas, clippedShift } from './layer-cache.js';
import { folderFx, folderEffectsFor, layerMoveCanvas } from './effects-render.js';

const memberOf = (i, fid) => folderChain(S.layers[i].fid).some((f) => f.id === fid);
const folderVis = (f) => folderChain(f.id).every((x) => x.visible);
const depth = (f) => folderChain(f.id).length;

// папки с эффектами: границы поддерева (нижний/верхний индекс слоёв в стопке).
// opt.inc ограничивает состав (экспорт подмножества), opt.showHidden — игнор видимости.
function fxGroups(opt) { const res = [];
  for (const f of S.folders) { if (!folderEffectsFor(f).length) continue;
    if (!opt.showHidden && !folderVis(f)) continue;
    let bottom = Infinity, top = -1;
    for (let i = 0; i < S.layers.length; i++) if (memberOf(i, f.id) && opt.inc(i)) { if (i < bottom) bottom = i; if (i > top) top = i; }
    if (top >= 0) res.push({ f, bottom, top }); }
  return res; }

// фон-слой Background: плоская заливка под всем стеком (если задан цвет и видим)
function paintBackground(ctx) {
  if (!S.bg || !S.bg.visible || !S.bg.color) return;
  ctx.globalAlpha = 1; ctx.fillStyle = `rgb(${S.bg.color[0]},${S.bg.color[1]},${S.bg.color[2]})`;
  ctx.fillRect(0, 0, S.W, S.H);
}

// opt0: { include(i), showHidden, bg } — по умолчанию весь видимый стек (видимый рендер).
export function paintStack(ctx, live, opt0 = {}) {
  const opt = { inc: opt0.include || (() => true), showHidden: !!opt0.showHidden };
  const vis = (i) => opt.inc(i) && (opt.showHidden || effVis(i));
  if (opt0.bg) paintBackground(ctx);
  const iox = live && S.cropMode ? S.cropMode.idx : 0, ioy = live && S.cropMode ? S.cropMode.idy : 0;
  const groups = fxGroups(opt);
  const drawC = (c, f) => { if (c) { ctx.globalAlpha = f ? folderOpacity(f.id) : 1; ctx.drawImage(c, iox, ioy); } }; // эффекты папки гаснут вместе с её прозрачностью
  for (let i = 0; i < S.layers.length; i++) {
    groups.filter((g) => g.bottom === i).sort((a, b) => depth(a.f) - depth(b.f)).forEach((g) => drawC(folderFx(g.f, 'below'), g.f));
    drawLayer(ctx, i, live, iox, ioy, vis);
    groups.filter((g) => g.top === i).sort((a, b) => depth(b.f) - depth(a.f)).forEach((g) => drawC(folderFx(g.f, 'above'), g.f));
  }
  ctx.globalAlpha = 1;
}

function drawLayer(ctx, i, live, iox, ioy, vis) { const L = S.layers[i]; if (!vis(i) || L.opacity <= 0) return;
  const cb = clipBase(i); if (L.clip && (cb < 0 || !vis(cb))) return;
  const alpha = L.opacity * folderOpacity(L.fid); // прозрачность слоя × прозрачность его папок
  ctx.globalAlpha = alpha;
  const inRot = live && S.rotMode && S.rotMode.idxs && S.rotMode.idxs.includes(i);
  if (inRot && !S.rotMode.selection) { // живое превью трансформации целого слоя/папки
    if (i === (S.rotPrev && S.rotPrev.idx) && S.rotPrev.canvas) ctx.drawImage(S.rotPrev.canvas, S.rotPrev.px, S.rotPrev.py, S.rotPrev.ow, S.rotPrev.oh);
    return; }
  const md = live ? S.moveDrag : null, di = (md && md.idxs.includes(i)) ? md : null;
  if (cb >= 0) { const db = (md && md.idxs.includes(cb)) ? md : null;
    ctx.drawImage(clippedShift(i, cb, di ? di.dx : 0, di ? di.dy : 0, db ? db.dx : 0, db ? db.dy : 0), iox, ioy);
  } else if (di) ctx.drawImage(layerMoveCanvas(i, di.dx, di.dy), iox, ioy); // содержимое+ext+эффекты, пересчитанные для сдвига
  else ctx.drawImage(layerSrcCanvas(i), iox, ioy);
  if (inRot && S.rotMode.selection && i === S.rotMode.idx && S.rotPrev && S.rotPrev.canvas) {
    ctx.globalAlpha = alpha; ctx.drawImage(S.rotPrev.canvas, S.rotPrev.px, S.rotPrev.py, S.rotPrev.ow, S.rotPrev.oh); }
}
