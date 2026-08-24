import { S } from '../core/state.js';
import * as actions from '../core/actions.ts';
import * as bus from '../core/bus.ts';
import { $, t } from '../ui/dom/ShellDom.ts';

const SHAPES = [
  { id: 'round', key: 'brush.round', icon: '●' },
  { id: 'square', key: 'brush.square', icon: '■' },
];
const storeKey = 'simpleBrushShapes';
const activeTool = () => S.tool === 'eraser' ? 'eraser' : 'pencil';

function save() {
  localStorage.setItem(storeKey, JSON.stringify(S.brushShape));
}

function render() {
  const list = $('brush-list'); if (!list) return;
  const tool = activeTool(); list.replaceChildren(...SHAPES.map((shape) => {
    const button = document.createElement('button'); button.className = 'btile';
    button.classList.toggle('on', S.brushShape[tool] === shape.id);
    button.title = t(shape.key); button.textContent = shape.icon;
    button.onclick = () => { S.brushShape[tool] = shape.id; save(); render(); bus.emit('render'); };
    return button;
  }));
}

function toggle() {
  const panel = $('brush-pop'); panel.classList.toggle('on');
  if (panel.classList.contains('on')) render();
}

export function mount() {
  try { Object.assign(S.brushShape, JSON.parse(localStorage.getItem(storeKey) || '{}')); } catch {}
  const panel = $('brush-pop'); if (!panel) return;
  panel.replaceChildren(Object.assign(document.createElement('div'), { id: 'brush-list' }));
  actions.registerOrReplace('ui.brushLibrary', toggle);
  bus.on('tool', () => { if (panel.classList.contains('on')) render(); });
}
