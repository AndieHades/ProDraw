// Чистый расчёт пикселей неразрушающих эффектов слоя из булевой маски силуэта.
// Возвращает списки [x, y, alpha0..255]. Без DOM и state — тестируется в node.
import { FLAT_EFFECT_PIXELS } from './effect-kernels.js';

// маска H×W из сетки слоя (клетка непуста) или из альфы RGBA-буфера
export const maskFromGrid = (grid, W, H) => Array.from({ length: H }, (_, y) => Array.from({ length: W }, (_, x) => !!grid[y][x]));
export function maskFromAlpha(data, W, H) { const m = Array.from({ length: H }, () => new Array(W).fill(false));
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (data[(y * W + x) * 4 + 3] > 0) m[y][x] = true; return m; }

function flattenMask(mask, W, H) { const flat = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (mask[y][x]) flat[y * W + x] = 1;
  return flat; }
const run = (type, mask, W, H, params) => FLAT_EFFECT_PIXELS[type](flattenMask(mask, W, H), W, H, params);

// Обводка: кольца пустых клеток вокруг силуэта (size проходов), полная альфа.
export function strokePixels(mask, W, H, p) { return run('stroke', mask, W, H, p); }

// Свечение: мягкий ореол наружу (поле расстояний), интенсивность = пик альфы.
export function glowPixels(mask, W, H, p) { return run('glow', mask, W, H, p); }

// Внешняя тень: силуэт со сдвигом (ядро на полной интенсивности) + мягкая кайма по size.
export function dropShadowPixels(mask, W, H, p) { return run('dropShadow', mask, W, H, p); }

// Внутренняя тень: полоса вдоль освещённого края внутрь слоя (толщина size, спад к центру).
export function innerShadowPixels(mask, W, H, p) { return run('innerShadow', mask, W, H, p); }

export const EFFECT_PIXELS = { stroke: strokePixels, glow: glowPixels, dropShadow: dropShadowPixels, innerShadow: innerShadowPixels };
// эффекты, рисуемые ПОД слоем (наружу) vs ВНУТРИ поверх контента (по маске слоя)
export const INNER_EFFECTS = new Set(['innerShadow']);

// Насколько эффекты вылезают за силуэт наружу по каждой стороне (в пикселях):
// внутренние не вылезают; обводка/свечение — на радиус size; тень добавляет
// своё смещение к радиусу. Нужно, чтобы при применении раздвинуть холст.
export function effectReach(effects) { const R = { l: 0, r: 0, t: 0, b: 0 };
  for (const e of effects || []) { if (e.visible === false || INNER_EFFECTS.has(e.type)) continue;
    const p = e.params, s = Math.max(0, p.size | 0); let l = s, r = s, t = s, b = s;
    if (e.type === 'dropShadow') { const dx = p.dx | 0, dy = p.dy | 0;
      r += Math.max(0, dx); l += Math.max(0, -dx); b += Math.max(0, dy); t += Math.max(0, -dy); }
    R.l = Math.max(R.l, l); R.r = Math.max(R.r, r); R.t = Math.max(R.t, t); R.b = Math.max(R.b, b); }
  return R; }

// renderEffectOnly: пиксели одного эффекта по силуэту mask в координатах холста
// (с запасом наружу — могут быть < 0 или >= W/H, чтобы эффект не обрезался).
// Возвращает [x, y, alpha]; цвет берёт вызывающий. Для Convert To Layer/экспорта.
export function effectLayerPixels(mask, W, H, eff) { const fn = EFFECT_PIXELS[eff.type]; if (!fn) return [];
  let minx = W, miny = H, maxx = -1, maxy = -1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (mask[y][x]) {
    minx = Math.min(minx, x); miny = Math.min(miny, y);
    maxx = Math.max(maxx, x); maxy = Math.max(maxy, y); }
  if (maxx < 0) return [];
  const R = effectReach([{ ...eff, visible: true }]), ox = minx - R.l, oy = miny - R.t;
  const width = maxx - minx + 1 + R.l + R.r, height = maxy - miny + 1 + R.t + R.b;
  const flat = new Uint8Array(width * height);
  for (let y = miny; y <= maxy; y++) for (let x = minx; x <= maxx; x++) if (mask[y][x]) {
    flat[(y - oy) * width + x - ox] = 1; }
  return FLAT_EFFECT_PIXELS[eff.type](flat, width, height, eff.params).map(
    ([x, y, alpha]) => [x + ox, y + oy, alpha]); }
