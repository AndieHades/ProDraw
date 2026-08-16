// Единый физический gap для drag/drop: ничего не рисует, только раздвигает
// элементы на половину размера цели. Его можно отключить флагом — расчёт
// места вставки продолжит работать без визуального раздвигания.
import { DROP_CENTER_RATIO, DROP_GAP_RATIO, PHYSICAL_DROP_GAP } from '../config/drag-drop.js';

export function makeDropGap({ axis = 'x', className = '', ratio = DROP_GAP_RATIO, min = 1, enabled = true } = {}) {
  const el = document.createElement('div');
  el.className = ['drop-gap', axis === 'y' ? 'drop-gap-y' : 'drop-gap-x', className].filter(Boolean).join(' ');
  let target = null, after = false, active = false, closing = false, sizePx = 0;
  let activeKey = '', pendingKey = '', timer = null;

  function sampleSize(sample) {
    if (!sample) return min;
    const r = sample.getBoundingClientRect();
    const size = axis === 'y' ? r.height : r.width;
    return Math.max(min, Math.round(size * ratio));
  }

  function show(parent, node, placeAfter = false, sample = node) {
    if (!parent) return;
    if (node && node.parentNode !== parent) { target = null; after = false; active = false; pendingKey = ''; return; }
    const nextSize = sampleSize(sample);
    const same = active && target === (node || null) && after === !!placeAfter;
    target = node || null; after = !!placeAfter; active = true; pendingKey = ''; closing = false;
    if (!enabled || !PHYSICAL_DROP_GAP) return;
    if (el.parentNode && el.classList.contains('closing')) el.remove();
    el.classList.remove('closing');
    if (!same || !sizePx) { sizePx = nextSize; el.style.setProperty('--drop-gap-size', sizePx + 'px'); }
    const ref = node ? (placeAfter ? node.nextSibling : node) : null;
    if (el.parentNode !== parent || ref !== el) parent.insertBefore(el, ref);
  }

  function next(selector, ignored = new Set()) {
    if (!active) return null;
    let n = after ? target?.nextElementSibling : target;
    while (n && (n === el || (selector && !n.matches(selector)) || ignored.has(n))) n = n.nextElementSibling;
    return n;
  }

  return {
    el,
    get target() { return target; },
    get after() { return after; },
    get active() { return active; },
    show,
    request(parent, node, placeAfter, sample, key, delay = 0) {
      if (!key) { this.cancel(); return; }
      if (active && activeKey === key) return;
      if (pendingKey === key) return;
      clearTimeout(timer); pendingKey = key; this.close();
      timer = setTimeout(() => { if (pendingKey !== key) return; activeKey = key; show(parent, node, placeAfter, sample); }, delay);
    },
    cancel() { clearTimeout(timer); pendingKey = ''; this.close(); },
    next,
    close() {
      target = null; after = false; active = false; activeKey = '';
      if (!el.parentNode || closing) return;
      closing = true; el.classList.add('closing');
      setTimeout(() => { if (closing) { el.remove(); closing = false; sizePx = 0; } }, 180);
    },
    remove() { clearTimeout(timer); pendingKey = ''; activeKey = ''; closing = false; el.remove(); target = null; after = false; active = false; sizePx = 0; }
  };
}

export function dropZone(el, x, y, axis = 'x', centerRatio = DROP_CENTER_RATIO) {
  const r = el.getBoundingClientRect();
  const size = axis === 'y' ? r.height : r.width;
  const pos = size > 0 ? ((axis === 'y' ? y - r.top : x - r.left) / size) : 0.5;
  const pad = Math.max(0, Math.min(0.49, (1 - centerRatio) / 2));
  const after = pos >= 0.5;
  return { zone: pos > pad && pos < 1 - pad ? 'center' : (after ? 'after' : 'before'), after };
}
