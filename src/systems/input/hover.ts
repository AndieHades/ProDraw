// Курсор и подсветка клетки под указателем. Стиль пишется только при смене
// значения: раньше его трогали на каждом событии движения.
import { S } from "../../core/state.ts";
import { globalHandlers, toolHandler } from "../../core/canvas-handlers.ts";
import { gridAt } from "../../core/viewport.ts";
import { isInsideTileWorkArea } from "../../logic/TileGeometry.ts";

interface HoverEvent { readonly clientX: number; readonly clientY: number }

let applied: string | null = null;

export function forgetCursor(): void { applied = null; }

function applyCursor(canvas: HTMLElement, value: string): void {
  if (value === applied) return;
  applied = value; canvas.style.cursor = value;
}

const cursorOf = (value: unknown): string | null =>
  typeof value === "string" && value ? value : null;

// `interactive` — указатель свободен: не ведёт штрих, не панорамирует холст и
// не работает в режиме кропа или трансформации.
export function updateHover(canvas: HTMLElement, event: HoverEvent,
  interactive: boolean): void {
  const [hx, hy] = gridAt(event.clientX, event.clientY);
  // в Tile Mode курсор виден над всем блоком 3×3
  const tile = S["tile"] as { on?: boolean } | undefined;
  const over = isInsideTileWorkArea(hx, hy, S.W, S.H, !!tile?.on);
  S["hoverPx"] = over ? [hx, hy] : null;
  const eyedropper = (S["eyedrop"] as { active?: boolean } | undefined)?.active;
  let cursor = over && eyedropper ? "none" : over ? "crosshair" : "default";
  let handled: string | null = null; // hover глобальных обработчиков имеет побочные эффекты
  for (const handler of globalHandlers()) {
    const value = cursorOf(handler.hover?.({ gx: hx, gy: hy, e: event }));
    if (value && !handled) handled = value;
  }
  if (!eyedropper && interactive) {
    if (handled) cursor = handled;
    else {
      const tool = toolHandler(String(S["tool"] ?? ""));
      const value = cursorOf(tool?.hover?.({ gx: hx, gy: hy, e: event }));
      if (value) cursor = value;
    }
  }
  applyCursor(canvas, cursor);
}
