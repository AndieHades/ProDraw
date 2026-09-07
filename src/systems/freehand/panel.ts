// Панель Freehand Selection: режим контура (Continuous/Segment) и операция
// выделения (New/Add/Subtract/Intersect) + отмена незавершённого контура.
// Перетаскиваемость даёт общий ToolPopoverWindows (панель свёрстана как .toolpop).
import { S } from "../../core/state.ts";
import * as bus from "../../core/bus.ts";
import * as actions from "../../core/actions.ts";
import { $ } from "../../core/shell.ts";

const children = (id: string): HTMLElement[] =>
  [...($(id)?.children ?? [])] as HTMLElement[];

const syncChips = (box: string, val: unknown): void => {
  for (const b of children(box)) b.classList.toggle("on", b.dataset["v"] === val);
};

function sync(): void {
  $("lassopop")?.classList.toggle("on", S["tool"] === "lasso");
  syncChips("lasso-mode", S["lassoMode"]); syncChips("lasso-op", S["lassoOp"]);
}

export function mount(): void {
  for (const b of children("lasso-mode")) b.onclick = () => {
    S["lassoMode"] = b.dataset["v"]; actions.run("lasso.cancel"); sync();
  };
  for (const b of children("lasso-op")) b.onclick = () => {
    S["lassoOp"] = b.dataset["v"]; sync();
  };
  bus.on("tool", sync); sync();
}
