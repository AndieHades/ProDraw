import { S } from '../core/state.js';
import * as actions from '../core/actions.ts';
import * as bus from '../core/bus.ts';
import { $, t, toast } from '../ui/dom/ShellDom.ts';
import { ensurePresetBrush, presetBrushCatalog, presetIdOf,
  presetShapeId } from './draw/preset-brush.ts';

const SHAPES = [
  { id: 'round', key: 'brush.round', icon: '●' },
  { id: 'square', key: 'brush.square', icon: '■' },
];
const storeKey = 'simpleBrushShapes';
const activeTool = () => S.tool === 'eraser' ? 'eraser' : 'pencil';

function save() {
  localStorage.setItem(storeKey, JSON.stringify(S.brushShape));
}

let presets = [];

function tile(id, label, icon, select) {
  const button = document.createElement('button'); button.className = 'btile';
  button.classList.toggle('on', S.brushShape[activeTool()] === id);
  button.title = label; button.textContent = icon;
  button.onclick = select; return button;
}

function choose(id) {
  S.brushShape[activeTool()] = id; save(); render(); bus.emit('render');
}

// Пресет выбирается только после успешной загрузки: пока кисть декодируется
// или если она не загрузилась, инструмент остаётся на прежней форме.
async function choosePreset(preset) {
  const brush = await ensurePresetBrush(preset.id,
    (name) => toast(t('toast.brushLoadFailed', { name })));
  if (brush) choose(presetShapeId(preset.id));
}

function render() {
  const list = $('brush-list'); if (!list) return;
  list.replaceChildren(
    ...SHAPES.map((shape) => tile(shape.id, t(shape.key), shape.icon,
      () => choose(shape.id))),
    ...presets.map((preset) => tile(presetShapeId(preset.id), preset.name,
      preset.name.slice(0, 1), () => void choosePreset(preset))));
}

async function loadPresets() {
  if (presets.length) return;
  presets = await presetBrushCatalog();
  if (presets.length) render();
}

function toggle() {
  const panel = $('brush-pop'); panel.classList.toggle('on');
  if (panel.classList.contains('on')) { render(); void loadPresets(); }
}

// Сохранённый пресет нужно декодировать при запуске: иначе инструмент молча
// рисовал бы твёрдым отпечатком, хотя в панели выбрана кисть.
export async function restoreSelectedPresets() {
  const ids = [...new Set(Object.values(S.brushShape).map(presetIdOf))];
  for (const id of ids) {
    if (!id) continue;
    const brush = await ensurePresetBrush(id,
      (name) => toast(t('toast.brushLoadFailed', { name })));
    if (!brush) {
      for (const tool of Object.keys(S.brushShape)) {
        if (presetIdOf(S.brushShape[tool]) === id) S.brushShape[tool] = 'round';
      }
      save();
    }
  }
  bus.emit('render');
}

export function mount() {
  try { Object.assign(S.brushShape, JSON.parse(localStorage.getItem(storeKey) || '{}')); } catch {}
  void restoreSelectedPresets();
  const panel = $('brush-pop'); if (!panel) return;
  panel.replaceChildren(Object.assign(document.createElement('div'), { id: 'brush-list' }));
  actions.registerOrReplace('ui.brushLibrary', toggle);
  bus.on('tool', () => { if (panel.classList.contains('on')) render(); });
}
