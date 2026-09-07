import * as bus from "../core/bus.ts";
import * as actions from "../core/actions.ts";
import { ensureGrid, setGridVisible } from "../core/grid.ts";

export function openGridPop(): void {
  const g = ensureGrid();
  setGridVisible(!g.visible);
  bus.emit("grid");
  bus.emit("render");
}

export function mount(): void { ensureGrid(); }

actions.register("grid.open", openGridPop);
