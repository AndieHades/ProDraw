import { blank, parseKey, setGridBounds } from './raster.js';

const arrayIndex = (key, length) => {
  const value = Number(key);
  return Number.isInteger(value) && value >= 0 && value < length &&
    String(value) === key ? value : -1;
};

function visitGrid(grid, visit) {
  for (const rowKey of Object.keys(grid || [])) {
    const y = arrayIndex(rowKey, grid.length); if (y < 0) continue;
    const row = grid[y];
    for (const cellKey of Object.keys(row || [])) {
      const x = arrayIndex(cellKey, row.length); if (x < 0) continue;
      const cell = row[x]; if (cell) visit(x, y, cell, false);
    }
  }
}

function include(bounds, x, y) {
  if (!bounds) return { minx: x, miny: y, maxx: x, maxy: y };
  bounds.minx = Math.min(bounds.minx, x); bounds.miny = Math.min(bounds.miny, y);
  bounds.maxx = Math.max(bounds.maxx, x); bounds.maxy = Math.max(bounds.maxy, y);
  return bounds;
}

export function remapRaster(grid, ext, width, height, mapPoint,
  { wrap = false, preserveGrid = false } = {}) {
  const output = blank(width, height), outside = new Map(); let bounds = null;
  const put = (x, y, cell, fromExt) => {
    let [nx, ny] = mapPoint(x, y);
    if (wrap) { nx = ((nx % width) + width) % width;
      ny = ((ny % height) + height) % height; }
    const copy = cell.slice();
    if (nx >= 0 && ny >= 0 && nx < width && ny < height) {
      if (!(fromExt && preserveGrid && output[ny][nx])) output[ny][nx] = copy;
      bounds = include(bounds, nx, ny);
    } else outside.set(nx + ',' + ny, copy);
  };
  visitGrid(grid, put);
  for (const [key, cell] of ext || []) {
    const [x, y] = parseKey(key); put(x, y, cell, true);
  }
  setGridBounds(output, bounds, true);
  return { grid: output, ext: outside, bounds };
}

export const translateRaster = (grid, ext, dx, dy, width, height, options) =>
  remapRaster(grid, ext, width, height, (x, y) => [x + dx, y + dy], options);

export const flipRaster = (grid, ext, width, height, horizontal) =>
  remapRaster(grid, ext, width, height, (x, y) => horizontal
    ? [width - 1 - x, y] : [x, height - 1 - y]);

export function rotateRasterCentered(grid, ext, width, height) {
  const dx = Math.round((width - height) / 2);
  const dy = Math.round((height - width) / 2);
  return remapRaster(grid, ext, width, height,
    (x, y) => [height - 1 - y + dx, x + dy]);
}
