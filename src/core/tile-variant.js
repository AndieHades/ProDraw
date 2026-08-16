import { getTile, addTileUnique } from './tileset.js';
import { transformTile, cellFlags } from '../logic/tile-transform.js';

const cloneColor = (c) => (c ? c.slice() : null);
const copyGrid = (g) => g.map((r) => r.map(cloneColor));
const flipGridH = (g) => g.map((r) => r.slice().reverse().map(cloneColor));
const flipGridV = (g) => g.slice().reverse().map((r) => r.map(cloneColor));

function rotateGrid90(g) {
  const h = g.length, w = g[0]?.length || 0;
  const out = Array.from({ length: w }, () => new Array(h).fill(null));
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) out[x][h - 1 - y] = cloneColor(g[y][x]);
  return out;
}

function fitTileGrid(g, w, h) {
  return Array.from({ length: h }, (_, y) => Array.from({ length: w }, (_, x) => cloneColor(g[y] && g[y][x])));
}

export function createTileVariantCell(ts, cell, op) {
  const src = getTile(ts, cell?.tileId); if (!src) return null;
  const base = transformTile(src.grid, cellFlags(cell));
  const grid = fitTileGrid(op === 'flipH' ? flipGridH(base) : op === 'flipV' ? flipGridV(base) : op === 'rot90' ? rotateGrid90(base) : copyGrid(base), ts.tileW, ts.tileH);
  const res = addTileUnique(ts, grid, { name: src.name, groupId: src.groupId, weight: src.weight });
  return {
    tile: res.tile,
    added: res.added,
    cell: { tileId: res.tile.id, flipX: false, flipY: false, diagonalFlip: false, rotation: 0, ...(res.added ? { local: true } : {}) },
  };
}
