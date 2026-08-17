import * as bus from '../core/bus.ts';
import * as actions from '../core/actions.ts';
import { ensureGrid, setGridVisible } from '../core/grid.js';

export function openGridPop() {
  const g = ensureGrid();
  setGridVisible(!g.visible);
  bus.emit('grid');
  bus.emit('render');
}

export function mount() { ensureGrid(); }

actions.register('grid.open', openGridPop);
