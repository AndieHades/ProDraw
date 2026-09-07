// Делает все всплывающие окна-инструменты (.toolpop: цвет, обводка, свечение,
// тень, яркость/контраст, кисть-коррекция) перетаскиваемыми за заголовок.
import { floatingWindow } from "./FloatingWindow.ts";

export function mountToolPopoverWindows(): void {
  for (const pop of document.querySelectorAll<HTMLElement>(".toolpop")) {
    const grip = pop.querySelector<HTMLElement>(".bp-head"); if (!grip) continue;
    floatingWindow(pop, { grip, minW: 200, minH: 100, avoidOverlap: false,
      ...(pop.id ? { storeKey: "pop-" + pop.id } : {}) });
  }
}
