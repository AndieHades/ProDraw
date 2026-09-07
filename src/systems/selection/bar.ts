// Панель действий над выделением (#selbar): копировать/вырезать/вставить/
// удалить/снять. Видна, пока есть активное выделение — снять можно при любом
// инструменте, не только при «Выделении».
import { S } from "../../core/state.ts";
import * as bus from "../../core/bus.ts";
import * as actions from "../../core/actions.ts";
import type { ShellActionName } from "../../contracts/shellActionCatalog.ts";
import { $ } from "../../core/shell.ts";
import { openMenuAt } from "../../core/menus.ts";

const closeMenu = (): void => { $("sctx")?.classList.remove("on"); };
const onClick = (id: string, run: () => void): void => {
  const node = $(id); if (node) node.onclick = run;
};
const menuItem = (id: string, action: ShellActionName): void =>
  onClick(id, () => { closeMenu(); void actions.run(action); });
const selectionVisible = (): boolean => !!S["sel"] && !S["selFloat"];

export function mount(): void {
  for (const [id, action] of [["sel-copy", "edit.copy"], ["sel-cut", "edit.cut"],
    ["sel-paste", "edit.paste"], ["sel-del", "edit.delete"],
    ["sel-off", "select.none"]] as const) onClick(id, () => void actions.run(action));
  for (const [id, action] of [["sctx-off", "select.none"],
    ["sctx-invert", "selection.invert"], ["sctx-transform", "selection.transform"],
    ["sctx-copy-layer", "selection.copyLayer"]] as const) menuItem(id, action);
  const sync = (): void => { $("selbar")?.classList.toggle("on", selectionVisible()); };
  bus.on<{ clientX: number; clientY: number }>("selection-menu", (event) => {
    if (event && selectionVisible()) openMenuAt({ menuId: "sctx",
      x: event.clientX, y: event.clientY, above: true });
  });
  bus.on("selection", sync); sync();
}
