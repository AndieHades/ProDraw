// Трансформации экземпляра тайла: flip/diagonal/rotation применяются к копии
// сетки тайла, источник не меняется. Чистая логика — размеры берём из сетки.
import { cloneGrid } from './raster.js';

// поворот сетки на 90° по часовой: out[x][H-1-y] = in[y][x]
function rot90(g) {
  const h = g.length, w = g[0].length;
  const out = Array.from({ length: w }, () => new Array(h).fill(null));
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) out[x][h - 1 - y] = g[y][x] ? g[y][x].slice() : null;
  return out;
}

function flipH(g) { return g.map((r) => r.slice().reverse().map((c) => (c ? c.slice() : null))); }
function flipV(g) { return g.slice().reverse().map((r) => r.map((c) => (c ? c.slice() : null))); }

// диагональный флип = транспонирование (отражение по главной диагонали)
function transpose(g) {
  const h = g.length, w = g[0].length;
  const out = Array.from({ length: w }, () => new Array(h).fill(null));
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) out[x][y] = g[y][x] ? g[y][x].slice() : null;
  return out;
}

// применить набор флагов к сетке тайла. Порядок (как в Aseprite): diagonalFlip,
// затем flipX/flipY, затем rotation. Возвращает новую сетку (источник цел).
export function transformTile(grid, flags = {}) {
  let g = cloneGrid(grid);
  if (flags.diagonalFlip) g = transpose(g);
  if (flags.flipX) g = flipH(g);
  if (flags.flipY) g = flipV(g);
  let r = ((flags.rotation || 0) % 360 + 360) % 360;
  while (r >= 90) { g = rot90(g); r -= 90; }
  return g;
}

// нормализованные дефолтные флаги клетки
export const cellFlags = (c) => ({
  flipX: !!(c && c.flipX), flipY: !!(c && c.flipY),
  diagonalFlip: !!(c && c.diagonalFlip), rotation: (c && c.rotation) || 0,
});

// обратное отображение: пиксель отображаемого (трансформированного) тайла (dx,dy)
// → координата в source-сетке. Нужно для пиксельной правки клетки с флагами
// (рисуем по тому, что видим, пишем в исходник). Тайл считаем квадратным n×n.
export function invTransformCoord(dx, dy, n, flags = {}) {
  let x = dx, y = dy;
  let r = (((flags.rotation || 0) % 360) + 360) % 360;
  for (let k = 0; k < r / 90; k++) { const nx = y, ny = n - 1 - x; x = nx; y = ny; } // обратный поворот (CCW)
  if (flags.flipY) y = n - 1 - y;
  if (flags.flipX) x = n - 1 - x;
  if (flags.diagonalFlip) { const tmp = x; x = y; y = tmp; }
  return [x, y];
}
