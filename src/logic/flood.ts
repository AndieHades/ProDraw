// Flood fill over a colour-key surface; traversal can be clipped by a predicate.
// A surface answers keyAt(x, y): equal keys mean equal colour, and
// EMPTY_COLOR_KEY marks an absent pixel. Callers build one from a typed raster
// region (production) or from a plain grid (fixtures and pure tests).
import { colorKeyOf } from "./raster/regionColorKeys.ts";

export interface FloodSurface {
  readonly width: number;
  readonly height: number;
  keyAt(x: number, y: number): number;
}

export type FloodPoint = [x: number, y: number];
export type FloodPredicate = (x: number, y: number) => boolean;
export type FloodVisitor = (x: number, y: number) => void;

export function gridFloodSurface(
  grid: readonly (readonly (readonly number[] | null)[])[]
): FloodSurface {
  const height = grid.length, width = grid[0] ? grid[0].length : 0;
  return { width, height, keyAt: (x, y) => colorKeyOf(grid[y]?.[x]) };
}

// wrap — тороидальная заливка (Tile Mode): соседи за краем берутся с другой
// стороны, заливка связна через шов.
export function floodRegion(surface: FloodSurface, x: number, y: number,
  canVisit: FloodPredicate = () => true, wrap = false): FloodPoint[] {
  const W = surface.width, H = surface.height;
  const wx = wrap ? (v: number) => ((v % W) + W) % W : (v: number) => v;
  const wy = wrap ? (v: number) => ((v % H) + H) % H : (v: number) => v;
  x = wx(x); y = wy(y);
  if (x < 0 || y < 0 || x >= W || y >= H || !canVisit(x, y)) return [];
  const target = surface.keyAt(x, y), out: FloodPoint[] = [];
  const seen = new Set<number>(), st: FloodPoint[] = [[x, y]];
  while (st.length) {
    const point = st.pop() as FloodPoint;
    const cx = wx(point[0]), cy = wy(point[1]);
    if (cx < 0 || cy < 0 || cx >= W || cy >= H || !canVisit(cx, cy)) continue;
    const key = cy * W + cx; if (seen.has(key)) continue; seen.add(key);
    if (surface.keyAt(cx, cy) !== target) continue;
    out.push([cx, cy]);
    st.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
  }
  return out;
}

// Scanline visitor avoids allocating one coordinate pair and Set entry per pixel.
// The surface is a snapshot, so the callback may paint while the walk continues.
export function visitFloodRegion(surface: FloodSurface, x: number, y: number,
  canVisit: FloodPredicate, visit: FloodVisitor, wrap = false): void {
  if (wrap) { for (const point of floodRegion(surface, x, y, canVisit, true)) {
    visit(point[0], point[1]); } return; }
  const W = surface.width, H = surface.height;
  if (x < 0 || y < 0 || x >= W || y >= H || !canVisit(x, y)) return;
  const target = surface.keyAt(x, y), seen = new Uint8Array(W * H);
  const stack: number[] = [x, y];
  const eligible = (px: number, py: number): boolean => px >= 0 && py >= 0 &&
    px < W && py < H && !seen[py * W + px] && canVisit(px, py) &&
    surface.keyAt(px, py) === target;
  while (stack.length) {
    const sy = stack.pop() as number, sx = stack.pop() as number;
    if (!eligible(sx, sy)) continue;
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
