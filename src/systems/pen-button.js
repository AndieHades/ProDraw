// Кнопка стилуса (barrel / «ластик») переключает кисть ↔ ластик и обратно.
// Примечание: двойной тап Apple Pencil iOS-браузеры веб-приложению не отдают —
// жест работает для перьев с физической кнопкой и пера-«ластика». Ловим в
// capture-фазе, чтобы нажатие кнопки не рисовало и не открывало контекстное меню.
import { S } from '../core/state.js';
import { setTool } from '../core/tools.js';

function onDown(e) {
  if (e.pointerType !== 'pen' || (e.button !== 1 && e.button !== 2 && e.button !== 5)) return; // 0 — контакт пера (рисуем), не трогаем
  e.preventDefault(); e.stopImmediatePropagation();
  setTool(S.tool === 'eraser' ? 'pencil' : 'eraser');
}

export function mount() { window.addEventListener('pointerdown', onDown, true); }
