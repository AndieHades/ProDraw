import { S } from '../core/state.js';
import * as bus from '../core/bus.ts';
import * as actions from '../core/actions.ts';
import { doUndo, doRedo } from '../core/history.js';
import { SimpleDrawBarPresenter } from '../ui/shell/EraserBarPresenter.ts';

const sizeForTool = () => S.tool === 'eraser' ? S.eraserSize : S.pencilSize;
const setSizeForTool = (size) => {
  if (S.tool === 'eraser') S.eraserSize = size;
  else S.pencilSize = size;
};
const opacityForTool = () => S.brushOpacity[S.tool === 'eraser' ? 'eraser' : 'pencil'];
const setOpacityForTool = (opacity) => {
  S.brushOpacity[S.tool === 'eraser' ? 'eraser' : 'pencil'] = opacity;
};
const presenter = new SimpleDrawBarPresenter({
  size: sizeForTool,
  setSize: setSizeForTool,
  opacity: opacityForTool,
  setOpacity: setOpacityForTool,
  changed: () => { bus.emit('render'); },
  undo: doUndo, redo: doRedo,
  subscribe: (event, listener) => { bus.on(event, listener); },
});

export const mount = () => presenter.mount();
actions.register('draw.smaller', () => presenter.smaller());
actions.register('draw.bigger', () => presenter.bigger());
