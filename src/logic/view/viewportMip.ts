// Мип-уровни презентации вьюпорта: уровень k — композит, уменьшенный в 2^k раз
// усреднением 2×2. Билинейная выборка canvas честна только до двукратного
// уменьшения, поэтому сильнее уменьшенный вид рисуется с ближайшего уровня.
export interface MipBounds { readonly minx: number; readonly miny: number;
  readonly maxx: number; readonly maxy: number }
export interface MipRect { readonly x: number; readonly y: number;
  readonly width: number; readonly height: number }

// Уровень, после которого до экрана остаётся уменьшение не сильнее чем вдвое.
export function viewportMipLevel(deviceScale: number): number {
  if (!Number.isFinite(deviceScale) || deviceScale <= 0 || deviceScale > 0.5) return 0;
  return Math.floor(-Math.log2(deviceScale) + 1e-9);
}

export const mipLevelSide = (side: number, level: number): number =>
  Math.max(1, Math.ceil(side / 2 ** level));

export function unionMipBounds(left: MipBounds | null, right: MipBounds): MipBounds {
  if (!left) return right;
  return { minx: Math.min(left.minx, right.minx), miny: Math.min(left.miny, right.miny),
    maxx: Math.max(left.maxx, right.maxx), maxy: Math.max(left.maxy, right.maxy) };
}

// Пиксели уровня level (ширина×высота уровня), зависящие от инклюзивных bounds
// исходника; null — если повреждение целиком вне уровня.
export function mipDamageRect(bounds: MipBounds, level: number,
  width: number, height: number): MipRect | null {
  const factor = 2 ** level;
  const x = Math.max(0, Math.floor(bounds.minx / factor));
  const y = Math.max(0, Math.floor(bounds.miny / factor));
  const right = Math.min(width - 1, Math.floor(bounds.maxx / factor));
  const bottom = Math.min(height - 1, Math.floor(bounds.maxy / factor));
  if (right < x || bottom < y) return null;
  return { x, y, width: right - x + 1, height: bottom - y + 1 };
}
