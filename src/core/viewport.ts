// Экранные координаты → клетка сетки документа. Общий расчёт для системы ввода
// и пипетки, чтобы не дублировать привязку к S.view и прямоугольнику холста.
import { S } from "./state.ts";
import { clientToCanvas } from "../logic/view/LegacyViewGeometry.ts";

type ViewTransform = Parameters<typeof clientToCanvas>[3];
const EMPTY: DOMRect = { left: 0, top: 0, right: 0, bottom: 0, width: 0,
  height: 0, x: 0, y: 0, toJSON: () => ({}) };

// Во время жеста холст не двигается, поэтому его прямоугольник измеряется один
// раз: раньше каждое событие указателя форсировало layout. Вне жеста кеш не
// держится, чтобы перемещение панелей не смещало курсор.
let held: DOMRect | null = null, holding = false;

export function canvasBounds(): DOMRect {
  if (holding && held) return held;
  const rect = document.getElementById("cv")?.getBoundingClientRect() ?? EMPTY;
  if (holding) held = rect;
  return rect;
}

export function holdCanvasBounds(): void { holding = true; held = null; }
export function releaseCanvasBounds(): void { holding = false; held = null; }

export function canvasAt(clientX: number, clientY: number): [number, number] {
  const point = clientToCanvas(clientX, clientY, canvasBounds(),
    S["view"] as ViewTransform);
  return [point.x, point.y];
}
export function gridAt(clientX: number, clientY: number): [number, number] {
  const [x, y] = canvasAt(clientX, clientY);
  return [Math.floor(x), Math.floor(y)];
}
