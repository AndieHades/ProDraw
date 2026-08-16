// Списки пресетов «Новый холст»: Sprites, Frames и Saved.
import { $, showMenuAt } from '../../core/dom.js';
import { t } from '../../i18n/index.js';
import { SPRITE_PRESETS, GAME_FRAME_PRESETS } from '../../config/presets.js';

const dim = (p) => `${p.w} x ${p.h}`;

function menuForSaved(e, i, handlers) {
  e.preventDefault(); e.stopPropagation();
  const m = $('rowctx'); m.innerHTML = '';
  for (const a of [
    { label: t('menu.edit'), fn: () => handlers.edit(i) },
    { label: t('gallery.delete'), danger: true, fn: () => handlers.remove(i) },
  ]) {
    const b = document.createElement('button'); b.textContent = a.label;
    if (a.danger) b.classList.add('danger');
    b.onclick = () => { m.classList.remove('on'); a.fn(); };
    m.appendChild(b);
  }
  showMenuAt(m, e.clientX, e.clientY);
}

function row(p, savedIdx, handlers) {
  const el = document.createElement(savedIdx == null ? 'button' : 'div');
  el.className = 'new-row' + (savedIdx == null ? '' : ' saved'); if (el.tagName === 'BUTTON') el.type = 'button';
  const name = document.createElement('span'); name.className = 'new-name'; name.textContent = p.label || dim(p);
  const size = document.createElement('span'); size.className = 'new-size'; size.textContent = savedIdx == null ? '›' : dim(p);
  el.append(name, size); el.onclick = () => handlers.create(p);
  if (savedIdx != null) {
    const dots = document.createElement('button'); dots.type = 'button'; dots.className = 'new-dots'; dots.textContent = '...';
    dots.onclick = (e) => menuForSaved(e, savedIdx, handlers); el.appendChild(dots);
  }
  return el;
}

function fillStack(id, list, handlers, saved = false) {
  const box = $(id); box.innerHTML = '';
  if (saved && !list.length) { const p = document.createElement('p'); p.className = 'new-empty'; p.textContent = t('new.savedEmpty'); box.appendChild(p); return; }
  list.forEach((p, i) => box.appendChild(row(p, saved ? i : null, handlers)));
}

export function buildPresetLists(saved, handlers) {
  fillStack('new-sprites', SPRITE_PRESETS, handlers);
  fillStack('new-frames', GAME_FRAME_PRESETS, handlers);
  fillStack('new-saved', saved, handlers, true);
}
