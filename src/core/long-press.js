// Долгое нажатие (тач, 480мс) / правый клик (десктоп) по элементу → fn(x, y).
// Единый жест для контекстных меню: слои, эффекты, кисти. Без дублирования.
export function longPress(el, fn) {
  let t = null, x0 = 0, y0 = 0;
  el.addEventListener('contextmenu', (e) => { e.preventDefault(); e.stopPropagation(); fn(e.clientX, e.clientY); });
  el.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'touch') return; x0 = e.clientX; y0 = e.clientY; clearTimeout(t); t = setTimeout(() => fn(x0, y0), 480); });
  el.addEventListener('pointermove', (e) => { if (t && Math.hypot(e.clientX - x0, e.clientY - y0) > 8) { clearTimeout(t); t = null; } });
  const c = () => { clearTimeout(t); t = null; }; el.addEventListener('pointerup', c); el.addEventListener('pointercancel', c);
}

// Меню по двойному тапу/клику или ПКМ → fn(x, y). Удержание (зажатый тап)
// оставлено под перетаскивание (зажатый тап = зажатая кнопка мыши), поэтому
// контекст-меню — отдельным жестом. Одиночный тап (выделение) не задевается.
// Быстрый двойной тап/клик по элементу → fn(x, y). Зона ignoreSel (например имя,
// у которого свой жест переименования) пропускается. Отличается от «второго тапа
// по активному» (rename) тем, что это именно быстрый двойной тап.
// Состояние двойного тапа — модульное, не в замыкании строки: первый тап часто
// перерисовывает список (выделение), строка пересоздаётся, и счётчик в замыкании
// сбросился бы — второй тап не распознавался бы как двойной.
let dtLast = 0, dtX = 0, dtY = 0;
export function onDoubleTap(el, fn, ignoreSel) {
  el.addEventListener('pointerup', (e) => {
    if (e.button && e.button !== 0) return; // ПКМ — отдельно (onContext)
    if (ignoreSel && e.target.closest && e.target.closest(ignoreSel)) return;
    const now = Date.now();
    if (now - dtLast < 320 && Math.hypot(e.clientX - dtX, e.clientY - dtY) < 24) { dtLast = 0; fn(e.clientX, e.clientY); }
    else { dtLast = now; dtX = e.clientX; dtY = e.clientY; }
  });
}

// Правый клик (десктоп) → fn(x, y). После ПКМ-свайпа (множественный выбор) меню
// подавляется на короткое время — иначе оно выскочит по завершении протяжки.
let ctxSquelchUntil = 0;
export const squelchContextMenu = (ms = 400) => { ctxSquelchUntil = Date.now() + ms; };
export function onContext(el, fn) {
  el.addEventListener('contextmenu', (e) => { e.preventDefault(); e.stopPropagation(); if (Date.now() < ctxSquelchUntil) return; fn(e.clientX, e.clientY); });
}

// Контекст-меню: ПКМ или быстрый двойной тап (для строк без отдельного «edit» —
// слои/папки). ignoreSel исключает зону имени (там переименование).
export function menuGesture(el, fn, ignoreSel) { onContext(el, fn); onDoubleTap(el, fn, ignoreSel); }
