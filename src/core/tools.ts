// Активный инструмент: смена + сигнал. Кнопки/курсор/бары реагируют на 'tool',
// не зная про систему инструмента.
import { S } from "./state.ts";
import * as bus from "./bus.ts";
import * as actions from "./actions.ts";
import type { ShellActionName } from "../contracts/shellActionCatalog.ts";

export function setTool(id: string): void {
  bus.emit("before-tool-change", id);
  S["tool"] = id; S["lineStart"] = null; S["linePrev"] = null; S["linePath"] = null;
  if (id === "rect" || id === "ellipse") S["shapeTool"] = id;
  bus.emit("tool", id); bus.emit("render");
}

for (const t of ["pencil", "eraser", "select", "lasso", "line", "rect",
  "ellipse", "move", "adjust"]) {
  actions.register(("tool." + t) as ShellActionName, () => setTool(t));
}
actions.register("tool.fill", () => {
  if (S["bgSel"]) actions.run("bg.fill");
  else if (S["sel"]) actions.run("selection.fill");
  else setTool("fill");
});
