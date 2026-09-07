// Линии сетки поверх холста: попиксельная при большом зуме и пользовательская.
import { hexToRgb } from "../../logic/color.ts";
import { clamp01 } from "../../logic/math.ts";
import { C } from "../../styles/canvas-colors.ts";

const gridOpacity = (value: unknown): number => clamp01((Number(value) || 70) / 100);

export function gridStroke(hex: string | undefined, opacity: unknown): string {
  const color = hexToRgb(hex || "#4aa3ff");
  return color.some((value) => !Number.isFinite(value)) ? C.grid
    : `rgba(${color[0]},${color[1]},${color[2]},${gridOpacity(opacity)})`;
}

export function drawGrid(context: CanvasRenderingContext2D, stepX: number,
  stepY: number, stroke: string, width: number, height: number,
  ox: number, oy: number, zoom: number): void {
  const stepWidth = Math.max(1, Math.round(stepX) || 1);
  const stepHeight = Math.max(1, Math.round(stepY) || 1);
  context.strokeStyle = stroke; context.lineWidth = 1; context.beginPath();
  const columns = new Set([width]);
  for (let x = 0; x <= width; x += stepWidth) columns.add(x);
  const rows = new Set([height]);
  for (let y = 0; y <= height; y += stepHeight) rows.add(y);
  for (const x of columns) {
    context.moveTo(ox + x * zoom, oy); context.lineTo(ox + x * zoom, oy + height * zoom);
  }
  for (const y of rows) {
    context.moveTo(ox, oy + y * zoom); context.lineTo(ox + width * zoom, oy + y * zoom);
  }
  context.stroke();
}
