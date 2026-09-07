// Событие указателя → сэмпл штриха. Чистая функция без DOM: вход описан
// структурно, поэтому её можно прогнать записанным трассом планшета.
import type { StrokeSample } from "../../contracts/stroke.ts";

export type PointerSampleKind = "pen" | "mouse" | "touch";

export interface PointerSampleSource {
  readonly pressure?: number | undefined;
  readonly tiltX?: number | undefined;
  readonly tiltY?: number | undefined;
  readonly pointerType?: string | undefined;
  readonly timeStamp?: number | undefined;
}

export interface PointerPressureFallback {
  readonly mousePressure: number;
  readonly touchPressure: number;
  readonly minimumPenPressure: number;
}

const clamp = (value: number, low: number, high: number): number =>
  value < low ? low : value > high ? high : value;
const finite = (value: number | undefined): number =>
  typeof value === "number" && Number.isFinite(value) ? value : 0;

export const pointerSampleKind = (pointerType?: string): PointerSampleKind =>
  pointerType === "pen" ? "pen" : pointerType === "touch" ? "touch" : "mouse";

function samplePressure(kind: PointerSampleKind, reported: number,
  fallback: PointerPressureFallback): number {
  // Перо в контакте всегда даёт нажим выше порога срабатывания. Ровный ноль —
  // это не нулевое усилие, а отсутствие данных: драйверы планшетов на macOS
  // часто не отдают нажим в браузер. Раньше такой ноль поднимался до нижней
  // границы, и кисть с реакцией на нажим рисовала штрих в сотую размера —
  // визуально перо не рисовало вовсе. Без данных ведём себя как мышь.
  if (kind === "pen") {
    return reported > 0 ? clamp(reported, fallback.minimumPenPressure, 1)
      : fallback.mousePressure;
  }
  if (kind === "touch") {
    return reported > 0 ? clamp(reported, 0, 1) : fallback.touchPressure;
  }
  return fallback.mousePressure;
}

export function strokeSampleFromPointer(x: number, y: number,
  source: PointerSampleSource, fallback: PointerPressureFallback): StrokeSample {
  const kind = pointerSampleKind(source.pointerType);
  return { x, y, pressure: samplePressure(kind, finite(source.pressure), fallback),
    tiltX: finite(source.tiltX), tiltY: finite(source.tiltY),
    time: finite(source.timeStamp), pointerType: kind };
}
