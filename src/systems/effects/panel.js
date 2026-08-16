// Перемещаемая панель эффектов: кнопка-звёздочка открывает/закрывает её,
// иконки типов добавляют эффект (через окно настроек с превью).
import * as actions from '../../core/actions.js';
import { $ } from '../../core/dom.js';
import { floatingWindow } from '../../core/floating-window.js';
import { openFxNew } from './settings.js';

export function togglePanel() { const on = $('fx-panel').classList.toggle('on'); $('fx-btn').classList.toggle('on', on); }

export function mountPanel() {
  $('fx-btn').addEventListener('click', togglePanel);
  for (const b of $('fx-types').querySelectorAll('button')) b.addEventListener('click', () => openFxNew(b.dataset.fx));
  floatingWindow($('fx-panel'), { grip: $('fx-head'), handle: $('fx-rsz'), storeKey: 'fxwin', minW: 180, minH: 110,
    onClose: () => { $('fx-panel').classList.remove('on'); $('fx-btn').classList.remove('on'); },
    onResize: (w) => { $('fx-panel').style.width = Math.max(180, Math.min(innerWidth - 12, w)) + 'px'; } });
  actions.register('fx.panel', togglePanel);
}
