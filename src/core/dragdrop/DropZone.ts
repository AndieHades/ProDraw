// Куда попадает перетаскиваемый элемент относительно цели: до, после или в
// центр. Чистая геометрия прямоугольника — представление здесь не участвует,
// поэтому зона доступна системам напрямую.
import { DROP_CENTER_RATIO } from "../../config/drag-drop.ts";

export interface DropPlacement {
  readonly after: boolean;
  readonly zone: "after" | "before" | "center";
}

export function dropZone(element: Element, x: number, y: number,
  axis: "x" | "y" = "x", centerRatio = DROP_CENTER_RATIO): DropPlacement {
  const rect = element.getBoundingClientRect();
  const size = axis === "y" ? rect.height : rect.width;
  const position = size > 0 ? (axis === "y" ? y - rect.top : x - rect.left) / size : 0.5;
  const padding = Math.max(0, Math.min(0.49, (1 - centerRatio) / 2));
  const after = position >= 0.5;
  return { zone: position > padding && position < 1 - padding ? "center" :
    after ? "after" : "before", after };
}
