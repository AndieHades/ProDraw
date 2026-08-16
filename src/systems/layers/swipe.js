// Жесты по строке слоя. Свайп влево — настраиваемые кнопки действий
// (config/layer-actions.js). Свайп вправо — выбор слоя цветом (мультивыбор:
// смахни несколько). Те же действия есть в контекстном меню (menu.js).
import { S } from '../../core/state.js';
import * as bus from '../../core/bus.js';
import { t } from '../../i18n/index.js';
import { attachSwipe } from '../../core/swipe-actions.js';
import { isDesktop } from '../../core/env.js';
import { LAYER_SWIPE_ACTIONS } from '../../config/layer-actions.js';
import { duplicateLayer, deleteLayerRef, toggleLock, toggleAlphaLock, toggleClip, clearLayerRef } from './ops.js';
import { pinchActive } from './pinch.js';

const svg = (p) => `<svg viewBox="0 0 24 24">${p}</svg>`;
const ICON = {
  lock: svg('<rect x="5" y="10.5" width="14" height="9" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>'),
  alphaLock: svg('<rect x="4.5" y="4.5" width="15" height="15" rx="2"/><path d="M12 4.5v15M4.5 12h15"/>'),
  clip: svg('<path d="M16 5h-4.5A2.5 2.5 0 0 0 9 7.5V15"/><path d="M5.5 11.5l3.5 4 3.5-4"/>'),
  duplicate: svg('<rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M16 4.5H6.5A2.5 2.5 0 0 0 4 7v9.5"/>'),
  clean: svg('<path d="M20 4l-5.5 5.5"/><path d="M11 7.2l5.5 5.5"/><path d="M10.3 8.8C7 12.2 4.4 15.3 3.7 18.9L6.1 17.1 7.7 20 9.7 17 11.3 21.1 13.2 16.8 15.5 13.5Z"/>'),
  delete: svg('<path d="M4.5 6.5h15"/><path d="M8 6V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1"/><path d="M6.5 6.5l.8 11.7A2 2 0 0 0 9.3 20h5.4a2 2 0 0 0 2-1.8l.8-11.7"/><path d="M10 10.5v6M14 10.5v6"/>'),
};
const ACT = {
  lock: (L) => ({ icon: ICON.lock, label: t('menu.lock'), on: L.lock, onClick: () => toggleLock(L) }),
  alphaLock: (L) => ({ icon: ICON.alphaLock, label: t('menu.alphaLock'), on: L.alphaLock, onClick: () => toggleAlphaLock(L) }),
  clip: (L) => ({ icon: ICON.clip, label: t('menu.clipMask'), on: L.clip, onClick: () => toggleClip(L) }),
  duplicate: (L) => ({ icon: ICON.duplicate, label: t('menu.duplicate'), onClick: () => duplicateLayer(L) }),
  clean: (L) => ({ icon: ICON.clean, label: t('menu.clearLayer'), onClick: () => clearLayerRef(L) }),
  delete: (L) => ({ icon: ICON.delete, label: t('menu.delete'), danger: true, onClick: () => deleteLayerRef(L) }),
};

function toggleSelect(L) { const i = S.layers.indexOf(L); if (i < 0) return;
  if (S.marked.has(i)) S.marked.delete(i); else S.marked.add(i); bus.emit('layers'); }

export function attachLayerSwipe(row, L) {
  if (isDesktop()) return; // на десктопе свайпа нет — действия в ПКМ-меню (lctx)
  attachSwipe(row, { actions: LAYER_SWIPE_ACTIONS.filter((id) => ACT[id]).map((id) => ACT[id](L)), onSwipeRight: () => toggleSelect(L), guard: pinchActive });
}
