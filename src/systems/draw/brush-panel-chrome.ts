// Оболочка панели кистей: шапка с заголовком и закрытием, тело с отступами и
// строка действий. Повторяет окно палитры, чтобы панели выглядели одинаково.
import { t } from "../../core/shell.ts";

const ICONS = {
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  duplicate: '<rect x="8.5" y="8.5" width="11" height="11" rx="2"/><path d="M15.5 5.5h-11v11"/>',
  remove: '<path d="M5.5 7.5h13M10 7.5V5.5h4v2M7.5 7.5l1 12h7l1-12"/>',
} as const;

export interface BrushPanelActions {
  readonly duplicate: () => void;
  readonly remove: () => void;
}

function iconButton(id: string, key: string, icon: string,
  run: () => void): HTMLButtonElement {
  const button = document.createElement("button");
  button.id = id; button.title = t(key); button.dataset["i18nTitle"] = key;
  button.innerHTML = `<svg viewBox="0 0 24 24">${icon}</svg>`;
  button.onclick = run; return button;
}

export function buildBrushPanel(panel: HTMLElement, actions: BrushPanelActions): void {
  const head = document.createElement("div"); head.className = "pop-head";
  const title = document.createElement("span");
  title.className = "pop-title"; title.textContent = t("brush.library");
  const acts = document.createElement("span"); acts.className = "pop-acts";
  const close = iconButton("brush-x", "btn.close", ICONS.close,
    () => panel.classList.remove("on"));
  close.classList.add("win-x"); acts.append(close); head.append(title, acts);
  const body = document.createElement("div"); body.id = "brush-body";
  const list = document.createElement("div"); list.id = "brush-list";
  const bar = document.createElement("div");
  bar.id = "brush-act"; bar.className = "lay-act";
  bar.append(iconButton("brush-dup", "brush.duplicate", ICONS.duplicate, actions.duplicate),
    iconButton("brush-del", "brush.delete", ICONS.remove, actions.remove));
  body.append(list, bar); panel.replaceChildren(head, body);
}
