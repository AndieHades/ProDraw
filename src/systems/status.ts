// Индикатор размера документа и активной рамки (кроп, выделение, трансформ).
import { S } from "../core/state.ts";
import * as bus from "../core/bus.ts";
import { $ } from "../core/shell.ts";

interface Rect { x0: number; y0: number; x1: number; y1: number }
interface RotMode { b: { w: number; h: number }; sx: number; sy: number }

const selSize = (s: Rect | null): [number, number] | null =>
  s ? [s.x1 - s.x0 + 1, s.y1 - s.y0 + 1] : null;

function activeSize(): [number, number] | null {
  const c = S["cropMode"] as Rect | null;
  if (c) return [c.x1 - c.x0 + 1, c.y1 - c.y0 + 1];
  const m = S["rotMode"] as RotMode | null;
  if (m) return [Math.max(1, Math.round(m.b.w * Math.abs(m.sx))),
    Math.max(1, Math.round(m.b.h * Math.abs(m.sy)))];
  return selSize(S["sel"] as Rect | null);
}

function sync(): void {
  const el = $("status"); if (!el) return;
  const a = activeSize();
  el.textContent = S.W + "×" + S.H + (a ? " → " + a[0] + "×" + a[1] : "") + " px";
  const zoom = $("zoom-status");
  const view = S["view"] as { zoom: number };
  if (zoom) zoom.textContent = Math.round(view.zoom * 100) + "%";
}

export function mount(): void {
  bus.on("layers", sync); bus.on("fit", sync); bus.on("selection", sync);
  bus.on("render", sync); bus.on("overlay", sync); sync();
}
