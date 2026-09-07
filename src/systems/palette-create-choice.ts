// Групповая кнопка "Новая палитра": ЛКМ запускает последний режим, ПКМ открывает
// горизонтальную плашку вариантов на общем tool-choice.
import { $, t } from "../core/shell.ts";
import { openMenuAt } from "../core/menus.ts";

const STORE = "paletteCreateMode";
type CreateMode = "blank" | "image" | "canvas";
interface ModeEntry {
  readonly mode: CreateMode; readonly key: string; readonly icon: string;
}
export type PaletteCreateActions = Partial<Record<CreateMode, () => void>>;

const MODES: readonly ModeEntry[] = [
  { mode: "blank", key: "palette.new", icon: '<svg viewBox="0 0 24 24"><path d="M12 6v12M6 12h12"/></svg>' },
  { mode: "image", key: "btn.fromImage", icon: '<svg viewBox="0 0 24 24"><rect x="4.5" y="5" width="15" height="14" rx="2"/><path d="M8 14l2.7-3 3.2 3.8 1.6-1.8 3 3.5"/><circle cx="8.5" cy="8.8" r="1.2"/></svg>' },
  { mode: "canvas", key: "palette.fromCanvas", icon: '<svg viewBox="0 0 24 24"><rect x="4.5" y="5" width="15" height="14" rx="2"/><path d="M8 9h8M8 13h5"/><path d="M15.5 15.5l3.2 3.2M18.5 15.5l-3.2 3.2"/></svg>' },
];
const FALLBACK = MODES[0] as ModeEntry;

let actions: PaletteCreateActions = {};
let lastMode: CreateMode | null = null;
const byMode = (mode: string | null): ModeEntry =>
  MODES.find((entry) => entry.mode === mode) ?? FALLBACK;

function readMode(): CreateMode {
  try { return byMode(localStorage.getItem(STORE)).mode; } catch { return FALLBACK.mode; }
}

function remember(mode: CreateMode): void {
  lastMode = mode;
  try { localStorage.setItem(STORE, mode); } catch { /* хранилище необязательно */ }
}

function run(mode: CreateMode | null = lastMode): void {
  const entry = byMode(mode); remember(entry.mode); refreshPaletteCreateChoice();
  actions[entry.mode]?.();
}

function buildMenu(menu: HTMLElement): void {
  menu.innerHTML = "";
  for (const entry of MODES) {
    const button = document.createElement("button");
    button.innerHTML = entry.icon;
    button.dataset["i18nTitle"] = entry.key;
    button.dataset["palCreate"] = entry.mode;
    button.title = t(entry.key);
    button.onclick = () => { menu.classList.remove("on"); run(entry.mode); };
    menu.appendChild(button);
  }
}

export function refreshPaletteCreateChoice(): void {
  const button = $("pal-new"), menu = $("pal-new-choice");
  if (!button || !menu) return;
  const entry = byMode(lastMode ?? readMode());
  button.innerHTML = entry.icon;
  button.dataset["i18nTitle"] = entry.key; button.title = t(entry.key);
  for (const option of menu.querySelectorAll("button")) {
    const mode = option.dataset["palCreate"] ?? null;
    option.title = t(byMode(mode).key);
    option.classList.toggle("on", mode === entry.mode);
  }
}

export function initPaletteCreateChoice(nextActions: PaletteCreateActions): void {
  actions = nextActions || {}; lastMode = readMode();
  const button = $("pal-new"), menu = $("pal-new-choice");
  if (!button || !menu) return;
  buildMenu(menu); refreshPaletteCreateChoice();
  button.onclick = () => run();
  button.oncontextmenu = (event) => {
    event.preventDefault(); refreshPaletteCreateChoice();
    const rect = button.getBoundingClientRect();
    openMenuAt({ menuId: "pal-new-choice", x: rect.left + rect.width / 2,
      y: rect.top, above: true });
  };
}
