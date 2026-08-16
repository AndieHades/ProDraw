// Brush Cursor Renderer: курсор = предпросмотр следующего отпечатка кисти.
// Берёт форму/размер активной кисти, текущий цвет и непрозрачность из S и
// рисует реальную форму под указателем. Силуэт кеша пересчитывается только при
// смене кисти/размера; цвет/opacity/позиция — дёшево при отрисовке.
import { S } from '../../core/state.js';
import * as bus from '../../core/bus.js';
import * as actions from '../../core/actions.js';
import { rgb } from '../../logic/color.js';
import { BP_SMAX } from '../../config/limits.js';
import { CURSOR_MODES, CURSOR_TOOLS } from '../../config/cursor.js';
import { footprintMask, footprintRotation } from '../../logic/brush-cursor.js';
import { makeCanvas, paintCanvas, fillMask } from '../../core/canvas.js';
import { C } from '../../styles/canvas-colors.js';

const RING = () => C.fg; // курсор без чёрной обводки — только светлый контур-прицел (токен темы)
const SHADING_FILL = 'rgba(190,190,190,.72)', SHADING_OP = 0.45;
const shadingOn = () => S.shading && S.shading.on && S.shading.colors && S.shading.colors.length > 1;

// под какой инструмент берём кисть/цвет/opacity (что реально положит штамп)
function inputs() {
  const t = S.tool; if (!CURSOR_TOOLS.includes(t)) return null;
  if (t === 'eraser') return { sb: S.stampBrush.eraser, size: S.brushes.eraser.size, fill: '#fff', op: S.brushes.eraser.op };
  if (t === 'adjust') return { sb: S.stampBrush.pencil, size: S.brushes.pencil.size, fill: '#fff', op: 0.35 };
  if (t === 'pencil' && shadingOn()) return { sb: S.stampBrush.pencil, size: S.brushes.pencil.size, fill: SHADING_FILL, op: SHADING_OP };
  return { sb: S.stampBrush.pencil, size: S.brushes.pencil.size, fill: rgb(S.active), op: S.brushes.pencil.op };
}

// кеш формы: маска отпечатка + (лениво) силуэт m.w×m.h (1 клетка = 1 px) +
// перекрашенные копии по цвету. Инвалидация только при смене кисти/размера.
let cKey = '', cMask = null, cShape = null; const tints = new Map();
function grainPhase(sb) { const p = S.hoverPx, g = sb && sb.grain;
  return g && p ? '|' + (((p[0] % g.w) + g.w) % g.w) + ',' + (((p[1] % g.h) + g.h) % g.h) : ''; }
function ensureMask(sb, size) {
  const p = S.hoverPx || [0, 0], key = (sb ? sb.tok : 'sq') + '|' + size + grainPhase(sb);
  if (key !== cKey) { cKey = key; cMask = footprintMask(sb, size, BP_SMAX, p[0], p[1]); cShape = null; tints.clear(); }
  return cMask;
}
function silhouette() {
  if (cShape || !cMask) return cShape; const m = cMask;
  cShape = paintCanvas(m.w, m.h, (d) => fillMask(d, m.data, m.w, m.h, [255, 255, 255, 255]));
  return cShape;
}

// перекраска силуэта в цвет fill — кеш по цвету, переиспользуем готовый bitmap
function tinted(shape, fill) {
  let cv = tints.get(fill); if (cv) return cv;
  cv = makeCanvas(shape.width, shape.height);
  const cx = cv.getContext('2d'); cx.drawImage(shape, 0, 0); cx.globalCompositeOperation = 'source-in';
  cx.fillStyle = fill; cx.fillRect(0, 0, cv.width, cv.height); tints.set(fill, cv); return cv;
}

function blit(ctx, cv, x, y, w, h, rot, flip) {
  if (!rot && !flip) { ctx.drawImage(cv, x, y, w, h); return; }
  ctx.save(); ctx.translate(x + w / 2, y + h / 2); if (rot) ctx.rotate(rot); if (flip) ctx.scale(-1, 1);
  ctx.drawImage(cv, -w / 2, -h / 2, w, h); ctx.restore();
}

// форма отпечатка реальным цветом/непрозрачностью кисти — без обводки
function drawShape(ctx, m, left, top, z, fill, op, rot) {
  const shape = silhouette(); if (!shape || !fill) return;
  ctx.imageSmoothingEnabled = false; ctx.globalAlpha = op;
  blit(ctx, tinted(shape, fill), left, top, m.w * z, m.h * z, rot, S.xMirror); ctx.globalAlpha = 1; // зажатый X — превью отзеркалено по горизонтали
}

function drawRing(ctx, cx, cy, r) {
  ctx.strokeStyle = RING(); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
}

// маленький прицел по центру отпечатка — точка наводки, не закрывает пиксель
function drawReticle(ctx, cx, cy) {
  const a = 5, g = 1.5; ctx.lineCap = 'round'; ctx.strokeStyle = RING(); ctx.lineWidth = 1.2; ctx.beginPath();
  ctx.moveTo(cx - a, cy); ctx.lineTo(cx - g, cy); ctx.moveTo(cx + g, cy); ctx.lineTo(cx + a, cy);
  ctx.moveTo(cx, cy - a); ctx.lineTo(cx, cy - g); ctx.moveTo(cx, cy + g); ctx.lineTo(cx, cy + a); ctx.stroke();
}

export function drawBrushCursor(ctx, ox, oy, z) {
  if (!S.hoverPx || S.cropMode || S.selFloat || !S.layers[S.cur]) return; // нет активного слоя (остался только фон) — курсора кисти нет
  const cx = ox + (S.hoverPx[0] + 0.5) * z, cy = oy + (S.hoverPx[1] + 0.5) * z;
  if (S.eyedrop.active) { ctx.save(); drawReticle(ctx, cx, cy); ctx.restore(); return; }
  const inp = inputs(); if (!inp) return;
  const m = ensureMask(inp.sb, inp.size); if (!m) return;
  const left = ox + (S.hoverPx[0] - (m.w >> 1)) * z, top = oy + (S.hoverPx[1] - (m.h >> 1)) * z;
  const r = Math.max(m.w, m.h) * z / 2;
  ctx.save();
  if (S.cursorMode === 'circle') drawRing(ctx, cx, cy, r);
  else drawShape(ctx, m, left, top, z, inp.fill, inp.op, footprintRotation(inp.sb));
  drawReticle(ctx, cx, cy); // прицел поверх — точная наводка
  ctx.restore();
}

actions.register('cursor.cycleMode', () => {
  S.cursorMode = CURSOR_MODES[(CURSOR_MODES.indexOf(S.cursorMode) + 1) % CURSOR_MODES.length];
  bus.emit('cursor'); bus.emit('render');
});
