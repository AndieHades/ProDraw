import { $, showMenuAt, t } from '../core/dom.js';

function menuEl() {
  let m = $('ref-ctx');
  if (!m) { m = document.createElement('div'); m.id = 'ref-ctx'; m.className = 'menu'; document.body.appendChild(m); }
  return m;
}

function item(label, fn, cls = '') {
  const b = document.createElement('button'); b.textContent = label; if (cls) b.className = cls;
  b.onclick = () => { menuEl().classList.remove('on'); fn(); };
  return b;
}

export function openReferenceMenu(x, y, actions) {
  const m = menuEl(); m.innerHTML = '';
  m.append(
    item(t('reference.rotate90'), actions.rotate),
    item(t('reference.flip'), actions.flip),
    item(t('tool.copy'), actions.copy),
    item(t('tool.paste'), actions.paste),
    item(t('reference.saveImage'), actions.save),
    item(t('menu.delete'), actions.delete, 'danger'),
  );
  showMenuAt(m, x, y, true);
}
