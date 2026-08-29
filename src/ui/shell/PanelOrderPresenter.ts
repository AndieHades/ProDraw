import { attachReorder } from "./ReorderGesture.ts";

const STORE = "panelOrderV2";
const ORDER_SCHEMA = 3;
const PANELS = ["tb-left", "tb-right", "sidebar"] as const;
type PanelId = (typeof PANELS)[number];
const DROP = PANELS.map((id) => `#${id}`).join(",");
const MIGRATIONS: Readonly<Record<string, string | null>> = {
  bc: "img-settings", mono: null
};
const ALLOWED: Readonly<Record<PanelId, ReadonlySet<string>>> = {
  "tb-left": new Set(["docsbtn", "imp-btn", "export-btn", "prev", "refbtn"]),
  "tb-right": new Set(["layers", "activewrap"]),
  sidebar: new Set(["t-pencil", "t-eraser", "t-fill", "t-move",
    "crop", "trim-selected", "t-select", "t-lasso", "flip-h", "sym", "t-shape", "t-adjust",
    "tile-btn", "center", "t-text", "zoom"])
};
const MOVED_OUT = new Set(["fx-btn", "img-settings", "bc"]);
let squelchUntil = 0;
type PanelOrder = Partial<Record<PanelId, readonly string[]>>;
interface StoredOrder { readonly order: PanelOrder; readonly schema: number }

function panel(id: PanelId): HTMLElement | null {
  return document.getElementById(id);
}

function allowedIn(panelId: string, buttonId: string): boolean {
  return Object.hasOwn(ALLOWED, panelId) &&
    ALLOWED[panelId as PanelId].has(buttonId);
}

function readOrder(): StoredOrder | null {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(STORE) ?? "null");
    if (!value || typeof value !== "object") return null;
    const record = value as Record<string, unknown>, order: PanelOrder = {};
    for (const id of PANELS) {
      const entries = record[id];
      if (Array.isArray(entries) && entries.every((entry) => typeof entry === "string")) {
        order[id] = entries;
      }
    }
    return { order, schema: Number.isInteger(record.schema) ? Number(record.schema) : 0 };
  } catch { return null; }
}

function save(): void {
  const order: Record<string, unknown> = { schema: ORDER_SCHEMA };
  for (const id of PANELS) {
    const container = panel(id);
    if (container) order[id] = [...container.children]
      .filter((child) => Boolean(child.id) && allowedIn(id, child.id))
      .map((child) => child.id);
  }
  try { localStorage.setItem(STORE, JSON.stringify(order)); } catch { /* optional */ }
}

function placeAfter(buttonId: string, anchorId: string): void {
  const button = document.getElementById(buttonId);
  const anchor = document.getElementById(anchorId);
  if (button && anchor && button.parentElement === anchor.parentElement) anchor.after(button);
}

function applySaved(): void {
  const stored = readOrder();
  if (!stored) return;
  for (const id of PANELS) {
    const container = panel(id);
    if (!container) continue;
    for (const raw of stored.order[id] ?? []) {
      if (MOVED_OUT.has(raw)) continue;
      const buttonId = Object.hasOwn(MIGRATIONS, raw) ? MIGRATIONS[raw] : raw;
      if (!buttonId || !allowedIn(id, buttonId)) continue;
      const button = document.getElementById(buttonId);
      if (button) container.appendChild(button);
    }
  }
  if (stored.schema < ORDER_SCHEMA) placeAfter("trim-selected", "crop");
  save();
}

export function mount(): void {
  applySaved();
  for (const id of PANELS) {
    const container = panel(id);
    if (!container) continue;
    for (const child of [...container.children]) {
      if (child.tagName !== "BUTTON" || !child.id || !allowedIn(id, child.id)) continue;
      const button = child as HTMLButtonElement;
      button.classList.add("pbtn");
      attachReorder(button, { dropSel: DROP, itemSel: ".pbtn", save,
        squelch: () => { squelchUntil = performance.now() + 350; },
        accept: (element, target) => allowedIn(target.id, element.id) });
      button.addEventListener("contextmenu", (event) => event.preventDefault());
      button.addEventListener("click", (event) => {
        if (performance.now() >= squelchUntil) return;
        event.stopPropagation(); event.preventDefault();
      }, true);
    }
  }
}
