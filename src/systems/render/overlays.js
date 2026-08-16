// Оверлеи поверх слоёв: оси симметрии, превью линии/эффектов, плавающее
// выделение, рамка/маска выделения, подсветка перекраски, рамка кропа, контур
// кисти. Всё выражается из общего S.
import { S } from '../../core/state.js';
import { rgb, eqc, hexToRgb } from '../../logic/color.js';
import { bres, rectEdges, rectFill, ellipseEdges, ellipseFill } from '../../logic/raster.js';
import { symmetryConfig, effVis } from '../../core/layers.js';
import { mirrorPoints } from '../../logic/symmetry.js';
import { clamp01 } from '../../logic/math.js';
import { C } from '../../styles/canvas-colors.js';

function diagSegment(W, H, kind, val) {
  const pts = [], x0 = -0.5, x1 = W - 0.5, y0 = -0.5, y1 = H - 0.5, eps = 1e-6;
  const add = (x, y) => { if (x >= x0 - eps && x <= x1 + eps && y >= y0 - eps && y <= y1 + eps) pts.push([x, y]); };
  if (kind === 'd1') {
    add(x0, x0 + val); add(x1, x1 + val); add(y0 - val, y0); add(y1 - val, y1);
  } else {
    add(x0, -x0 + val); add(x1, -x1 + val); add(val - y0, y0); add(val - y1, y1);
  }
  const uniq = [];
  for (const p of pts) if (!uniq.some((q) => Math.abs(q[0] - p[0]) < .01 && Math.abs(q[1] - p[1]) < .01)) uniq.push(p);
  return uniq.slice(0, 2);
}

function drawSymLine(ctx, ox, oy, z, cfg, id) {
  let a, b;
  if (id === 'x') { a = [cfg.axisX, -0.5]; b = [cfg.axisX, S.H - 0.5]; }
  else if (id === 'y') { a = [-0.5, cfg.axisY]; b = [S.W - 0.5, cfg.axisY]; }
  else { const seg = diagSegment(S.W, S.H, id, id === 'd1' ? cfg.diagP : cfg.diagN); if (seg.length < 2) return; [a, b] = seg; }
  const sx = (p) => ox + (p[0] + 0.5) * z, sy = (p) => oy + (p[1] + 0.5) * z;
  ctx.beginPath(); ctx.moveTo(sx(a), sy(a)); ctx.lineTo(sx(b), sy(b)); ctx.stroke();
  if ((S.symLines && S.symLines.hover) === id && S.symLines.mode) {
    const mx = sx([(a[0] + b[0]) / 2, 0]), my = sy([0, (a[1] + b[1]) / 2]);
    ctx.setLineDash([]); ctx.fillStyle = C.fg; ctx.strokeStyle = C.accent; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(mx, my, 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(61,139,253,.85)'; ctx.lineWidth = 1.5; ctx.setLineDash([6, 5]);
  }
}

function drawSymmetryGuides(ctx, ox, oy, z) {
  const cfg = symmetryConfig(), ids = [];
  if (cfg.x) ids.push('x'); if (cfg.y) ids.push('y'); if (cfg.d1) ids.push('d1'); if (cfg.d2) ids.push('d2');
  if (!ids.length) return;
  ctx.save(); ctx.strokeStyle = 'rgba(61,139,253,.85)'; ctx.lineWidth = 1.5; ctx.setLineDash([6, 5]);
  for (const id of ids) drawSymLine(ctx, ox, oy, z, cfg, id);
  ctx.restore();
}

const gridOpacity = (v) => clamp01((+v || 70) / 100);
function gridStroke(hex, opacity) {
  const c = hexToRgb(hex || '#4aa3ff');
  return c.some((v) => !Number.isFinite(v)) ? C.grid : `rgba(${c[0]},${c[1]},${c[2]},${gridOpacity(opacity)})`;
}
function drawCropGrid(ctx, ox, oy, z, W, H) {
  if (!(S.grid && (S.grid.preview || S.grid.visible))) return;
  const gw = Math.max(1, Math.round(S.grid.w) || 16), gh = Math.max(1, Math.round(S.grid.h) || 16);
  ctx.save(); ctx.strokeStyle = gridStroke(S.grid.color, S.grid.opacity); ctx.lineWidth = 1; ctx.beginPath();
  const vx = new Set([W]); for (let x = 0; x <= W; x += gw) vx.add(x);
  const hy = new Set([H]); for (let y = 0; y <= H; y += gh) hy.add(y);
  for (const x of vx) { ctx.moveTo(ox + x * z, oy); ctx.lineTo(ox + x * z, oy + H * z); }
  for (const y of hy) { ctx.moveTo(ox, oy + y * z); ctx.lineTo(ox + W * z, oy + y * z); }
  ctx.stroke(); ctx.restore();
}

export function drawOverlays(ctx, ox, oy, z) {
  const W = S.W, H = S.H;
  drawSymmetryGuides(ctx, ox, oy, z);
  if (S.linePrev || S.qsShape) { ctx.globalAlpha = .6; ctx.fillStyle = rgb(S.active);
    const s = S.brushes.pencil.size, off = s >> 1, sym = symmetryConfig();
    const paint = (px2, py2) => { for (let dy2 = 0; dy2 < s; dy2++) for (let dx2 = 0; dx2 < s; dx2++) {
      const xx = px2 - off + dx2, yy = py2 - off + dy2;
      for (const [mx, my] of mirrorPoints(xx, yy, W, H, false, false, sym)) ctx.fillRect(ox + mx * z, oy + my * z, z, z); } };
    // QuickShape: ровная форма всегда контуром; иначе превью инструмента (rect/ellipse — с учётом заливки)
    const q = S.qsShape, lp = q ? [q.x0, q.y0, q.x1, q.y1] : S.linePrev, type = q ? q.type : S.tool;
    if (type === 'rect') (!q && S.fillShape.rect ? rectFill : rectEdges)(lp[0], lp[1], lp[2], lp[3], paint);
    else if (type === 'ellipse') (!q && S.fillShape.ellipse ? ellipseFill : ellipseEdges)(lp[0], lp[1], lp[2], lp[3], paint);
    else bres(lp[0], lp[1], lp[2], lp[3], paint);
    ctx.globalAlpha = 1; }
  // плавающий фрагмент рисуется в композите слоёв (layerFloatCanvas) — обтравка видит его, швов нет.
  // Ручки активного выделения рисует SVG ants-layer поверх пунктирной рамки.
  if (S.lassoPath && S.lassoPath.pts.length) drawLasso(ctx, ox, oy, z);
  if (S.replaceMode) { const replaceColors = Array.isArray(S.replaceMode.from && S.replaceMode.from[0]) ? S.replaceMode.from : [S.replaceMode.from];
    ctx.fillStyle = 'rgba(61,139,253,.5)';
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      let hit = false; for (let i = 0; i < S.layers.length; i++) { if (!effVis(i)) continue; const c = S.layers[i].grid[y][x]; if (c && replaceColors.some((f) => eqc(c, f))) { hit = true; break; } }
      if (hit) ctx.fillRect(ox + x * z, oy + y * z, z, z); } }
  if (S.cropMode) { const c = S.cropMode, x = ox + c.x0 * z, y = oy + c.y0 * z, w = (c.x1 - c.x0 + 1) * z, h = (c.y1 - c.y0 + 1) * z;
    ctx.fillStyle = 'rgba(0,0,0,.45)';
    ctx.fillRect(ox, oy, W * z, y - oy); ctx.fillRect(ox, y + h, W * z, oy + H * z - y - h);
    ctx.fillRect(ox, y, x - ox, h); ctx.fillRect(x + w, y, ox + W * z - x - w, h);
    drawCropGrid(ctx, ox, oy, z, W, H);
    ctx.strokeStyle = C.fg; ctx.lineWidth = 2; ctx.strokeRect(x + 1, y + 1, w - 2, h - 2); ctx.fillStyle = C.fg;
    const hs = Math.min(18, h - 4), ws = Math.min(18, w - 4), hw = 5, cs = 10;
    ctx.fillRect(x - hw / 2, y + h / 2 - hs / 2, hw, hs); ctx.fillRect(x + w - hw / 2, y + h / 2 - hs / 2, hw, hs);
    ctx.fillRect(x + w / 2 - ws / 2, y - hw / 2, ws, hw); ctx.fillRect(x + w / 2 - ws / 2, y + h - hw / 2, ws, hw);
    for (const p of [[x, y], [x + w, y], [x, y + h], [x + w, y + h]]) ctx.fillRect(p[0] - cs / 2, p[1] - cs / 2, cs, cs); }
  // курсор кисти (предпросмотр отпечатка) рисует Brush Cursor Renderer — systems/render/cursor.js
}

// строящийся контур лассо: пунктир по траектории + зеркальные контуры (симметрия)
// в реальном времени; старт/конец точками с подсветкой замыкания (Continuous/Segment)
function drawLasso(ctx, ox, oy, z) { const lp = S.lassoPath, pts = lp.pts, W = S.W, H = S.H, end = pts[pts.length - 1], sym = symmetryConfig();
  const sx = (p) => ox + (p[0] + 0.5) * z, sy = (p) => oy + (p[1] + 0.5) * z;
  const mirrored = pts.map((p) => mirrorPoints(p[0], p[1], W, H, false, false, sym));
  const paths = Math.max(...mirrored.map((m) => m.length));
  ctx.lineWidth = 1.5; ctx.strokeStyle = C.accent;
  for (let pi = 0; pi < paths; pi++) { const a = mirrored[0][pi], e = mirrored[mirrored.length - 1][pi]; if (!a || !e) continue;
    ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(sx(a), sy(a));
    for (let i = 1; i < pts.length; i++) { const b = mirrored[i][pi]; if (b) ctx.lineTo(sx(b), sy(b)); } ctx.stroke();
    ctx.beginPath(); ctx.moveTo(sx(e), sy(e)); ctx.lineTo(sx(a), sy(a)); // замыкающий сегмент
    ctx.globalAlpha = lp.near ? 0.9 : 0.35; ctx.stroke(); ctx.globalAlpha = 1; ctx.setLineDash([]); }
  const R = lp.near ? 6 : 4, a0 = pts[0]; // точки старта/конца — на оригинале
  ctx.beginPath(); ctx.arc(sx(a0), sy(a0), R, 0, Math.PI * 2);
  ctx.fillStyle = lp.near ? C.accent : C.fg; ctx.fill(); ctx.lineWidth = 1.6; ctx.strokeStyle = lp.near ? C.fg : C.accent; ctx.stroke();
  ctx.beginPath(); ctx.arc(sx(end), sy(end), 3, 0, Math.PI * 2); ctx.fillStyle = C.accent; ctx.fill();
}
