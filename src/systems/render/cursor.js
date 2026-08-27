import { S } from '../../core/state.js';
import { C } from '../../styles/canvas-colors.ts';

export function drawBrushCursor(ctx, ox, oy, z) {
  if (!S.hoverPx || S.cropMode || S.selFloat) return;
  const [x, y] = S.hoverPx, cx = ox + (x + .5) * z, cy = oy + (y + .5) * z;
  if (S.tool === 'pencil' || S.tool === 'eraser') return drawToolBoundary(ctx, cx, cy, z);
  if (!S.eyedrop.active) return;
  const arm = 5, gap = 1.5;
  ctx.save(); ctx.globalCompositeOperation = 'difference'; ctx.strokeStyle = C.fg; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(cx - arm, cy); ctx.lineTo(cx - gap, cy);
  ctx.moveTo(cx + gap, cy); ctx.lineTo(cx + arm, cy); ctx.moveTo(cx, cy - arm);
  ctx.lineTo(cx, cy - gap); ctx.moveTo(cx, cy + gap); ctx.lineTo(cx, cy + arm);
  ctx.stroke(); ctx.restore();
}

function drawToolBoundary(ctx, cx, cy, z) {
  const tool = S.tool, size = tool === 'eraser' ? S.eraserSize : S.pencilSize;
  const shape = S.brushShape[tool], radius = size * z / 2;
  ctx.save(); ctx.globalCompositeOperation = 'difference'; ctx.strokeStyle = C.fg; ctx.lineWidth = 1.2;
  if (shape === 'square') ctx.strokeRect(cx - radius, cy - radius, size * z, size * z);
  else { ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2); ctx.stroke(); }
  ctx.restore();
}
