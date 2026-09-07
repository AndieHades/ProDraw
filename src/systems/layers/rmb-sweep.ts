// ПКМ-удержание с протяжкой по строкам (десктоп) → множественный выбор строк
// панели: слои, папки, эффекты/настройки. Короткое ПКМ без движения остаётся
// контекст-меню (его подавляем только если была протяжка). Строки помечаем сразу
// классом, состояние пишем на отпускании.
import { S } from "../../core/state.ts";
import * as bus from "../../core/bus.ts";
import { squelchContextMenu } from "../../core/input/ContextGesture.ts";

type SweepRow = HTMLElement & { __eff?: unknown };

export function rmbSweep(event: PointerEvent, element: HTMLElement): void {
  try { element.setPointerCapture(event.pointerId); } catch { /* захват необязателен */ }
  let moved = false;
  const layers = new Set<number>(), folders = new Set<number>();
  const effects = new Set<unknown>();
  const add = (row: SweepRow | null): void => {
    if (!row) return;
    const layer = row.dataset["li"], folder = row.dataset["fid"];
    if (layer != null) { layers.add(+layer); row.classList.add("marked"); }
    else if (folder != null) { folders.add(+folder); row.classList.add("marked"); }
    else if (row.__eff) { effects.add(row.__eff); row.classList.add("marked"); }
  }; // эффекты/настройки тоже
  add(element);
  const move = (moveEvent: PointerEvent): void => {
    if (Math.hypot(moveEvent.clientX - event.clientX,
      moveEvent.clientY - event.clientY) > 6) moved = true;
    const under = document.elementFromPoint(moveEvent.clientX, moveEvent.clientY);
    add(under?.closest<SweepRow>("#lay-list .lrow, #lay-list .fxrow") ?? null);
  };
  const up = (): void => {
    for (const type of ["pointermove", "pointerup", "pointercancel",
      "lostpointercapture"] as const) {
      element.removeEventListener(type, type === "pointermove" ? move : up);
    }
    if (!moved) return; // без протяжки — обычное контекст-меню
    squelchContextMenu(); S["bgSel"] = false;
    const ordered = [...layers].sort((left, right) => left - right);
    const top = ordered.at(-1); if (top !== undefined) S.cur = top;
    S.markedFolders = folders; S.fxSel = effects;
    // primary (синяя строка) один: эффект → папка → слой; остальное помечается marked
    if (effects.size) {
      S.fxCur = [...effects][0]; S.selFolder = null; S.marked = new Set(ordered);
    } else if (folders.size) {
      S.selFolder = [...folders][0] ?? null; S.fxCur = null;
      S.marked = new Set(ordered);
    } else {
      S.selFolder = null; S.fxCur = null; S.marked = new Set(ordered.slice(0, -1));
    }
    bus.emit("layers");
  };
  element.addEventListener("pointermove", move);
  for (const type of ["pointerup", "pointercancel", "lostpointercapture"] as const) {
    element.addEventListener(type, up);
  }
}
