// Пресет-кисть по геометрическому пути (линия, контур прямоугольника или
// эллипса). Генераторы фигур отдают точки попиксельно и не всегда подряд,
// поэтому ход не строится StrokePipeline: даб ставится, когда точка отошла от
// предыдущего на интервал пресета. Разрыв пути просто даёт новый даб.
import type { LoadedBrush } from "../../contracts/brush.ts";
import type { BrushRenderSettings } from "../../contracts/stroke.ts";
import { presetEngine } from "./preset-brush.ts";

type Paint = (x: number, y: number, opacity: number) => void;

export interface PresetPathStamper {
  at(x: number, y: number): void;
}

export function createPresetPathStamper(brush: LoadedBrush,
  settings: BrushRenderSettings, paint: Paint): PresetPathStamper | null {
  const engine = presetEngine(); if (!engine) return null;
  const spacing = engine.rasterDabSpacing(settings.size, brush.strokePath.spacing);
  const minimum = spacing * spacing;
  let lastX = Number.NaN, lastY = Number.NaN, index = 0;
  return {
    at(x, y) {
      const cx = x + .5, cy = y + .5;
      if (index) {
        const dx = cx - lastX, dy = cy - lastY;
        if (dx * dx + dy * dy < minimum) return;
      }
      lastX = cx; lastY = cy;
      engine.visitBrushDab(brush, { x: cx, y: cy, pressure: 1, tiltX: 0, tiltY: 0,
        time: index++, pointerType: "mouse" }, settings, paint);
    }
  };
}
