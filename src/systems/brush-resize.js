// Brush Size Modifier: пока зажат Hot Key (по умолчанию D) ИЛИ удерживается
// экранная кнопка пипетки (планшет), и перо/кнопка НЕ касаются холста, движение
// курсора плавно меняет размер кисти. Работает поверх любого инструмента
// рисования — не меняет инструмент, не блокирует штрих. Правит лишь size.
import { S } from '../core/state.js';
import * as bus from '../core/bus.js';
import * as actions from '../core/actions.js';
import { $ } from '../core/dom.js';
import { brushKey } from '../core/tools.js';
import { saveBrushPrefs } from '../core/brush-prefs.js';
import { BP_SMAX } from '../config/limits.js';
import { SENS_PRESETS, DIRECTIONS } from '../config/brush-resize.js';
import { eventKey } from '../logic/key-code.js';

const STORE = 'brushResize';
let active = false, acc = 0, last = null, holdBtn = false; // holdBtn — удержание кнопки bb-pick (планшет)
const R = S.brushResize;
const typing = (t) => !!((t && t.matches && t.matches('input, textarea')) || (t && t.isContentEditable));

try { const s = JSON.parse(localStorage.getItem(STORE)); if (s) Object.assign(R, { key: s.key || R.key, sensitivity: s.sensitivity || R.sensitivity, direction: s.direction || R.direction }); } catch (e) {}
const persist = () => { try { localStorage.setItem(STORE, JSON.stringify({ key: R.key, sensitivity: R.sensitivity, direction: R.direction })); } catch (e) {} };

function setSize(n) { const k = brushKey(), v = Math.max(1, Math.min(BP_SMAX, n));
  if (v !== S.brushes[k].size) { S.brushes[k].size = v; saveBrushPrefs(S); bus.emit('brush'); bus.emit('render'); } } // ползунок + курсор кисти обновляются в реальном времени

function onMove(e) { if (!active || R.capturing) return;
  if (e.buttons !== 0) { last = null; return; }                 // идёт штрих (ЛКМ/касание) — размер не трогаем
  if (!last) { last = { x: e.clientX, y: e.clientY }; return; }   // первый кадр после активации/штриха — без скачка
  const dx = e.clientX - last.x, dy = e.clientY - last.y; last = { x: e.clientX, y: e.clientY };
  const d = R.direction === 'horizontal' ? dx : R.direction === 'vertical' ? -dy : dx - dy; // вправо/вверх — больше
  if (!d) return; acc += d * R.sensitivity; setSize(Math.round(acc)); }

// пока зажат Hot Key — колесо тоже меняет размер (и не зумит холст)
function onWheel(e) { if (!active || R.capturing) return;
  e.preventDefault(); e.stopImmediatePropagation();
  acc = S.brushes[brushKey()].size + (e.deltaY < 0 ? 1 : -1); setSize(Math.round(acc)); }

function onDown(e) { if (e.type === 'keydown' && e.repeat) return;
  const k = eventKey(e); // физическая клавиша — не зависит от раскладки (кириллица и т.п.)
  if (R.capturing) { e.preventDefault();                         // режим захвата клавиши из настроек
    if (e.code === 'Escape') { R.capturing = false; bus.emit('brushResize'); return; }
    if (k) { R.key = k; R.capturing = false; persist(); bus.emit('brushResize'); } return; }
  if (active || k !== R.key || typing(e.target) || document.querySelector('.ovl.on')) return;
  active = true; acc = S.brushes[brushKey()].size; last = null; } // запоминаем текущий размер как старт

function onUp(e) { if (eventKey(e) === R.key) { active = false; last = null; } }
const stop = () => { active = false; holdBtn = false; last = null; };

// удержание кнопки bb-pick (планшет): держишь её пальцем, водишь пером НАД
// холстом (без касания) — размер меняется. Касание холста = пипетка (там
// e.buttons!==0, и onMove ничего не делает) — её ведёт Eyedropper System.
function btnDown() { if (active) return; active = true; holdBtn = true; acc = S.brushes[brushKey()].size; last = null; }
function btnUp() { if (!holdBtn) return; active = false; holdBtn = false; last = null; }

actions.register('brushResize.capture', () => { R.capturing = true; bus.emit('brushResize'); });
actions.register('brushResize.cycleDir', () => { R.direction = DIRECTIONS[(DIRECTIONS.indexOf(R.direction) + 1) % DIRECTIONS.length]; persist(); bus.emit('brushResize'); });
actions.register('brushResize.cycleSens', () => { const i = SENS_PRESETS.indexOf(R.sensitivity);
  R.sensitivity = SENS_PRESETS[(i < 0 ? 0 : i + 1) % SENS_PRESETS.length]; persist(); bus.emit('brushResize'); });

export function mount() {
  window.addEventListener('keydown', onDown); window.addEventListener('keyup', onUp);
  window.addEventListener('blur', stop); // потеря фокуса — клавиша «отпускается», иначе жест залипнет
  window.addEventListener('wheel', onWheel, { capture: true, passive: false }); // capture+passive:false — перехватываем колесо до зума холста
  $('cv').addEventListener('pointermove', onMove);
  const pk = $('bb-pick'); if (!pk) return;
  pk.addEventListener('pointerdown', btnDown); pk.addEventListener('pointerup', btnUp); pk.addEventListener('pointercancel', btnUp);
}
