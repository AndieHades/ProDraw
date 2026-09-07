// Показ меню оболочки. Система называет меню и точку привязки, а рисует его
// сама оболочка: прямой импорт презентера из `core` и `systems` запрещён тем
// же правилом, по которому короткое сообщение уходит событием `feedback`.
import * as bus from "./bus.ts";

export interface MenuAtRequest {
  readonly menuId: string;
  readonly x: number;
  readonly y: number;
  readonly above?: boolean;
}

export interface MenuBesideRequest {
  readonly menuId: string;
  readonly anchorId: string;
  readonly y: number;
}

export const openMenuAt = (request: MenuAtRequest): void => {
  bus.emit("menu-at", request);
};

export const openMenuBeside = (request: MenuBesideRequest): void => {
  bus.emit("menu-beside", request);
};
