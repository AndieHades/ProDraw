import type { CropDragEdges, CropRect } from "./cropRatio.ts";

export interface CropPoint { readonly gx: number; readonly gy: number }

function resizeAxis(
  low: number, high: number, pointer: number,
  lowEdge: boolean, highEdge: boolean, symmetric: boolean
): readonly [number, number] {
  const sum = low + high;
  if (lowEdge) {
    const next = Math.min(symmetric ? Math.floor(sum / 2) : high, Math.round(pointer));
    return [next, symmetric ? sum - next : high];
  }
  if (highEdge) {
    const next = Math.max(symmetric ? Math.ceil(sum / 2) : low, Math.round(pointer) - 1);
    return [symmetric ? sum - next : low, next];
  }
  return [low, high];
}

/** Считает рамку от начала жеста, поэтому Shift и Alt можно менять во время перетаскивания. */
export function resizeCropEdges(
  start: CropDragEdges, point: CropPoint, symmetric: boolean
): CropRect {
  const [x0, x1] = resizeAxis(start.x0, start.x1, point.gx,
    !!start.l, !!start.r, symmetric);
  const [y0, y1] = resizeAxis(start.y0, start.y1, point.gy,
    !!start.t, !!start.b, symmetric);
  return { x0, x1, y0, y1 };
}
