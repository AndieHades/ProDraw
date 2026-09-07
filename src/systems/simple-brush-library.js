// Панель библиотеки кистей: встроенные формы, пресеты и пользовательские копии.
import { S } from '../core/state.ts';
import * as actions from '../core/actions.ts';
import * as bus from '../core/bus.ts';
import { $, t, toast } from '../core/shell.ts';
import { ensurePresetBrush, presetBrush, presetBrushCatalog, presetIdOf,
  presetShapeId } from './draw/preset-brush.ts';
import { brushTile, panelInk } from './draw/brush-tile.ts';
import { addUserBrush, removeUserBrush, userBrush, userBrushes, userIdOf,
  userShapeId } from './draw/brush-library-store.ts';

const SHAPES = [{ id: 'round', key: 'brush.round' }, { id: 'square', key: 'brush.square' }];
const ICONS = {
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  duplicate: '<rect x="8.5" y="8.5" width="11" height="11" rx="2"/><path d="M15.5 5.5h-11v11"/>',
  remove: '<path d="M5.5 7.5h13M10 7.5V5.5h4v2M7.5 7.5l1 12h7l1-12"/>',
};
const storeKey = 'simpleBrushShapes';
const activeTool = () => S.tool === 'eraser' ? 'eraser' : 'pencil';
const toolSize = () => activeTool() === 'eraser' ? S.eraserSize : S.pencilSize;
const selected = () => S.brushShape[activeTool()];

function save() { try { localStorage.setItem(storeKey, JSON.stringify(S.brushShape)); } catch {} }

let presets = [];

function choose(shape) {
  const tool = activeTool(); S.brushShape[tool] = shape;
  const copy = userBrush(userIdOf(shape));
  if (copy) { // копия несёт свои размер и непрозрачность
    if (tool === 'eraser') S.eraserSize = copy.size; else S.pencilSize = copy.size;
    S.brushOpacity[tool] = copy.opacity;
  }
  save(); render(); bus.emit('tool'); bus.emit('render');
}

// Пресет выбирается только после успешной загрузки: пока кисть декодируется
// или если она не загрузилась, инструмент остаётся на прежней форме.
async function choosePreset(shape) {
  const id = presetIdOf(shape); if (!id) return;
  const brush = await ensurePresetBrush(id,
    (name) => toast(t('toast.brushLoadFailed', { name })));
  if (brush) choose(shape);
}

const presetName = (id) => presets.find((preset) => preset.id === id)?.name ?? id;

function duplicate() {
  const shape = selected(), source = presetIdOf(shape);
  if (!source) { toast(t('toast.brushCopyShape')); return; }
  const base = userBrush(userIdOf(shape))?.name ?? presetName(source);
  const copy = addUserBrush({ source, name: t('brush.copyName', { name: base }),
    size: toolSize(), opacity: S.brushOpacity[activeTool()] });
  choose(userShapeId(copy.id));
}

// Встроенные пресеты поставляются с приложением: удалить можно только копию.
function remove() {
  const id = userIdOf(selected());
  if (!id) { toast(t('toast.brushBuiltin')); return; }
  removeUserBrush(id); choose('round');
}

function libraryTile(shape, label, ink, current) {
  return brushTile({ key: shape, label, ink, selected: current === shape,
    brush: presetBrush(presetIdOf(shape)), choose: () => void choosePreset(shape) });
}

function render() {
  const list = $('brush-list'); if (!list) return;
  const ink = panelInk(), current = selected();
  list.replaceChildren(
    ...SHAPES.map((shape) => brushTile({ key: shape.id, label: t(shape.key), ink,
      selected: current === shape.id, square: shape.id === 'square',
      choose: () => choose(shape.id) })),
    ...presets.map((preset) => libraryTile(presetShapeId(preset.id), preset.name, ink, current)),
    ...userBrushes().map((copy) => libraryTile(userShapeId(copy.id), copy.name, ink, current)));
  const trash = $('brush-del'); if (trash) trash.disabled = !userIdOf(current);
}

// Превью читает декодированную кисть, поэтому библиотека декодируется при
// первом открытии панели — иначе все пресеты выглядели бы одинаково.
async function loadPresets() {
  if (presets.length) return;
  presets = await presetBrushCatalog(); render();
  await Promise.all(presets.map((preset) => ensurePresetBrush(preset.id)));
  render();
}

function iconButton(id, key, icon, run) {
  const button = document.createElement('button');
  button.id = id; button.title = t(key); button.dataset.i18nTitle = key;
  button.innerHTML = `<svg viewBox="0 0 24 24">${icon}</svg>`;
  button.onclick = run; return button;
}

// Шапка и отступы повторяют панель палитры: одна и та же оболочка окна.
function build(panel) {
  const head = document.createElement('div'); head.className = 'pop-head';
  const title = document.createElement('span');
  title.className = 'pop-title'; title.textContent = t('brush.library');
  const acts = document.createElement('span'); acts.className = 'pop-acts';
  const close = iconButton('brush-x', 'btn.close', ICONS.close,
    () => panel.classList.remove('on'));
  close.classList.add('win-x'); acts.append(close); head.append(title, acts);
  const body = document.createElement('div'); body.id = 'brush-body';
  const list = document.createElement('div'); list.id = 'brush-list';
  const bar = document.createElement('div');
  bar.id = 'brush-act'; bar.className = 'lay-act';
  bar.append(iconButton('brush-dup', 'brush.duplicate', ICONS.duplicate, duplicate),
    iconButton('brush-del', 'brush.delete', ICONS.remove, remove));
  body.append(list, bar); panel.replaceChildren(head, body);
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
  build(panel);
  actions.registerOrReplace('ui.brushLibrary', toggle);
  bus.on('tool', () => { if (panel.classList.contains('on')) render(); });
  bus.on('locale', () => { build(panel); render(); });
}
