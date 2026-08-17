import { S } from '../core/state.js';
import * as bus from '../core/bus.ts';
import * as actions from '../core/actions.ts';
import { brushKey } from '../core/tools.js';
import { doUndo, doRedo } from '../core/history.js';
import { saveBrushPrefs } from '../core/brush-prefs.js';
import { BrushBarPresenter } from '../ui/shell/BrushBarPresenter.ts';
export { fracFromSize, sizeFromFrac } from '../ui/shell/BrushBarPresenter.ts';

const presenter = new BrushBarPresenter({
  brush: () => { const brush = S.brushes[brushKey()];
    return { size: brush.size, opacity: brush.op }; },
  setSize: (size) => { S.brushes[brushKey()].size = size; },
  setOpacity: (opacity) => { S.brushes[brushKey()].op = opacity; },
  save: () => saveBrushPrefs(S),
  changed: () => { bus.emit('brush'); bus.emit('render'); },
  undo: doUndo, redo: doRedo,
  subscribe: (event, listener) => { bus.on(event, listener); },
});
export const syncBars = () => presenter.sync();

export function mount() {
  presenter.mount();
}

actions.register('brush.smaller', () => presenter.smaller());
actions.register('brush.bigger', () => presenter.bigger());
