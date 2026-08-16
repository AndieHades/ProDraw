// Оверлей tilemap: сетка границ клеток активного tilemap-слоя и рамка выбранной
// клетки/области. Рисуется поверх холста через событие 'overlay' (как рамка
// трансформации) — композит не трогаем.
import { S } from '../core/state.js';
import * as bus from '../core/bus.js';
import { getTileset, getTile } from '../core/tileset.js';
import { isTilemap, inMap, stampTileId, rollRandomTile } from '../core/tilemap.js';
import { transformTile } from '../logic/tile-transform.js';
import { hexToRgb, rgbToHex, farthestColor } from '../logic/color.js';
import { C } from '../styles/canvas-colors.js';

// цвет сетки Tileset Grid, гарантированно отличный от обычной сетки (когда та
// видна) — чтобы не перепутать; иначе берём свой тёплый токен
function tilesetGridColor() {
  if (!(S.grid && (S.grid.visible || S.grid.preview))) return C.tileGrid;
  const ref = hexToRgb(S.grid.color || '#4aa3ff');
  return rgbToHex(farthestColor(ref, [hexToRgb(C.tileGrid), [255, 255, 255]]));
}

function draw({ ctx, ox, oy, z }) {
  if (!(S.tileset && S.tileset.on)) return; // Tileset Grid и его оверлеи — только на активном Tilemap
  drawTilesetGrid(ctx, ox, oy, z); // квадраты Tileset Grid поверх всего холста (любой слой)
  drawSelCell(ctx, ox, oy, z); // выбранная клетка — белая обводка
  const L = S.layers[S.cur]; if (!isTilemap(L)) return;
  const ts = getTileset(L.tilemap.tilesetId); if (!ts) return;
  drawBrushPreview(ctx, ox, oy, z, ts, L);
}

// размер квадрата в контексте: тайл активного Tile-слоя или Tileset Grid (квадрат)
function cellSize(L) { if (isTilemap(L)) { const ts = getTileset(L.tilemap.tilesetId); if (ts) return [ts.tileW, ts.tileH]; }
  return [S.tileGrid.size, S.tileGrid.size]; }

// сетка квадратов Tileset Grid по всему холсту
function drawTilesetGrid(ctx, ox, oy, z) { const L = S.layers[S.cur]; if (!L) return; const [cw, ch] = cellSize(L);
  ctx.save(); ctx.globalAlpha = 0.55; ctx.strokeStyle = tilesetGridColor(); ctx.lineWidth = 1; ctx.beginPath();
  const xs = new Set([S.W]); for (let x = 0; x <= S.W; x += cw) xs.add(x);
  const ys = new Set([S.H]); for (let y = 0; y <= S.H; y += ch) ys.add(y);
  for (const x of xs) { ctx.moveTo(ox + x * z, oy); ctx.lineTo(ox + x * z, oy + S.H * z); }
  for (const y of ys) { ctx.moveTo(ox, oy + y * z); ctx.lineTo(ox + S.W * z, oy + y * z); }
  ctx.stroke(); ctx.restore(); }

// чёткая белая обводка выбранной клетки (с тёмной подложкой для контраста)
function drawSelCell(ctx, ox, oy, z) {
  const sel = S.tileSel, L = S.layers[S.cur]; if (!sel || sel.li !== S.cur || !L || !(S.tileset && S.tileset.on)) return;
  const [cw, ch] = cellSize(L);
  const x0 = Math.min(sel.x0, sel.x1), y0 = Math.min(sel.y0, sel.y1), x1 = Math.max(sel.x0, sel.x1), y1 = Math.max(sel.y0, sel.y1);
  const px = ox + x0 * cw * z, py = oy + y0 * ch * z, w = (x1 - x0 + 1) * cw * z, h = (y1 - y0 + 1) * ch * z;
  ctx.save(); ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.strokeRect(px, py, w, h);
  ctx.lineWidth = 1.5; ctx.strokeStyle = C.fg; ctx.strokeRect(px, py, w, h); ctx.restore();
}

// превью тайла на кисти: показывает, ЧЕМ заполняешь (с учётом флипов/паттерна/
// random), ровно в клетке под курсором. Random фиксируется на клетку → клик
// ставит именно то, что в превью.
let lastCell = '';
function drawBrushPreview(ctx, ox, oy, z, ts, L) {
  if (S.tool !== 'tilebrush' || S.tileMode !== 'paint' || !S.hoverPx) return;
  const cx = Math.floor(S.hoverPx[0] / ts.tileW), cy = Math.floor(S.hoverPx[1] / ts.tileH);
  if (!inMap(L.tilemap, cx, cy)) return;
  const key = cx + ',' + cy; if (S.tileRandom && key !== lastCell) rollRandomTile(); lastCell = key;
  const px0 = ox + cx * ts.tileW * z, py0 = oy + cy * ts.tileH * z;
  const id = stampTileId(cx, cy, ts.id), tile = id != null && getTile(ts, id);
  ctx.save();
  if (tile) { const g = transformTile(tile.grid, S.tileFlags); ctx.globalAlpha = 0.75;
    for (let y = 0; y < ts.tileH; y++) for (let x = 0; x < ts.tileW; x++) { const c = g[y] && g[y][x]; if (!c) continue;
      ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${(c.length > 3 ? c[3] : 255) / 255})`; ctx.fillRect(px0 + x * z, py0 + y * z, z + 0.6, z + 0.6); } }
  ctx.globalAlpha = 1; ctx.strokeStyle = C.accent; ctx.lineWidth = 2;
  ctx.strokeRect(px0, py0, ts.tileW * z, ts.tileH * z); ctx.restore();
}

export function mount() { bus.on('overlay', draw); }
