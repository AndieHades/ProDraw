// DOM-помощники: единая точка доступа к элементам, тосты, копирование в буфер.
// Это сервис фундамента — им пользуются системы визуала, но не logic.
import { TOAST_MS } from '../config/timings.js';
import { nextFloatingZ } from './floating-window.js';
import { clamp } from '../logic/math.js';
export { t } from '../i18n/index.js'; // реэкспорт для удобства (toast(t('ключ')))

export const $ = (id) => document.getElementById(id);

let toastT = null;
export function toast(m) { const t = $('toast'); if (!t) return; t.textContent = m; t.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), TOAST_MS); }

export async function copyText(t) {
  try { await navigator.clipboard.writeText(t); return true; }
  catch (e) {
    const a = document.createElement('textarea'); a.value = t; a.style.position = 'fixed'; a.style.opacity = '0';
    document.body.appendChild(a); a.select(); let ok = false;
    try { ok = document.execCommand('copy'); } catch (e2) {}
    a.remove(); return ok;
  }
}

const MENU_IDS = ['ctx', 'lctx', 'cctx', 'sctx', 'trctx', 'fxctx', 'impmenu', 'setmenu', 'tctx', 'rowctx', 'brush-plus', 'brush-menu', 'font-menu', 'brush-choice', 'shape-choice', 'sym-choice', 'flip-choice', 'center-choice', 'zoom-choice', 'adjust-choice', 'adjpop', 'pal-new-choice', 'tile-menu', 'tile-cctx', 'ref-ctx', 'anim-menu'];
const menus = () => MENU_IDS.map($).filter(Boolean);
export function closeMenus(except = null) { for (const m of menus()) if (m !== except) m.classList.remove('on'); }
const inOpenMenu = (target) => menus().some((m) => m.classList.contains('on') && m.contains(target));
function raiseMenu(m) {
  const cssZ = +(window.getComputedStyle(m).zIndex || 0);
  m.style.zIndex = Math.max(cssZ || 0, nextFloatingZ()) + '';
}
let menuCloseBound = false;
function bindMenuClose() { if (menuCloseBound) return; menuCloseBound = true;
  const closeIfOutside = (e) => { if (!inOpenMenu(e.target)) closeMenus(); };
  const closeContextIfOutside = (e) => { if (!e.defaultPrevented) closeIfOutside(e); };
  document.addEventListener('pointerdown', closeIfOutside, true);
  document.addEventListener('contextmenu', closeContextIfOutside);
  document.addEventListener('ui-close-popovers', () => closeMenus(), true);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenus(); }, true);
}
function showMenu(m) { bindMenuClose(); closeMenus(m); raiseMenu(m); m.style.visibility = 'hidden'; m.classList.add('on'); }

// Всплывающее меню-бабл m у якоря (ax, ay): центрируем по горизонтали на якоре,
// рисуем треугольник, указывающий на точку вызова. Единый вид для всех меню.
export function showMenuAt(m, ax, ay, above = false) {
  showMenu(m);
  let arrow = m.querySelector(':scope > .menu-arrow');
  if (!arrow) { arrow = document.createElement('div'); arrow.className = 'menu-arrow'; m.appendChild(arrow); }
  requestAnimationFrame(() => { const r = m.getBoundingClientRect(), gap = 10;
    const left = Math.max(8, Math.min(ax - r.width / 2, window.innerWidth - r.width - 8));
    const top = Math.max(8, Math.min(above ? ay - r.height - gap : ay + gap, window.innerHeight - r.height - 8));
    m.style.left = left + 'px'; m.style.top = top + 'px';
    arrow.className = 'menu-arrow ' + (above ? 'down' : 'up');
    arrow.style.left = (Math.max(16, Math.min(ax - left, r.width - 16)) - 6) + 'px';
    m.style.visibility = ''; });
}

function resetArrow(arrow) {
  for (const p of ['left', 'right', 'top', 'bottom']) arrow.style[p] = '';
}

// Меню от кнопки тулбара: для вертикальной панели выводим горизонтально от
// самой кнопки, чтобы двухколоночный тулбар не диктовал место появления.
export function showMenuForAnchor(m, anchorEl, opts = {}) {
  showMenu(m);
  let arrow = m.querySelector(':scope > .menu-arrow');
  if (!arrow) { arrow = document.createElement('div'); arrow.className = 'menu-arrow'; m.appendChild(arrow); }
  requestAnimationFrame(() => {
    const r = m.getBoundingClientRect(), a = anchorEl.getBoundingClientRect(), gap = 10, margin = 8;
    const host = anchorEl.closest(opts.containerSelector || '#sidebar, #topbar') || anchorEl;
    const h = host.getBoundingClientRect();
    const vw = window.innerWidth, vh = window.innerHeight;
    const ax = a.left + a.width / 2, ay = a.top + a.height / 2;
    if (host.id === 'sidebar') {
      const side = (h.left + h.width / 2) <= vw / 2 ? 'right' : 'left';
      resetArrow(arrow);
      let left = side === 'right' ? a.right + gap : a.left - gap - r.width;
      let top = ay - r.height / 2;
      left = clamp(left, margin, vw - r.width - margin);
      top = clamp(top, margin, vh - r.height - margin);
      arrow.className = 'menu-arrow ' + (side === 'right' ? 'left' : 'right');
      m.style.left = left + 'px'; m.style.top = top + 'px';
      arrow.style.top = (clamp(ay - top, 16, r.height - 16) - 6) + 'px';
      m.style.visibility = '';
      return;
    }
    const room = {
      right: vw - h.right - margin - gap,
      left: h.left - margin - gap,
      bottom: vh - h.bottom - margin - gap,
      top: h.top - margin - gap,
    };
    const need = { right: r.width, left: r.width, bottom: r.height, top: r.height };
    const horizontal = h.width >= h.height * 1.2;
    const vertical = h.height >= h.width * 1.2;
    const order = vertical ? ['right', 'left', 'bottom', 'top']
      : horizontal ? ['bottom', 'top', 'right', 'left']
        : ['right', 'left', 'bottom', 'top'];
    const side = order.find((s) => room[s] >= need[s])
      || order.reduce((best, s) => (room[s] - need[s] > room[best] - need[best] ? s : best), order[0]);

    let left = ax - r.width / 2, top = ay - r.height / 2;
    resetArrow(arrow);
    if (side === 'right') { left = h.right + gap; arrow.className = 'menu-arrow left'; }
    else if (side === 'left') { left = h.left - gap - r.width; arrow.className = 'menu-arrow right'; }
    else if (side === 'bottom') { top = h.bottom + gap; arrow.className = 'menu-arrow up'; }
    else { top = h.top - gap - r.height; arrow.className = 'menu-arrow down'; }

    left = clamp(left, margin, vw - r.width - margin);
    top = clamp(top, margin, vh - r.height - margin);
    m.style.left = left + 'px'; m.style.top = top + 'px';
    if (side === 'right' || side === 'left') arrow.style.top = (clamp(ay - top, 16, r.height - 16) - 6) + 'px';
    else arrow.style.left = (clamp(ax - left, 16, r.width - 16) - 6) + 'px';
    m.style.visibility = '';
  });
}

// Меню сбоку от опорного элемента (панель слоёв): справа, если влезает, иначе
// слева — чтобы никогда не перекрывать панель. По вертикали — у ay, в экране.
export function showMenuBeside(m, anchorEl, ay) {
  showMenu(m);
  const arrow = m.querySelector(':scope > .menu-arrow'); if (arrow) arrow.remove();
  requestAnimationFrame(() => { const r = m.getBoundingClientRect(), a = anchorEl.getBoundingClientRect(), gap = 8;
    let left = a.right + gap; if (left + r.width > window.innerWidth - 8) left = a.left - gap - r.width;
    left = Math.max(8, Math.min(left, window.innerWidth - r.width - 8));
    const top = Math.max(8, Math.min(ay - r.height / 2, window.innerHeight - r.height - 8));
    m.style.left = left + 'px'; m.style.top = top + 'px'; m.style.visibility = ''; });
}
