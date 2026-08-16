// Система рендера: рисует видимый холст (фон, шахматка, слои с живыми
// превью move/transform/crop, сетка), затем оверлеи. Системные оверлеи
// (рамка трансформации) подмешиваются через событие 'overlay'.
import { S } from '../../core/state.js';
import * as bus from '../../core/bus.js';
import * as actions from '../../core/actions.js';
import { $ } from '../../core/dom.js';
import { paintStack } from '../../core/composite.js';
import { ZOOM_MIN, ZOOM_MAX } from '../../config/limits.js';
import { C } from '../../styles/canvas-colors.js';
import { hexToRgb } from '../../logic/color.js';
import { clamp01 } from '../../logic/math.js';
import { makeCanvas, syncCanvasSize } from '../../core/canvas.js';
import { drawOverlays } from './overlays.js';
import { drawBrushCursor } from './cursor.js';
import { updateAnts } from './ants.js';

const cv = $('cv'), ctx = cv.getContext('2d');
const buf = makeCanvas(1, 1); // композит слой+эффекты в пиксельном масштабе (размер ставится по кадру)
const ZOOM_STEP = 0.5;
const gridOpacity = (v) => clamp01((+v || 70) / 100);
function gridStroke(hex, opacity) {
  const c = hexToRgb(hex || '#4aa3ff');
  return c.some((v) => !Number.isFinite(v)) ? C.grid : `rgba(${c[0]},${c[1]},${c[2]},${gridOpacity(opacity)})`;
}
function drawGrid(stepX, stepY, stroke, W, H, ox, oy, z) {
  const gw = Math.max(1, Math.round(stepX) || 1), gh = Math.max(1, Math.round(stepY) || 1);
  ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.beginPath();
  const vx = new Set([W]); for (let x = 0; x <= W; x += gw) vx.add(x);
  const hy = new Set([H]); for (let y = 0; y <= H; y += gh) hy.add(y);
  for (const x of vx) { ctx.moveTo(ox + x * z, oy); ctx.lineTo(ox + x * z, oy + H * z); }
  for (const y of hy) { ctx.moveTo(ox, oy + y * z); ctx.lineTo(ox + W * z, oy + y * z); }
  ctx.stroke();
}

export function render() {
  const W = S.W, H = S.H;
  const dpr = window.devicePixelRatio || 1, cw = cv.clientWidth, chh = cv.clientHeight;
  syncCanvasSize(cv, cw, chh, dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = C.bg; ctx.fillRect(0, 0, cw, chh);
  const z = S.view.zoom, ox = S.view.ox, oy = S.view.oy;
  // Tile Mode: холст рисуется 3×3 со смещениями ±W·z/±H·z (бесшовный повтор)
  const tile = !!(S.tile && S.tile.on), tw = W * z, th = H * z, rng = tile ? [-1, 0, 1] : [0];
  const bx0 = ox - (tile ? tw : 0), by0 = oy - (tile ? th : 0), bw = tw * (tile ? 3 : 1), bh = th * (tile ? 3 : 1);
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.4)'; ctx.shadowBlur = 5; ctx.shadowOffsetY = 2; // = --win-shadow: одинаковая тень во всём приложении
  ctx.fillStyle = C.doc; ctx.fillRect(bx0, by0, bw, bh); ctx.restore(); // холст — ровный серый без шахматки (как в Procreate)
  if (buf.width !== W || buf.height !== H) { buf.width = W; buf.height = H; }
  const bx = buf.getContext('2d'); bx.imageSmoothingEnabled = false; bx.clearRect(0, 0, W, H);
  paintStack(bx, true, { bg: true }); // фон + слои + эффекты слоёв/папок + живые превью move/transform/crop
  ctx.save(); ctx.beginPath(); ctx.rect(bx0, by0, bw, bh); ctx.clip(); // итог клипуется блоком тайлов
  for (const j of rng) for (const i of rng) ctx.drawImage(buf, ox + i * tw, oy + j * th, tw, th);
  ctx.restore();
  if (tile) { ctx.save(); ctx.globalAlpha = .6; ctx.strokeStyle = C.accent; ctx.lineWidth = 1; ctx.strokeRect(ox + .5, oy + .5, tw - 1, th - 1); ctx.restore(); } // рамка исходного тайла
  if (z >= 7) drawGrid(1, 1, C.grid, W, H, ox, oy, z); // обычная попиксельная сетка
  if (!S.cropMode && S.grid && (S.grid.preview || S.grid.visible)) drawGrid(S.grid.w || 16, S.grid.h || 16, gridStroke(S.grid.color, S.grid.opacity), W, H, ox, oy, z);
  bus.emit('overlay', { ctx, ox, oy, z }); // системные оверлеи (напр. рамка трансформации)
  drawOverlays(ctx, ox, oy, z);
  drawBrushCursor(ctx, ox, oy, z); // курсор-предпросмотр отпечатка кисти — поверх всего
  updateAnts(ox, oy, z); // «бегущие муравьи» — SVG поверх холста, бег анимирует CSS
}

export function fitView() {
  const cw = cv.clientWidth, chh = cv.clientHeight, pad = 24;
  S.view.zoom = Math.max(1, Math.floor(Math.min((cw - pad * 2) / S.W, (chh - pad * 2) / S.H)));
  S.view.ox = Math.round((cw - S.W * S.view.zoom) / 2);
  S.view.oy = Math.round((chh - S.H * S.view.zoom) / 2);
  render();
}

export function realSizeView() {
  const cw = cv.clientWidth, chh = cv.clientHeight;
  S.view.zoom = 1; S.view.ox = Math.round((cw - S.W) / 2); S.view.oy = Math.round((chh - S.H) / 2);
  render();
}

function zoomTo(nextZoom) { const cw = cv.clientWidth / 2, chh = cv.clientHeight / 2;
  const wx = (cw - S.view.ox) / S.view.zoom, wy = (chh - S.view.oy) / S.view.zoom;
  S.view.zoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, nextZoom));
  S.view.ox = cw - wx * S.view.zoom; S.view.oy = chh - wy * S.view.zoom; render();
}
export function zoomBy(f) { zoomTo(S.view.zoom * f); }
export function zoomStep(dir) {
  const z = Number.isFinite(S.view.zoom) ? S.view.zoom : ZOOM_MIN;
  const q = z / ZOOM_STEP;
  const next = (dir > 0 ? Math.floor(q + 1e-6) + 1 : Math.ceil(q - 1e-6) - 1) * ZOOM_STEP;
  zoomTo(next);
}

// система сама подписывается на сигналы (app.js только импортирует систему)
bus.on('render', render);
bus.on('fit', fitView);
window.addEventListener('resize', fitView);
actions.register('view.fit', fitView);
actions.register('view.realSize', realSizeView);
actions.register('zoom.in', () => zoomStep(1));
actions.register('zoom.out', () => zoomStep(-1));
