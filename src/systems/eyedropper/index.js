// Eyedropper System: единственная пипетка проекта. Активируется четырьмя путями
// через один pipeline: Hot Key Alt (удержание); короткий клик по кнопке bb-pick
// (ПК — залипающий режим до смены инструмента); удержание bb-pick (тач: наведение
// пером — размер кисти, касание — выбор цвета); долгое нажатие пальцем по холсту.
// Пока активна — показывает preview (Found/Current) и по клику/касанию делает
// цвет под курсором активным через Active Color Manager (action 'color.setActive').
import { S } from '../../core/state.js';
import * as bus from '../../core/bus.js';
import * as actions from '../../core/actions.js';
import { $ } from '../../core/dom.js';
import { setTool } from '../../core/tools.js';
import { rgb, rgbToHex } from '../../logic/color.js';
import { eventKey } from '../../logic/key-code.js';
import { HOLD_PICK_MS, DRAG_THRESHOLD, TAP_MAX_MS } from '../../config/timings.js';
import { sampleColor } from './sources.js';

const E = S.eyedrop; // { key, capturing }
let armed = false, via = null, picking = false, found;
let holdT = null, holdId = null, holdX = 0, holdY = 0; // долгое нажатие пальцем по холсту → пипетка
let btnDownT = 0, btnPicked = false, swallowClick = false; // короткий клик vs удержание bb-pick; гашение click после выбора
let addOnPick = false;
const clearHold = () => { clearTimeout(holdT); holdT = null; holdId = null; };
const hover = () => via === 'alt' || via === 'sticky'; // режимы с preview на наведении

const STORE = 'eyedropper';
try { const s = JSON.parse(localStorage.getItem(STORE)); if (s && s.key) E.key = s.key; } catch (e) {}
const persist = () => { try { localStorage.setItem(STORE, JSON.stringify({ key: E.key })); } catch (e) {} };
const typing = (t) => !!((t && t.matches && t.matches('input, textarea')) || (t && t.isContentEditable));

function showPreview(x, y) { const box = $('eyedrop');
  if (found === undefined) { box.classList.remove('on'); return; }
  box.classList.add('on'); box.style.left = (x + 18) + 'px'; box.style.top = (y + 18) + 'px';
  const fe = $('eyedrop-found'); fe.style.background = found ? rgb(found) : 'transparent'; fe.classList.toggle('empty', !found);
  $('eyedrop-cur').style.background = rgb(S.active); $('eyedrop-hex').textContent = found ? rgbToHex(found).toUpperCase() : ''; }

const hide = () => { found = undefined; $('eyedrop').classList.remove('on'); };
function preview(x, y) { found = sampleColor(x, y); showPreview(x, y); }

function setArmed(on, mode) { const nextVia = on ? mode : null; if (armed === on && via === nextVia) return;
  armed = on; via = nextVia; E.active = armed; document.body.classList.toggle('picking', armed); // #pickflag + курсор-пипетка через CSS
  const pk = $('bb-pick'); if (pk) pk.classList.toggle('on', armed);
  if (!armed) { picking = false; hide(); } bus.emit('render'); }

function onMove(e) {
  if (!armed) { if (holdT && e.pointerId === holdId && Math.hypot(e.clientX - holdX, e.clientY - holdY) > DRAG_THRESHOLD) clearHold(); return; } // сдвинул до срабатывания — это штрих, не пипетка
  if (picking) { preview(e.clientX, e.clientY); if (via === 'touch') { e.preventDefault(); e.stopImmediatePropagation(); } } // долгое нажатие: глушим рисование пальцем
  else if (hover()) preview(e.clientX, e.clientY); // Alt/залипающий — preview на наведении; удержание кнопки — только во время касания
  else hide(); }

function onDown(e) {
  if (!armed) { if (e.pointerType === 'touch' && e.target === $('cv')) { if (holdT) { clearHold(); return; } // второй палец → пинч, не пипетка
      holdId = e.pointerId; holdX = e.clientX; holdY = e.clientY;
      holdT = setTimeout(() => { holdT = null; setArmed(true, 'touch'); picking = true; preview(holdX, holdY); }, HOLD_PICK_MS); } return; }
  swallowClick = false;
  addOnPick = via === 'alt' && e.button === 2 && e.target === $('cv');
  if (e.target && e.target.closest && e.target.closest('#bb-pick')) return; // bb-pick — кнопка активации, не источник
  const c = sampleColor(e.clientX, e.clientY); if (c === undefined) return;  // не над источником (тулбар и т.п.) — отдаём событие как есть
  picking = true; found = c; swallowClick = true; e.preventDefault(); e.stopImmediatePropagation(); showPreview(e.clientX, e.clientY); } // перехватываем у инструмента/свотча

function onUp(e) { clearHold(); if (!picking) return; picking = false;
  const pickVia = via;
  if (via !== 'touch') { e.preventDefault(); e.stopImmediatePropagation(); } // btn/alt/sticky — гасим клик; touch — даём gestures завершить трекинг
  if (e.button === 2) swallowClick = false;                                  // ПКМ не даёт обычный click — не глотаем следующий UI-клик
  if (via === 'btn') btnPicked = true;                                       // цвет взят во время удержания bb-pick — не считаем это коротким кликом
  const picked = !!found;
  if (picked) { actions.run('color.setActive', found); if (addOnPick) actions.run('palette.addRgb', found); setTool('pencil'); } // прозрачный пиксель (null) активный цвет/инструмент не меняет
  addOnPick = false;
  if (picked && pickVia !== 'alt') setArmed(false);
  else if (pickVia === 'touch') setArmed(false);
  else preview(e.clientX, e.clientY); } // долгое нажатие — разовый выбор: после отпускания выключаем

// короткий клик по bb-pick (ПК) → залипающая пипетка до смены инструмента;
// удержание (тач) → разовый сеанс (наведение пером = размер кисти, касание = цвет)
function bbDown() { btnDownT = performance.now(); btnPicked = false; if (via !== 'sticky') setArmed(true, 'btn'); }
function bbUp() { if (via === 'sticky') { setArmed(false); return; }                 // повторный клик по пипетке — выключить
  if (performance.now() - btnDownT < TAP_MAX_MS && !btnPicked) setArmed(true, 'sticky'); // короткий клик — залипающий режим
  else setArmed(false); }                                                            // удержание — закончить разовый сеанс

function onKeyDown(e) { const k = eventKey(e); // физическая клавиша — не зависит от раскладки
  if (E.capturing) { e.preventDefault(); if (e.code === 'Escape') { E.capturing = false; } else if (k) { E.key = k; E.capturing = false; persist(); } bus.emit('eyedropper'); return; }
  if (armed || k !== E.key || typing(e.target) || document.querySelector('.ovl.on')) return;
  e.preventDefault(); setArmed(true, 'alt'); }

function onKeyUp(e) { if (via === 'alt' && eventKey(e) === E.key) setArmed(false); }

actions.register('eyedropper.capture', () => { E.capturing = true; bus.emit('eyedropper'); });
bus.on('tool', () => { if (via === 'sticky' || via === 'btn') setArmed(false); }); // выбрал инструмент (кисть и т.п.) — пипетка выключается

export function mount() {
  window.addEventListener('keydown', onKeyDown); window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', () => setArmed(false));
  window.addEventListener('pointermove', onMove, true);
  window.addEventListener('pointerdown', onDown, true); window.addEventListener('pointerup', onUp, true);
  window.addEventListener('click', (e) => { if (swallowClick) { swallowClick = false; e.stopImmediatePropagation(); e.preventDefault(); } }, true); // гасим click-выбор свотча после пипетки
  const pk = $('bb-pick'); if (!pk) return;
  pk.addEventListener('pointerdown', bbDown);
  pk.addEventListener('pointerup', bbUp); pk.addEventListener('pointercancel', () => setArmed(false));
}
