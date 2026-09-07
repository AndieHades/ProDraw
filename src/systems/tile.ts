// Tile Mode: бесшовный 3×3-повтор холста с заворотом рисования (как в Aseprite).
// Кнопка-тумблер в сайдбаре рядом с сеткой. Сам повтор рисует render, заворот
// координат — слой рисования (cells/flood) и перемещение; здесь только режим.
import { S } from "../core/state.ts";
import * as bus from "../core/bus.ts";
import * as actions from "../core/actions.ts";
import { $ } from "../core/shell.ts";

const mode = (): { on: boolean } => S["tile"] as { on: boolean };
const sync = (): void => {
  const b = $("tile-btn"); if (b) b.classList.toggle("on", !!mode()?.on);
};

export function toggleTile(): void {
  const tile = mode(); if (!tile) return;
  tile.on = !tile.on; sync(); bus.emit("render");
}

export function mount(): void {
  sync();
  const button = $("tile-btn"); if (button) button.onclick = toggleTile;
  actions.register("view.tile", toggleTile);
}
