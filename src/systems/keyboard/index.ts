// Система клавиатуры: нормализует событие в «комбо», ищет действие в активной
// карте (дефолт + пользовательские переопределения из localStorage) и запускает
// его из реестра. Перенастройка — rebind()/resetKeymap(), сохраняется.
import type { ShellActionName } from "../../contracts/shellActionCatalog.ts";
import * as actions from "../../core/actions.ts";
import { DEFAULT_KEYMAP } from "./keymap.ts";
import { keyboardCombo } from "../../logic/key-code.ts";
import { canvasPanModifierHeld,
  setCanvasPanModifierHeld } from "../../core/navigationModifiers.ts";

const STORE = "keymap";
type Keymap = Record<string, ShellActionName | null>;

export function comboOf(e: KeyboardEvent): string | null {
  return keyboardCombo(e, canvasPanModifierHeld());
}

let overrides: Keymap = {};
try { overrides = (JSON.parse(localStorage.getItem(STORE) ?? "null") as Keymap) || {}; }
catch { overrides = {}; }
let keymap: Keymap = { ...DEFAULT_KEYMAP, ...overrides };

export const getKeymap = (): Keymap => ({ ...keymap });
function persist(): void {
  try { localStorage.setItem(STORE, JSON.stringify(overrides)); } catch { /* full */ }
}
export function rebind(combo: string, action: ShellActionName): void {
  overrides[combo] = action; keymap = { ...DEFAULT_KEYMAP, ...overrides }; persist();
}
export function unbind(combo: string): void {
  overrides[combo] = null; keymap = { ...DEFAULT_KEYMAP, ...overrides }; persist();
}
export function resetKeymap(): void {
  overrides = {}; keymap = { ...DEFAULT_KEYMAP };
  try { localStorage.removeItem(STORE); } catch { /* unavailable */ }
}

const typing = (t: EventTarget | null): boolean => {
  const element = t as (Element & { isContentEditable?: boolean }) | null;
  return !!(element?.matches?.("input, textarea") || element?.isContentEditable);
};

export function handle(e: KeyboardEvent): boolean {
  const combo = comboOf(e); if (!combo) return false;
  const action = keymap[combo];
  if (e.repeat && (combo.startsWith("space+") || action === "tool.pencil")) return false;
  if (!action || !actions.has(action)) return false;
  const undoRedo = action === "edit.undo" || action === "edit.redo";
  const target = e.target;
  const domTarget = target && typeof (target as Node).nodeType === "number"
    ? target as Node : null;
  const editPop = domTarget && [...document.querySelectorAll("#bcpop.on, #fx-edit.on")]
    .some((p) => p.contains(domTarget));
  const undoInEditPop = undoRedo && editPop;
  // ввод текста / открыт диалог
  if ((typing(target) && !undoInEditPop) ||
    (document.querySelector(".ovl.on") && !undoInEditPop)) return false;
  e.preventDefault(); actions.run(action); return true;
}

export function mount(): void {
  window.addEventListener("keydown", (e) => {
    if (e.code === "Space") {
      const blocked = typing(e.target) || !!document.querySelector(".ovl.on");
      setCanvasPanModifierHeld(!blocked); if (!blocked) e.preventDefault();
    }
    handle(e);
  });
  window.addEventListener("keyup", (e) => {
    if (e.code === "Space") setCanvasPanModifierHeld(false);
  });
  window.addEventListener("blur", () => { setCanvasPanModifierHeld(false); });
}
