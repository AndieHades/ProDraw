// Чистый расчёт пикселей неразрушающих эффектов слоя из булевой маски силуэта.
// Возвращает списки [x, y, alpha0..255]. Без DOM и state — тестируется в node.
import { FLAT_EFFECT_PIXELS } from "./effect-kernels.ts";
import type { EffectParams, EffectPixel } from "./effect-kernels.ts";

export type EffectMask = boolean[][];
export type { EffectParams, EffectPixel } from "./effect-kernels.ts";
export interface LayerEffect {
  readonly type: string;
  readonly params: EffectParams;
  readonly visible?: boolean;
}
export interface EffectReach {
  l: number; r: number; t: number; b: number;
}

type Grid = { readonly [y: number]: { readonly [x: number]: unknown } };

// маска H×W из сетки слоя (клетка непуста) или из альфы RGBA-буфера
export const maskFromGrid = (grid: Grid, W: number, H: number): EffectMask =>
  Array.from({ length: H }, (_, y) =>
    Array.from({ length: W }, (_, x) => !!grid[y]?.[x]));

export function maskFromAlpha(data: ArrayLike<number>, W: number, H: number): EffectMask {
  const mask: EffectMask = Array.from({ length: H }, () => new Array<boolean>(W).fill(false));
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if ((data[(y * W + x) * 4 + 3] ?? 0) > 0) (mask[y] as boolean[])[x] = true;
  }
  return mask;
}

function flattenMask(mask: EffectMask, W: number, H: number): Uint8Array {
  const flat = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (mask[y]?.[x]) flat[y * W + x] = 1;
  }
  return flat;
}

const run = (type: string, mask: EffectMask, W: number, H: number,
  params: EffectParams): EffectPixel[] =>
  FLAT_EFFECT_PIXELS[type]?.(flattenMask(mask, W, H), W, H, params) ?? [];

// Обводка: кольца пустых клеток вокруг силуэта (size проходов), полная альфа.
export const strokePixels = (mask: EffectMask, W: number, H: number,
  params: EffectParams): EffectPixel[] => run("stroke", mask, W, H, params);

// Свечение: мягкий ореол наружу (поле расстояний), интенсивность = пик альфы.
export const glowPixels = (mask: EffectMask, W: number, H: number,
  params: EffectParams): EffectPixel[] => run("glow", mask, W, H, params);

// Внешняя тень: силуэт со сдвигом (ядро на полной интенсивности) + мягкая кайма по size.
export const dropShadowPixels = (mask: EffectMask, W: number, H: number,
  params: EffectParams): EffectPixel[] => run("dropShadow", mask, W, H, params);

// Внутренняя тень: полоса вдоль освещённого края внутрь слоя (толщина size, спад к центру).
export const innerShadowPixels = (mask: EffectMask, W: number, H: number,
  params: EffectParams): EffectPixel[] => run("innerShadow", mask, W, H, params);

export const EFFECT_PIXELS = { stroke: strokePixels, glow: glowPixels,
  dropShadow: dropShadowPixels, innerShadow: innerShadowPixels };
// эффекты, рисуемые ПОД слоем (наружу) vs ВНУТРИ поверх контента (по маске слоя)
export const INNER_EFFECTS = new Set(["innerShadow"]);

// Насколько эффекты вылезают за силуэт наружу по каждой стороне (в пикселях):
// внутренние не вылезают; обводка/свечение — на радиус size; тень добавляет
// своё смещение к радиусу. Нужно, чтобы при применении раздвинуть холст.
export function effectReach(effects: readonly LayerEffect[] | null | undefined): EffectReach {
  const reach: EffectReach = { l: 0, r: 0, t: 0, b: 0 };
  for (const effect of effects ?? []) {
    if (effect.visible === false || INNER_EFFECTS.has(effect.type)) continue;
    const size = Math.max(0, (effect.params.size ?? 0) | 0);
    let l = size, r = size, t = size, b = size;
    if (effect.type === "dropShadow") {
      const dx = (effect.params.dx ?? 0) | 0, dy = (effect.params.dy ?? 0) | 0;
      r += Math.max(0, dx); l += Math.max(0, -dx);
      b += Math.max(0, dy); t += Math.max(0, -dy);
    }
    reach.l = Math.max(reach.l, l); reach.r = Math.max(reach.r, r);
    reach.t = Math.max(reach.t, t); reach.b = Math.max(reach.b, b);
  }
  return reach;
}

// renderEffectOnly: пиксели одного эффекта по силуэту mask в координатах холста
// (с запасом наружу — могут быть < 0 или >= W/H, чтобы эффект не обрезался).
// Возвращает [x, y, alpha]; цвет берёт вызывающий. Для Convert To Layer/экспорта.
export function effectLayerPixels(mask: EffectMask, W: number, H: number,
  effect: LayerEffect): EffectPixel[] {
  const kernel = FLAT_EFFECT_PIXELS[effect.type];
  if (!kernel) return [];
  let minx = W, miny = H, maxx = -1, maxy = -1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (mask[y]?.[x]) {
    minx = Math.min(minx, x); miny = Math.min(miny, y);
    maxx = Math.max(maxx, x); maxy = Math.max(maxy, y);
  }
  if (maxx < 0) return [];
  const reach = effectReach([{ ...effect, visible: true }]);
  const ox = minx - reach.l, oy = miny - reach.t;
  const width = maxx - minx + 1 + reach.l + reach.r;
  const height = maxy - miny + 1 + reach.t + reach.b;
  const flat = new Uint8Array(width * height);
  for (let y = miny; y <= maxy; y++) for (let x = minx; x <= maxx; x++) {
    if (mask[y]?.[x]) flat[(y - oy) * width + x - ox] = 1;
  }
  return kernel(flat, width, height, effect.params)
    .map(([x, y, alpha]) => [x + ox, y + oy, alpha] as EffectPixel);
}
