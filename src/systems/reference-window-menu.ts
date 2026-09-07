// Контекстное меню окна референсов: пункты строит система, показывает оболочка.
import { $, t } from "../core/shell.ts";
import { openMenuAt } from "../core/menus.ts";

export interface ReferenceMenuActions {
  readonly rotate: () => void;
  readonly flip: () => void;
  readonly copy: () => void;
  readonly paste: () => void;
  readonly save: () => void;
  readonly delete: () => void;
}

function menuEl(): HTMLElement {
  const current = $("ref-ctx"); if (current) return current;
  const menu = document.createElement("div");
  menu.id = "ref-ctx"; menu.className = "menu";
  document.body.appendChild(menu); return menu;
}

function item(label: string, run: () => void, cls = ""): HTMLButtonElement {
  const button = document.createElement("button");
  button.textContent = label; if (cls) button.className = cls;
  button.onclick = () => { menuEl().classList.remove("on"); run(); };
  return button;
}

export function openReferenceMenu(x: number, y: number,
  actions: ReferenceMenuActions): void {
  const menu = menuEl(); menu.innerHTML = "";
  menu.append(
    item(t("reference.rotate90"), actions.rotate),
    item(t("reference.flip"), actions.flip),
    item(t("tool.copy"), actions.copy),
    item(t("tool.paste"), actions.paste),
    item(t("reference.saveImage"), actions.save),
    item(t("menu.delete"), actions.delete, "danger"),
  );
  openMenuAt({ menuId: "ref-ctx", x, y, above: true });
}
