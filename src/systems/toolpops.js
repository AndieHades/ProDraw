// Делает все всплывающие окна-инструменты (.toolpop: цвет, обводка, свечение,
// тень, яркость/контраст, кисть-коррекция) перетаскиваемыми за заголовок.
import { floatingWindow } from '../core/floating-window.js';

export function mount() {
  for (const pop of document.querySelectorAll('.toolpop')) {
    const grip = pop.querySelector('.bp-head'); if (!grip) continue;
    floatingWindow(pop, { grip, storeKey: pop.id ? 'pop-' + pop.id : undefined, minW: 200, minH: 100, avoidOverlap: false });
  }
}
