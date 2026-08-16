// Система клавиатуры: нормализует событие в «комбо», ищет действие в активной
// карте (дефолт + пользовательские переопределения из localStorage) и запускает
// его из реестра. Перенастройка — rebind()/resetKeymap(), сохраняется.
import * as actions from '../../core/actions.js';
import { DEFAULT_KEYMAP } from './keymap.js';
import { keyName } from '../../logic/key-code.js';

const STORE = 'keymap';

let spaceHeld = false; // Space как зажатый модификатор: Space+X / Space+Y — флип тайла на кисти
export function comboOf(e) { const k = keyName(e.code); if (!k) return null;
  return (e.ctrlKey || e.metaKey ? 'mod+' : '') + (e.shiftKey ? 'shift+' : '') + (e.altKey ? 'alt+' : '') + (spaceHeld && k !== 'space' ? 'space+' : '') + k; }

let overrides = {};
try { overrides = JSON.parse(localStorage.getItem(STORE)) || {}; } catch (e) {}
let keymap = { ...DEFAULT_KEYMAP, ...overrides };

export const getKeymap = () => ({ ...keymap });
function persist() { try { localStorage.setItem(STORE, JSON.stringify(overrides)); } catch (e) {} }
export function rebind(combo, action) { overrides[combo] = action; keymap = { ...DEFAULT_KEYMAP, ...overrides }; persist(); }
export function unbind(combo) { overrides[combo] = null; keymap = { ...DEFAULT_KEYMAP, ...overrides }; persist(); }
export function resetKeymap() { overrides = {}; keymap = { ...DEFAULT_KEYMAP }; try { localStorage.removeItem(STORE); } catch (e) {} }

const typing = (t) => !!((t && t.matches && t.matches('input, textarea')) || (t && t.isContentEditable));

export function handle(e) {
  const combo = comboOf(e); if (!combo) return false;
  if (e.repeat && combo.startsWith('space+')) return false; // удержание Space+X не должно мигать флипом
  const action = keymap[combo];
  if (!action || !actions.has(action)) return false;
  const undoRedo = action === 'edit.undo' || action === 'edit.redo';
  const target = e.target, domTarget = target && typeof target.nodeType === 'number' ? target : null;
  const editPop = domTarget && [...document.querySelectorAll('#bcpop.on, #fx-edit.on')].some((p) => p.contains(domTarget));
  const undoInEditPop = undoRedo && editPop;
  if ((typing(target) && !undoInEditPop) || (document.querySelector('.ovl.on') && !undoInEditPop)) return false; // ввод текста / открыт диалог
  e.preventDefault(); actions.run(action); return true;
}

export function mount() {
  window.addEventListener('keydown', (e) => { if (e.code === 'Space') spaceHeld = true; handle(e); });
  window.addEventListener('keyup', (e) => { if (e.code === 'Space') spaceHeld = false; });
  window.addEventListener('blur', () => { spaceHeld = false; });
}
