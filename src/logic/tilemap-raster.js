// Растеризация tilemap: из сетки клеток (tileId + флаги) и тайлов собираем
// пиксельную сетку слоя W×H. Это кеш для рендера — источник истины остаётся
// в cells + tileset. Чистая логика: тайлы приходят как Map id→grid.
import { blank } from './raster.js';
import { transformTile, cellFlags } from './tile-transform.js';

// положить трансформированный тайл в grid по пиксельному смещению (ox,oy)
function stampTile(grid, tileGrid, ox, oy, W, H) {
  for (let y = 0; y < tileGrid.length; y++) for (let x = 0; x < tileGrid[0].length; x++) {
    const c = tileGrid[y][x]; if (!c) continue;
    const px = ox + x, py = oy + y;
    if (px >= 0 && py >= 0 && px < W && py < H) grid[py][px] = c.slice();
  }
}

// собрать пиксельную сетку слоя. tm = { cells, mapW, mapH }; tileW/tileH —
// размер тайла; tileGrid(id) → сетка тайла или null (пустая клетка/нет тайла).
export function rasterTilemap(tm, tileW, tileH, tileGrid) {
  const W = tm.mapW * tileW, H = tm.mapH * tileH;
  const grid = blank(W, H);
  for (let cy = 0; cy < tm.mapH; cy++) for (let cx = 0; cx < tm.mapW; cx++) {
    const cell = tm.cells[cy * tm.mapW + cx];
    if (!cell || cell.tileId == null) continue;
    const src = tileGrid(cell.tileId); if (!src) continue;
    stampTile(grid, transformTile(src, cellFlags(cell)), cx * tileW, cy * tileH, W, H);
  }
  return grid;
}

// пиксельные размеры карты
export const tilemapPixelSize = (tm, tileW, tileH) => ({ w: tm.mapW * tileW, h: tm.mapH * tileH });
