// Растеризация неразрушающих эффектов слоя/папки в canvas (с кешем по подписи).
// Эффекты «под слоём» (обводка/свечение/тень) и «внутри» (внутр. тень, по маске).
import { S } from './state.js';
import { hexToRgb } from '../logic/color.js';
import { adjustColor } from '../logic/adjustment.js';
import { EFFECT_PIXELS, INNER_EFFECTS, maskFromGrid, maskFromAlpha } from '../logic/layer-effects.js';
import { layerFloatCanvas, layerSrcCanvas, layerExtCanvas, layerRev } from './layer-cache.js';
import { effVis, clipBase, folderChain } from './layers.js';
import { makeCanvas as cv, paintCanvas } from './canvas.js';

// булев силуэт цели (слой — по сетке, папка — по композиту поддерева): нужен
// для расчёта пикселей одного эффекта (Convert To Layer). groupCanvas — ниже (hoisted).
export function targetSilhouette(target) { const W = S.W, H = S.H;
  if (target.grid) return maskFromGrid(target.grid, W, H);
  const g = groupCanvas(target.id); return maskFromAlpha(g.getContext('2d').getImageData(0, 0, W, H).data, W, H); }

const effectsFor = (target) => { const base = target.effects || [], d = S.fxDraft;
  return d && d.target === target && !base.includes(d.eff) ? [...base, d.eff] : base; };
export const layerEffectsFor = (L) => effectsFor(L);
export const folderEffectsFor = (f) => effectsFor(f);
export const visibleAdjustments = (effects = []) => effects.filter((e) => e.visible !== false && e.type === 'adjustment');
export const visiblePixelEffects = (effects = []) => effects.filter((e) => e.visible !== false && EFFECT_PIXELS[e.type]);

function applyAdjustments(src, effects, W, H) {
  const adj = visibleAdjustments(effects); if (!adj.length) return src;
  const c = cv(W, H), x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(src, 0, 0);
  const id = x.getImageData(0, 0, W, H), d = id.data;
  for (let i = 0; i < d.length; i += 4) { if (d[i + 3] <= 0) continue;
    let cc = [d[i], d[i + 1], d[i + 2], d[i + 3]];
    for (const e of adj) { const a = e.opacity ?? 1, after = adjustColor(cc, e.params); // прозрачность настройки = доля смешения с исходным
      cc = a >= 1 ? after : cc.map((v, k) => Math.round(v + ((after[k] ?? v) - v) * a)); }
    d[i] = cc[0]; d[i + 1] = cc[1]; d[i + 2] = cc[2]; d[i + 3] = cc.length > 3 ? cc[3] : d[i + 3]; }
  x.putImageData(id, 0, 0); return c;
}

export function layerAdjustmentEffects(i) {
  const L = S.layers[i]; if (!L) return [];
  const out = [];
  for (const f of folderChain(L.fid).slice().reverse()) out.push(...visibleAdjustments(folderEffectsFor(f)));
  out.push(...visibleAdjustments(layerEffectsFor(L)));
  return out;
}

export function layerRenderEffects(i) {
  const L = S.layers[i]; if (!L) return [];
  const out = [];
  for (const f of folderChain(L.fid).slice().reverse()) out.push(...visibleAdjustments(folderEffectsFor(f)));
  out.push(...layerEffectsFor(L));
  return out;
}

// один эффект → canvas W×H с его пикселями (цвет + альфа)
function effCanvas(pixels, col, W, H) { return paintCanvas(W, H, (d) => {
  for (const [px, py, a] of pixels) { const o = (py * W + px) * 4; d[o] = col[0]; d[o + 1] = col[1]; d[o + 2] = col[2]; d[o + 3] = a; } }); }

// слой effects поверх содержимого src (маска mask): низ-эффекты под src, внутр.-эффекты по альфе src
function build(src, mask, effects, W, H) { const c = cv(W, H), x = c.getContext('2d'); x.imageSmoothingEnabled = false;
  const px = visiblePixelEffects(effects), adjSrc = applyAdjustments(src, effects, W, H);
  for (const e of px) { if (INNER_EFFECTS.has(e.type)) continue;
    x.globalAlpha = e.opacity ?? 1; x.drawImage(effCanvas(EFFECT_PIXELS[e.type](mask, W, H, e.params), hexToRgb(e.params.color), W, H), 0, 0); }
  x.globalAlpha = 1; x.drawImage(adjSrc, 0, 0);
  for (const e of px) { if (!INNER_EFFECTS.has(e.type)) continue;
    const ic = effCanvas(EFFECT_PIXELS[e.type](mask, W, H, e.params), hexToRgb(e.params.color), W, H);
    const ix = ic.getContext('2d'); ix.globalCompositeOperation = 'destination-in'; ix.drawImage(src, 0, 0); x.globalAlpha = e.opacity ?? 1; x.drawImage(ic, 0, 0); }
  x.globalAlpha = 1; return c; }

const lcache = new Map(); // i → { sig, canvas }
export function layerFxCanvas(i) { const L = S.layers[i], src = layerFloatCanvas(i), W = S.W, H = S.H, allEffects = layerRenderEffects(i);
  if (!allEffects.length) return src;
  // поднятый фрагмент выделения этого слоя: при его движении силуэт берём из src
  // (вместе с фрагментом на текущем месте) — иначе обводка/тень над выделенной
  // областью пропадают и «застывают» на месте подъёма (кеш по подписи).
  const f = S.selFloat && (S.selFloat.li ?? S.cur) === i ? S.selFloat : null;
  const fsig = f ? '|f' + (f.symItems ? f.dx + ',' + f.dy : f.x + ',' + f.y + ',' + f.w + ',' + f.h) : '';
  const sig = W + 'x' + H + '|' + layerRev(i) + '|' + JSON.stringify(allEffects) + fsig;
  const hit = lcache.get(i); if (hit && hit.sig === sig) return hit.canvas;
  const mask = f ? maskFromAlpha(src.getContext('2d').getImageData(0, 0, W, H).data, W, H) : maskFromGrid(L.grid, W, H);
  const c = build(src, mask, allEffects, W, H); lcache.set(i, { sig, canvas: c }); return c; }

// Превью слоя i при перетаскивании на (dx,dy): содержимое (grid + запас ext) и
// его эффекты, пересчитанные для нового положения. Иначе при заезде из-за края
// обводка/тень показывались бы «обрезанными» (как раньше само изображение).
export function layerMoveCanvas(i, dx, dy) { const W = S.W, H = S.H;
  const src = cv(W, H), sx = src.getContext('2d'); sx.imageSmoothingEnabled = false;
  sx.drawImage(layerFloatCanvas(i), dx, dy);
  const ex = layerExtCanvas(i); if (ex) sx.drawImage(ex.canvas, ex.ox + dx, ex.oy + dy);
  const effects = layerRenderEffects(i); if (!effects.length) return src;
  return build(src, maskFromAlpha(sx.getImageData(0, 0, W, H).data, W, H), effects, W, H); }

// эффекты поверх произвольного W×H-контента (превью трансформации): силуэт — по альфе,
// толщина обводки/тени постоянна (эффект пересчитывается под текущую форму)
export function fxOnCanvas(src, effects, W, H) {
  if (!effects || !effects.length) return src;
  return build(src, maskFromAlpha(src.getContext('2d').getImageData(0, 0, W, H).data, W, H), effects, W, H); }

function clipPreview(m, memByIdx, src, W, H) {
  if (!m.L.clip) return src;
  const bi = clipBase(m.idx); if (bi < 0 || !effVis(bi)) return null;
  const mask = memByIdx.get(bi)?.content || layerFloatCanvas(bi);
  const out = cv(W, H), x = out.getContext('2d'); x.imageSmoothingEnabled = false;
  x.drawImage(src, 0, 0); x.globalCompositeOperation = 'destination-in';
  x.drawImage(mask, 0, 0); x.globalCompositeOperation = 'source-over'; return out;
}

// canvas только эффектов папки вокруг готового силуэта grp (which='below' под группой |
// 'above' внутр.-тени по силуэту). Возвращает прозрачный W×H, если эффектов нет.
function folderFxOn(grp, effects, which, W, H) {
  const eff = visiblePixelEffects(effects || []).filter((e) => (which === 'above' ? INNER_EFFECTS.has(e.type) : !INNER_EFFECTS.has(e.type)));
  const out = cv(W, H); if (!eff.length) return out;
  const mask = maskFromAlpha(grp.getContext('2d').getImageData(0, 0, W, H).data, W, H), ox = out.getContext('2d');
  for (const e of eff) { const ec = effCanvas(EFFECT_PIXELS[e.type](mask, W, H, e.params), hexToRgb(e.params.color), W, H);
    if (which === 'above') { const ix = ec.getContext('2d'); ix.globalCompositeOperation = 'destination-in'; ix.drawImage(grp, 0, 0); }
    ox.globalAlpha = e.opacity ?? 1; ox.drawImage(ec, 0, 0); }
  ox.globalAlpha = 1; return out; }

// Превью трансформации с эффектами: mems = [{ idx, L, content }] — трансформированный
// контент каждого слоя на полном W×H, снизу вверх. Кладёт эффекты каждого слоя и
// эффекты папок, чьи члены попали в трансформацию (как в обычном композите).
export function fxPreview(mems, W, H) { const out = cv(W, H), ox = out.getContext('2d'); ox.imageSmoothingEnabled = false;
  const inF = (L, fid) => folderChain(L.fid).some((f) => f.id === fid);
  const memByIdx = new Map(mems.map((m) => [m.idx, m]));
  const folders = S.folders.filter((f) => folderEffectsFor(f).length && mems.some((m) => inF(m.L, f.id)));
  const grpCanvas = (f) => { const g = cv(W, H), gx = g.getContext('2d'); gx.imageSmoothingEnabled = false;
    for (const m of mems) if (inF(m.L, f.id) && !m.L.clip) gx.drawImage(m.content, 0, 0); return g; };
  const byDepth = (a, b) => folderChain(a.id).length - folderChain(b.id).length;
  for (const f of folders.slice().sort(byDepth)) ox.drawImage(folderFxOn(grpCanvas(f), folderEffectsFor(f), 'below', W, H), 0, 0);
  for (const m of mems) { const c = clipPreview(m, memByIdx, fxOnCanvas(m.content, layerRenderEffects(m.idx), W, H), W, H);
    if (c) ox.drawImage(c, 0, 0); }
  for (const f of folders.slice().sort((a, b) => byDepth(b, a))) ox.drawImage(folderFxOn(grpCanvas(f), folderEffectsFor(f), 'above', W, H), 0, 0);
  return out; }

// слои поддерева папки (с их эффектами) в один canvas — силуэт группы для её эффектов
function groupCanvas(fid) { const c = cv(S.W, S.H), x = c.getContext('2d'); x.imageSmoothingEnabled = false;
  for (let i = 0; i < S.layers.length; i++) { const L = S.layers[i];
    if (!folderChain(L.fid).some((f) => f.id === fid) || !effVis(i) || L.opacity <= 0) continue;
    const cb = L.clip ? null : layerSrcCanvas(i); if (!cb) continue; x.globalAlpha = L.opacity; x.drawImage(cb, 0, 0); }
  x.globalAlpha = 1; return c; }

// подпись состава группы для кеша её эффектов: контент И эффекты каждого слоя
// поддерева (incl. черновик) — чтобы добавление/правка эффекта слою внутри сразу
// перерисовывала эффект папки вокруг обновлённого силуэта
function memberSig(fid) { let s = '';
  for (let i = 0; i < S.layers.length; i++) { if (!folderChain(S.layers[i].fid).some((f) => f.id === fid)) continue;
    s += i + ':' + layerRev(i) + ':' + JSON.stringify(layerRenderEffects(i)) + ';'; }
  return s; }

const fcache = new Map(); // fid+'|'+which → { sig, canvas }
// canvas эффектов папки: which='below' (под группой) | 'above' (поверх, по силуэту группы)
export function folderFx(folder, which) { const all = folderEffectsFor(folder);
  const eff = visiblePixelEffects(all).filter((e) => (which === 'above' ? INNER_EFFECTS.has(e.type) : !INNER_EFFECTS.has(e.type)));
  if (!eff.length) return null;
  const key = folder.id + '|' + which, sig = S.W + 'x' + S.H + '|' + memberSig(folder.id) + '|' + JSON.stringify(eff);
  const hit = fcache.get(key); if (hit && hit.sig === sig) return hit.canvas;
  const out = folderFxOn(groupCanvas(folder.id), all, which, S.W, S.H);
  fcache.set(key, { sig, canvas: out }); return out; }
