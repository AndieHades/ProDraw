// Чистый расчёт пикселей неразрушающих эффектов слоя из булевой маски силуэта.
// Возвращает списки [x, y, alpha0..255]. Без DOM и state — тестируется в node.
import { outlineRings } from './outline.js';
import { computeGlow } from './glow.js';

// маска H×W из сетки слоя (клетка непуста) или из альфы RGBA-буфера
export const maskFromGrid = (grid, W, H) => Array.from({ length: H }, (_, y) => Array.from({ length: W }, (_, x) => !!grid[y][x]));
export function maskFromAlpha(data, W, H) { const m = Array.from({ length: H }, () => new Array(W).fill(false));
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (data[(y * W + x) * 4 + 3] > 8) m[y][x] = true; return m; }

const inB = (x, y, W, H) => x >= 0 && y >= 0 && x < W && y < H;
function shiftMask(mask, W, H, dx, dy) { const out = Array.from({ length: H }, () => new Array(W).fill(false));
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (mask[y][x] && inB(x + dx, y + dy, W, H)) out[y + dy][x + dx] = true; return out; }

// Обводка: кольца пустых клеток вокруг силуэта (size проходов), полная альфа.
export function strokePixels(mask, W, H, p) { return outlineRings(mask, W, H, Math.max(1, p.size | 0)).map(([x, y]) => [x, y, 255]); }

// Свечение: мягкий ореол наружу (поле расстояний), интенсивность = пик альфы.
export function glowPixels(mask, W, H, p) { return computeGlow(mask, W, H, Math.max(1, p.size | 0), p.intensity); }

// Внешняя тень: силуэт со сдвигом (ядро на полной интенсивности) + мягкая кайма по size.
export function dropShadowPixels(mask, W, H, p) { const sh = shiftMask(mask, W, H, p.dx | 0, p.dy | 0);
  const a = Math.round(255 * p.intensity), out = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (sh[y][x]) out.push([x, y, a]);
  if (p.size > 0) for (const c of computeGlow(sh, W, H, p.size | 0, p.intensity)) out.push(c);
  return out; }

// Внутренняя тень: полоса вдоль освещённого края внутрь слоя (толщина size, спад к центру).
export function innerShadowPixels(mask, W, H, p) { const size = Math.max(1, p.size | 0);
  const ux = Math.sign(p.dx | 0), uy = Math.sign(p.dy | 0), dist = Array.from({ length: H }, () => new Array(W).fill(-1));
  const q = []; // BFS от «освещённого» края внутрь силуэта
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { if (!mask[y][x]) continue;
    let seed; if (ux || uy) { const sx = x - ux, sy = y - uy; seed = !inB(sx, sy, W, H) || !mask[sy][sx]; }
    else seed = (!inB(x - 1, y, W, H) || !mask[y][x - 1]) || (!inB(x + 1, y, W, H) || !mask[y][x + 1]) || (!inB(x, y - 1, W, H) || !mask[y - 1][x]) || (!inB(x, y + 1, W, H) || !mask[y + 1][x]);
    if (seed) { dist[y][x] = 0; q.push([x, y]); } }
  const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]], out = [];
  for (let h = 0; h < q.length; h++) { const [x, y] = q[h], d = dist[y][x];
    if (d >= size) continue;
    for (const [dx, dy] of N4) { const nx = x + dx, ny = y + dy;
      if (inB(nx, ny, W, H) && mask[ny][nx] && dist[ny][nx] < 0) { dist[ny][nx] = d + 1; q.push([nx, ny]); } } }
  for (const [x, y] of q) { const d = dist[y][x], a = Math.round(255 * p.intensity * (1 - d / size)); if (a > 0) out.push([x, y, a]); }
  return out; }

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
  const R = effectReach([{ ...eff, visible: true }]), W2 = W + R.l + R.r, H2 = H + R.t + R.b;
  const m2 = Array.from({ length: H2 }, () => new Array(W2).fill(false));
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (mask[y][x]) m2[y + R.t][x + R.l] = true;
  return fn(m2, W2, H2, eff.params).map(([x, y, a]) => [x - R.l, y - R.t, a]); }
