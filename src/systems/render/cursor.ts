import { S } from "../../core/state.ts";
import { C } from "../../styles/canvas-colors.ts";

export function drawBrushCursor(ctx: CanvasRenderingContext2D, ox: number,
  oy: number, z: number): void {
  const hover = S["hoverPx"] as [number, number] | null;
  if (!hover || S["cropMode"] || S["rotMode"] || S["selFloat"]) return;
  const [x, y] = hover, cx = ox + (x + .5) * z, cy = oy + (y + .5) * z;
  const tool = S["tool"] as string;
  if (tool === "pencil" || tool === "eraser") return drawToolBoundary(ctx, cx, cy, z);
  if (!(S["eyedrop"] as { active?: boolean })?.active) return;
  const arm = 5, gap = 1.5;
  ctx.save(); ctx.globalCompositeOperation = "difference";
  ctx.strokeStyle = C.fg; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(cx - arm, cy); ctx.lineTo(cx - gap, cy);
  ctx.moveTo(cx + gap, cy); ctx.lineTo(cx + arm, cy); ctx.moveTo(cx, cy - arm);
  ctx.lineTo(cx, cy - gap); ctx.moveTo(cx, cy + gap); ctx.lineTo(cx, cy + arm);
  ctx.stroke(); ctx.restore();
}

function drawToolBoundary(ctx: CanvasRenderingContext2D, cx: number, cy: number,
  z: number): void {
  const tool = S["tool"] as "pencil" | "eraser";
  const size = (tool === "eraser" ? S["eraserSize"] : S["pencilSize"]) as number;
  const shape = (S["brushShape"] as Record<string, string>)[tool];
  const radius = size * z / 2;
  ctx.save(); ctx.globalCompositeOperation = "difference";
  ctx.strokeStyle = C.fg; ctx.lineWidth = 1.2;
  if (shape === "square") ctx.strokeRect(cx - radius, cy - radius, size * z, size * z);
  else { ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2); ctx.stroke(); }
  ctx.restore();
}
