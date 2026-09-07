// Кнопка стилуса (barrel / «ластик») переключает кисть ↔ ластик и обратно.
// Примечание: двойной тап Apple Pencil iOS-браузеры веб-приложению не отдают —
// жест работает для перьев с физической кнопкой и пера-«ластика». Ловим в
// capture-фазе, чтобы нажатие кнопки не рисовало и не открывало контекстное меню.
import { S } from "../core/state.ts";
import { setTool } from "../core/tools.ts";

function onDown(e: PointerEvent): void {
  // 0 — контакт пера (рисуем), не трогаем
  if (e.pointerType !== "pen" ||
    (e.button !== 1 && e.button !== 2 && e.button !== 5)) return;
  e.preventDefault(); e.stopImmediatePropagation();
  setTool(S["tool"] === "eraser" ? "pencil" : "eraser");
}

export function mount(): void {
  window.addEventListener("pointerdown", onDown, true);
}
