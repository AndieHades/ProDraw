import { $, showMenuAt, toast, t } from '../../core/dom.js';
import { deleteFrame, duplicateFrame, insertFrame, setFrameDuration } from '../../core/animation.js';

function ensureMenu() {
  let m = $('anim-menu');
  if (m) return m;
  m = document.createElement('div'); m.id = 'anim-menu'; m.className = 'menu'; document.body.appendChild(m); return m;
}

const btn = (key, fn) => {
  const b = document.createElement('button'); b.type = 'button'; b.textContent = t(key); b.onclick = () => { $('anim-menu').classList.remove('on'); fn(); };
  return b;
};

export function openFrameMenu(id, x, y) {
  const m = ensureMenu(); m.textContent = '';
  m.append(
    btn('animation.duplicateFrame', () => duplicateFrame(id)),
    btn('animation.insertBefore', () => insertFrame(id, false)),
    btn('animation.insertAfter', () => insertFrame(id, true)),
    btn('animation.setDuration', () => {
      const v = Number(window.prompt(t('animation.durationPrompt'), ''));
      if (Number.isFinite(v) && v > 0) setFrameDuration(id, v);
    }),
    btn('animation.deleteFrame', () => { if (!deleteFrame(id)) toast(t('toast.animationLastFrame')); }),
  );
  showMenuAt(m, x, y);
}
