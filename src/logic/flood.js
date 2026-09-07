// Flood fill over a colour-key surface; traversal can be clipped by a predicate.
// A surface answers keyAt(x, y): equal keys mean equal colour, and
// EMPTY_COLOR_KEY marks an absent pixel. Callers build one from a typed raster
// region (production) or from a plain grid (fixtures and pure tests).
import { colorKeyOf } from './raster/regionColorKeys.ts';

export function gridFloodSurface(grid) {
  const height = grid.length, width = grid[0] ? grid[0].length : 0;
  return { width, height, keyAt: (x, y) => colorKeyOf(grid[y]?.[x]) };
}

// wrap — тороидальная заливка (Tile Mode): соседи за краем берутся с другой
// стороны, заливка связна через шов.
export function floodRegion(surface, x, y, canVisit = () => true, wrap = false) {
  const W = surface.width, H = surface.height;
  const wx = wrap ? (v) => ((v % W) + W) % W : (v) => v, wy = wrap ? (v) => ((v % H) + H) % H : (v) => v;
  x = wx(x); y = wy(y);
  if (x < 0 || y < 0 || x >= W || y >= H || !canVisit(x, y)) return [];
  const target = surface.keyAt(x, y), out = [], seen = new Set(), st = [[x, y]];
  while (st.length) {
    let [cx, cy] = st.pop(); cx = wx(cx); cy = wy(cy);
    if (cx < 0 || cy < 0 || cx >= W || cy >= H || !canVisit(cx, cy)) continue;
    const key = cy * W + cx; if (seen.has(key)) continue; seen.add(key);
    if (surface.keyAt(cx, cy) !== target) continue;
    out.push([cx, cy]); st.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
  }
  return out;
}

// Scanline visitor avoids allocating one coordinate pair and Set entry per pixel.
// The surface is a snapshot, so the callback may paint while the walk continues.
export function visitFloodRegion(surface, x, y, canVisit, visit, wrap = false) {
  if (wrap) { for (const point of floodRegion(surface, x, y, canVisit, true)) visit(...point); return; }
  const W = surface.width, H = surface.height;
  if (x < 0 || y < 0 || x >= W || y >= H || !canVisit(x, y)) return;
  const target = surface.keyAt(x, y), seen = new Uint8Array(W * H), stack = [x, y];
  const eligible = (px, py) => px >= 0 && py >= 0 && px < W && py < H &&
    !seen[py * W + px] && canVisit(px, py) && surface.keyAt(px, py) === target;
  while (stack.length) {
    const sy = stack.pop(), sx = stack.pop(); if (!eligible(sx, sy)) continue;
    let left = sx; while (eligible(left - 1, sy)) left--;
    let above = false, below = false;
    for (let px = left; eligible(px, sy); px++) {
      seen[sy * W + px] = 1; visit(px, sy);
      const up = eligible(px, sy - 1), down = eligible(px, sy + 1);
      if (up && !above) stack.push(px, sy - 1);
      if (down && !below) stack.push(px, sy + 1);
      above = up; below = down;
    }
  }
}
