import { clamp } from '../logic/math.js';
const allWins = new Set(); // все плавающие окна — чтобы новое вставало в свободное место
// Плавающее окно: перетаскивание за грип + ресайз за уголок/края + сохранение
// геометрии. Один помощник на палитру, боковую панель, окна слоёв/превью/референса.
const NORMAL_Z_BASE = 30, NORMAL_Z_MAX = 860, TOOLBAR_Z = 900;
let zTop = NORMAL_Z_BASE; // общий счётчик: окно, за которое взялись, поднимается над остальными
const TOPBAR = 58;         // не залезаем под верхнюю панель
const closePopovers = () => document.dispatchEvent(new window.CustomEvent('ui-close-popovers'));
const hostFor = (el) => el.closest('.ovl') || el;
const shown = (e) => { for (let n = e; n && n.nodeType === 1; n = n.parentElement) { const s = window.getComputedStyle(n);
  if (s.display === 'none' || s.visibility === 'hidden') return false; } return true; };
const hit = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
const interactive = 'button,input,select,textarea,label,a,[contenteditable="true"]';
const vw = () => window.innerWidth || document.documentElement.clientWidth || 1024;
const vh = () => window.innerHeight || document.documentElement.clientHeight || 768;
const zOf = (el) => { const host = hostFor(el), n = parseFloat(window.getComputedStyle(host).zIndex || host.style.zIndex);
  return Number.isFinite(n) ? n : 0; };
function rebalanceNormalZ() {
  const wins = [...allWins].filter((el) => !el.__fwAlwaysOnTop && shown(el)).sort((a, b) => zOf(a) - zOf(b));
  zTop = NORMAL_Z_BASE;
  for (const el of wins) { const host = hostFor(el); host.style.zIndex = ++zTop; if (host !== el) el.style.zIndex = ''; }
}
export const nextFloatingZ = () => { if (zTop >= NORMAL_Z_MAX) rebalanceNormalZ(); return ++zTop; };
const bringToFront = (el, alwaysOnTop = false) => {
  const host = hostFor(el);
  host.style.zIndex = alwaysOnTop ? TOOLBAR_Z : nextFloatingZ();
  if (host !== el) el.style.zIndex = '';
};
// первое свободное место для окна el среди других видимых окон (или null — места нет)
function freeSpot(el) { const r = el.getBoundingClientRect(), w = r.width, h = r.height, m = 8, step = 24;
  const occ = [...allWins].filter((x) => x !== el && shown(x)).map((x) => x.getBoundingClientRect());
  for (let t = TOPBAR; t + h <= vh() - m; t += step) for (let l = m; l + w <= vw() - m; l += step)
    if (!occ.some((o) => hit({ left: l, top: t, right: l + w, bottom: t + h }, o))) return { l, t };
  return null; }

export function floatingWindow(el, opts = {}) {
  if (el.__fw) return; el.__fw = true; // идемпотентно: окно делается перетаскиваемым один раз
  const { grip = el, handle, storeKey, minW = 120, minH = 80, clampRight = 70, clampBottom = 50, avoidOverlap = true, alwaysOnTop = false, resizeEdges = false, onResize, onClose, onHeaderDblClick } = opts;
  el.__fwAlwaysOnTop = alwaysOnTop;
  let placed = false; // есть ли осмысленная позиция (восстановлена / выбрана пользователем / переставлена)
  const place = (l, t) => {
    el.style.left = Math.max(4, Math.min(l, vw() - clampRight)) + 'px';
    el.style.top = Math.max(4, Math.min(t, vh() - clampBottom)) + 'px';
    el.style.right = 'auto'; el.style.bottom = 'auto'; el.style.transform = 'none';
  };
  const save = () => { if (!storeKey) return; const r = el.getBoundingClientRect();
    try { localStorage.setItem(storeKey, JSON.stringify({ l: r.left, t: r.top, w: r.width, h: r.height })); } catch (e) {} };
  const clampSize = (w, h) => ({ w: clamp(w, minW, Math.max(minW, vw() - 12)), h: clamp(h, minH, Math.max(minH, vh() - 12)) });
  const applySize = (w, h) => { const s = clampSize(w, h);
    if (onResize) onResize(s.w, s.h); else { el.style.width = s.w + 'px'; el.style.height = s.h + 'px'; }
    return s; };

  if (storeKey) try { const s = JSON.parse(localStorage.getItem(storeKey));
    // размер восстанавливаем только у растягиваемых окон; иначе фикс. высота режет
    // контент с переменным числом строк (окна эффектов) — «пол-окна нет»
    if (s && s.l != null) { place(s.l, s.t); placed = true; if (s.w && (handle || onResize)) applySize(s.w, s.h); } } catch (e) {}

  // крестик закрытия в шапке (общий для всех окон): прячет окно / зовёт onClose
  const xb = el.querySelector('.win-x');
  if (xb) xb.addEventListener('click', (e) => { e.stopPropagation(); if (onClose) onClose(); else el.classList.remove('on'); });
  if (onHeaderDblClick) grip.addEventListener('dblclick', (e) => {
    if (e.target.closest(interactive)) return;
    e.preventDefault(); e.stopPropagation(); closePopovers(); bringToFront(el, alwaysOnTop);
    onHeaderDblClick(e); placed = true; save();
  });

  el.addEventListener('pointerdown', () => bringToFront(el, alwaysOnTop), true); // любой тык по окну — наверх стопки

  // Перетаскивание за ЛЮБОЕ свободное место окна, не только за грип: на тач, если
  // верх окна скрыт за панелью, его всё равно можно ухватить за пустую область.
  // Исключаем интерактив, canvas, диск пикера и прокручиваемые зоны.
  const NODRAG = interactive + ',canvas,.fw-nodrag,.fw-rsz-edge,#col-disc';
  const scrolls = (n) => /(auto|scroll)/.test(window.getComputedStyle(n).overflowY + window.getComputedStyle(n).overflowX);
  const rootScrolls = scrolls(el);
  if (!rootScrolls) el.classList.add('fw-win'); // touch-action: none → тащится с тача из любой точки
  const canDragFrom = (t) => {
    if (t.closest(NODRAG)) return false;
    if (grip !== el && grip.contains(t)) return true;  // шапка тащит всегда
    if (rootScrolls) return false;                     // тело прокручиваемого окна не тащим — для него есть грип
    // Прокручиваемая зона (список слоёв, палитра) сама обрабатывает drag своего
    // содержимого (перестановка строк/цветов). Окно за неё не тащим — иначе drag
    // окна перехватывает pointer capture и строка «повисает». Проверяем сам факт
    // overflow:auto/scroll, а не текущее переполнение: при коротком списке зона
    // ещё не переполнена, но это всё равно её территория.
    for (let n = t; n && n !== el; n = n.parentElement) if (scrolls(n)) return false;
    return true;
  };
  let d = null;
  el.addEventListener('pointerdown', (e) => {
    if (e.button > 0 || d || !canDragFrom(e.target)) return;
    closePopovers();
    try { el.setPointerCapture(e.pointerId); } catch (err) {}
    bringToFront(el, alwaysOnTop); const r = el.getBoundingClientRect(); d = { id: e.pointerId, dx: e.clientX - r.left, dy: e.clientY - r.top }; });
  el.addEventListener('pointermove', (e) => { if (d && e.pointerId === d.id) { e.preventDefault(); place(e.clientX - d.dx, e.clientY - d.dy); } });
  const dEnd = (e) => { if (d && (!e || e.pointerId === d.id)) { d = null; placed = true; save(); } };
  el.addEventListener('pointerup', dEnd); el.addEventListener('pointercancel', dEnd);

  let rz = null;
  const pos = (l, t) => { el.style.left = l + 'px'; el.style.top = t + 'px'; el.style.right = 'auto'; el.style.bottom = 'auto'; el.style.transform = 'none'; };
  const resizeMove = (e) => {
    if (!rz) return;
    const dx = e.clientX - rz.x, dy = e.clientY - rz.y, dir = rz.dir;
    let w = rz.w + (dir.includes('e') ? dx : dir.includes('w') ? -dx : 0);
    let h = rz.h + (dir.includes('s') ? dy : dir.includes('n') ? -dy : 0);
    w = clamp(w, minW, Math.max(minW, vw() - 12)); h = clamp(h, minH, Math.max(minH, vh() - 12));
    let l = dir.includes('w') ? rz.right - w : rz.left, t = dir.includes('n') ? rz.bottom - h : rz.top;
    if (l < 4) { w = rz.right - 4; l = 4; }
    if (t < 4) { h = rz.bottom - 4; t = 4; }
    if (l + w > vw() - 4) w = vw() - 4 - l;
    if (t + h > vh() - 4) h = vh() - 4 - t;
    const s = applySize(w, h); if (dir.includes('w')) l = rz.right - s.w; if (dir.includes('n')) t = rz.bottom - s.h;
    if (dir.includes('w') || dir.includes('n')) pos(Math.max(4, l), Math.max(4, t));
  };
  const resizeEnd = () => { if (rz) { rz = null; placed = true; save(); } };
  const attachResize = (node, dir) => {
    node.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); try { node.setPointerCapture(e.pointerId); } catch (err) {}
      closePopovers();
      bringToFront(el, alwaysOnTop);
      const r = el.getBoundingClientRect(); rz = { dir, left: r.left, top: r.top, right: r.right, bottom: r.bottom, w: r.width, h: r.height, x: e.clientX, y: e.clientY }; });
    node.addEventListener('pointermove', resizeMove); node.addEventListener('pointerup', resizeEnd); node.addEventListener('pointercancel', resizeEnd);
  };
  if (handle) attachResize(handle, 'se');
  if (resizeEdges) {
    for (const dir of ['n', 'e', 's', 'w', 'nw', 'ne', 'sw']) {
      const h = document.createElement('div'); h.className = 'fw-rsz-edge fw-rsz-' + dir; h.setAttribute('aria-hidden', 'true');
      el.appendChild(h); attachResize(h, dir);
    }
  }

  // при открытии: поднять окно над остальными; если перекрывает другое окно и
  // позиция ещё не выбрана — переставить в свободное место (или наверх, если места нет)
  allWins.add(el);
  const onShow = () => { bringToFront(el, alwaysOnTop);
    if (placed || !avoidOverlap) return;
    const r = el.getBoundingClientRect();
    const occ = [...allWins].filter((x) => x !== el && shown(x)).map((x) => x.getBoundingClientRect());
    if (occ.some((o) => hit(r, o))) { const s = freeSpot(el);
      place(s ? s.l : Math.max(4, (vw() - r.width) / 2), s ? s.t : TOPBAR); placed = true; save(); } };
  let wasShown = shown(el);
  const mo = new window.MutationObserver(() => { const v = shown(el); if (v && !wasShown) onShow(); wasShown = v; });
  mo.observe(el, { attributes: true, attributeFilter: ['class', 'style'] });
  const host = hostFor(el);
  if (host !== el) mo.observe(host, { attributes: true, attributeFilter: ['class', 'style'] });
}
