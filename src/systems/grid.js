import * as bus from '../core/bus.js';
import * as actions from '../core/actions.js';
import { ensureGrid, setGridVisible } from '../core/grid.js';

export function openGridPop() {
  const g = ensureGrid();
  setGridVisible(!g.visible);
  bus.emit('grid');
  bus.emit('render');
}

export function mount() { ensureGrid(); }

actions.register('grid.open', openGridPop);
