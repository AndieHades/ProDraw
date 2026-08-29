import { conservativeGridBounds, setGridBounds } from '../logic/raster.js';
import { hexToRgb } from '../logic/color.ts';
import { normalizeTextSource } from '../logic/text-model.ts';
import { displayLines, lineAdvance, lineWidth } from '../logic/text-layout.ts';
import { rasterTextBox, textRasterBounds } from './text-canvas-raster.js';

const visibleAlpha = (value) => value > 7;
const cowGrids = new WeakMap();
const merge = (left, right) => !left ? right : !right ? left : ({
  minx: Math.min(left.minx, right.minx), miny: Math.min(left.miny, right.miny),
  maxx: Math.max(left.maxx, right.maxx), maxy: Math.max(left.maxy, right.maxy),
});
const validGrid = (grid, width, height) => Array.isArray(grid) &&
  grid.length === height && grid[0]?.length === width;
const boxBounds = (src, width, height) => {
  const minx = Math.max(0, src.box.x), miny = Math.max(0, src.box.y);
  const maxx = Math.min(width - 1, src.box.x + src.box.w - 1);
  const maxy = Math.min(height - 1, src.box.y + src.box.h - 1);
  return maxx < minx || maxy < miny ? null : { minx, miny, maxx, maxy };
};

function emptyTextGrid(width, height) {
  const emptyRow = new Array(width).fill(null);
  const grid = new Array(height).fill(emptyRow);
  cowGrids.set(grid, { emptyRow }); setGridBounds(grid, null, true);
  return grid;
}

function copyDamage(previous, width, height, damage) {
  const source = validGrid(previous, width, height)
    ? previous : emptyTextGrid(width, height);
  const grid = source.slice(), cow = cowGrids.get(source);
  if (cow) cowGrids.set(grid, cow);
  if (!damage) return grid;
  for (let y = damage.miny; y <= damage.maxy; y += 1) {
    const sourceRow = source[y];
    const row = cow && sourceRow === cow.emptyRow
      ? new Array(width) : sourceRow.slice();
    grid[y] = row;
    for (let x = damage.minx; x <= damage.maxx; x += 1) row[x] = null;
  }
  return grid;
}

function writeCanvas(grid, raster, color) {
  if (!raster) return null;
  const [red, green, blue] = color; let bounds = null;
  for (let y = 0; y < raster.bounds.height; y += 1) {
    for (let x = 0; x < raster.bounds.width; x += 1) {
      const alpha = raster.data[(y * raster.bounds.width + x) * 4 + 3];
      if (!visibleAlpha(alpha)) continue;
      const targetX = raster.bounds.x + x, targetY = raster.bounds.y + y;
      grid[targetY][targetX] = [red, green, blue, alpha];
      bounds = merge(bounds, { minx: targetX, miny: targetY,
        maxx: targetX, maxy: targetY });
    }
  }
  return bounds;
}

function lineX(src, line, measure) {
  const width = lineWidth(src, line, measure);
  if (src.align === 'right') return src.box.x + src.box.w - width;
  if (src.align === 'center') return src.box.x + (src.box.w - width) / 2;
  return src.box.x;
}

function writeFallback(grid, src, width, height, color) {
  if (!src.value.trim()) return null;
  const characterWidth = Math.max(1, Math.round(src.size * 0.5));
  const characterHeight = Math.max(1, src.size);
  const measure = (line) => [...String(line || ' ')].length * characterWidth +
    Math.max(0, [...String(line || ' ')].length - 1) * Math.round(src.letterSpacing);
  let py = src.box.y, bounds = null;
  for (const line of displayLines(src)) {
    let px = Math.round(lineX(src, line, measure));
    for (const character of line) {
      if (character !== ' ') for (let y = 0; y < characterHeight; y += 1) {
        for (let x = 0; x < characterWidth; x += 1) {
          if (x && x !== characterWidth - 1 && y && y !== characterHeight - 1 &&
            x !== (characterWidth >> 1)) continue;
          const gx = px + x, gy = py + y;
          if (gx < 0 || gy < 0 || gx >= width || gy >= height ||
            gx < src.box.x || gy < src.box.y || gx >= src.box.x + src.box.w ||
            gy >= src.box.y + src.box.h) continue;
          grid[gy][gx] = color.slice();
          bounds = merge(bounds, { minx: gx, miny: gy, maxx: gx, maxy: gy });
        }
      }
      px += characterWidth + Math.round(src.letterSpacing);
    }
    py += lineAdvance(src);
  }
  return bounds;
}

export function rasterTextGrid(text, width, height, fonts, previous) {
  const src = normalizeTextSource(text), reusable = validGrid(previous, width, height);
  const oldBounds = reusable ? conservativeGridBounds(previous) : null;
  const raster = src.value ? rasterTextBox(src, width, height, fonts) : null;
  const planned = src.value.trim() ? merge(raster?.bounds ||
    textRasterBounds(src, width, height), boxBounds(src, width, height)) : null;
  const grid = copyDamage(previous, width, height, merge(oldBounds, planned));
  const rgb = hexToRgb(src.color), canvasBounds = writeCanvas(grid, raster, rgb);
  const bounds = canvasBounds || writeFallback(grid, src, width, height,
    [...rgb, 255]);
  setGridBounds(grid, bounds, true);
  return grid;
}

export function materializeTextGrid(grid, width, height) {
  if (!validGrid(grid, width, height)) return grid;
  const cow = cowGrids.get(grid), bounds = conservativeGridBounds(grid);
  for (let y = 0; y < height; y += 1) {
    if (!bounds || y < bounds.miny || y > bounds.maxy ||
      (cow && grid[y] === cow.emptyRow)) grid[y] = new Array(width);
  }
  cowGrids.delete(grid); return grid;
}
