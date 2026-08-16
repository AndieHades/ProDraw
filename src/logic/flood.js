// Flood fill over an arbitrary grid; traversal can be clipped by a predicate.
import { eqc } from './color.js';

const sameCell = (a, b) => (a && b ? eqc(a, b) : !a && !b);

// wrap — тороидальная заливка (Tile Mode): соседи за краем берутся с другой
// стороны, заливка связна через шов.
export function floodRegion(grid, x, y, canVisit = () => true, wrap = false) {
  const H = grid.length, W = grid[0] ? grid[0].length : 0;
  const wx = wrap ? (v) => ((v % W) + W) % W : (v) => v, wy = wrap ? (v) => ((v % H) + H) % H : (v) => v;
  x = wx(x); y = wy(y);
  if (x < 0 || y < 0 || x >= W || y >= H || !canVisit(x, y)) return [];
  const target = grid[y][x], out = [], seen = new Set(), st = [[x, y]];
  while (st.length) {
    let [cx, cy] = st.pop(); cx = wx(cx); cy = wy(cy);
    if (cx < 0 || cy < 0 || cx >= W || cy >= H || !canVisit(cx, cy)) continue;
    const key = cy * W + cx; if (seen.has(key)) continue; seen.add(key);
    if (!sameCell(grid[cy][cx], target)) continue;
    out.push([cx, cy]); st.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
  }
  return out;
}
