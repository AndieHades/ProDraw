// Система клавиатуры: нормализует событие в «комбо», ищет действие в активной
// карте (дефолт + пользовательские переопределения из localStorage) и запускает
// его из реестра. Перенастройка — rebind()/resetKeymap(), сохраняется.
import * as actions from '../../core/actions.ts';
import { DEFAULT_KEYMAP } from './keymap.js';
import { keyboardCombo } from '../../logic/key-code.ts';
import { canvasPanModifierHeld,
  setCanvasPanModifierHeld } from '../../core/navigationModifiers.ts';

const STORE = 'keymap';

export function comboOf(e) { return keyboardCombo(e, canvasPanModifierHeld()); }

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
  const action = keymap[combo];
  if (e.repeat && (combo.startsWith('space+') || action === 'tool.pencil')) return false;
  if (!action || !actions.has(action)) return false;
  const undoRedo = action === 'edit.undo' || action === 'edit.redo';
  const target = e.target, domTarget = target && typeof target.nodeType === 'number' ? target : null;
  const editPop = domTarget && [...document.querySelectorAll('#bcpop.on, #fx-edit.on')].some((p) => p.contains(domTarget));
  const undoInEditPop = undoRedo && editPop;
  if ((typing(target) && !undoInEditPop) || (document.querySelector('.ovl.on') && !undoInEditPop)) return false; // ввод текста / открыт диалог
  e.preventDefault(); actions.run(action); return true;
}

export function mount() {
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
      const blocked = typing(e.target) || !!document.querySelector('.ovl.on');
      setCanvasPanModifierHeld(!blocked); if (!blocked) e.preventDefault();
    }
    handle(e);
  });
  window.addEventListener('keyup', (e) => {
    if (e.code === 'Space') setCanvasPanModifierHeld(false);
  });
  window.addEventListener('blur', () => { setCanvasPanModifierHeld(false); });
}
