import { S, MAX_LAYERS } from '../../core/state.js';
import * as bus from '../../core/bus.ts';
import * as actions from '../../core/actions.ts';
import { $, t, toast } from '../../core/dom.js';
import { setTool } from '../../core/tools.js';
import { registerGlobal, registerTool } from '../../core/canvas-handlers.js';
import { markDirty } from '../../core/layer-cache.js';
import { clearTextLayerGrid, textDamageBounds, textLayerBounds,
  updateTextLayerGrid } from '../../core/text-layer.js';
import { rasterizeMatchingText } from '../../core/text-rasterize.js';
import { loadTextPrefs } from '../../core/text-prefs.js';
import { loadFonts, fontById } from '../../core/font-store.js';
import { textLayerName } from '../../logic/text-model.js';
import { fitBoxToEditor } from './box-fit.js';
import { focusEditor, focusEditorAt } from './editor-focus.js';
import { configureFrame, drawFrame, frameHandler } from './frame.js';
import { captureTextLayer, commitTextLayerEdit, restoreTextLayer,
  snapshotTextLayerRemoval } from './history.js';
import { editorText, placeTextEditor, setEditorText } from './editor-view.js';
import { draftTextSource, hitTextLayer, insertTextLayer,
  removeTextLayer, selectTextLayer } from './layer-ops.js';

let edit = null, fonts = [], mounted = false, skipCanvasDown = false, canvasDownWhileEditing = false, seenLayer = S.cur;
const cv = () => $('cv');
const textBtn = () => $('t-text');
const fallbackName = () => t('layer.textName') + ' ' + (S.layerSeq++);
const activeText = () => S.layers[S.cur] && S.layers[S.cur].kind === 'text' ? S.layers[S.cur] : null;
const frameSource = () => (edit ? (edit.layer ? edit.layer.text : edit.source) : activeText()?.text);

async function refreshFonts() { fonts = await loadFonts(); }

function createText(src, fid = null) {
  if (S.layers.length >= MAX_LAYERS) { toast(t('toast.maxLayers')); return null; }
  const layer = insertTextLayer(textLayerName(src.value, fallbackName()), src, fid);
  toast(t('toast.textCreated')); return layer;
}

function hideEditGrid(layer) {
  const bounds = textLayerBounds(layer, S.W, S.H);
  clearTextLayerGrid(layer, S.W, S.H);
  markDirty(S.layers.indexOf(layer), bounds); bus.emit('render');
}
function placeEditor() {
  if (!edit) return;
  const src = edit.layer ? edit.layer.text : edit.source;
  placeTextEditor($('text-editor'), cv(), src, fontById(src.fontId, fonts), S.view);
}

function commitEdit(save = true) {
  if (!edit) return;
  const { layer, original, draft } = edit, ed = $('text-editor');
  const value = editorText(ed);
  const index = layer ? S.layers.indexOf(layer) : -1;
  const before = original?.text || layer?.text;
  if (save && layer && !value.trim()) {
    if (!draft && original) snapshotTextLayerRemoval(layer, original);
    removeTextLayer(layer);
  }
  else if (save && layer) {
    layer.text = { ...layer.text, value }; layer.name = textLayerName(value, layer.name);
    updateTextLayerGrid(layer, S.W, S.H, fonts);
    if (!draft && original) commitTextLayerEdit(layer, index, original);
    markDirty(index, textDamageBounds(before, layer.text, S.W, S.H));
  } else if (save && value.trim()) createText({ ...edit.source, ...loadTextPrefs(), value }, edit.fid);
  else if (!save && edit.draft) removeTextLayer(layer);
  else if (!save && layer && original) {
    const current = layer.text; restoreTextLayer(layer, original);
    markDirty(index, textDamageBounds(current, layer.text, S.W, S.H));
  }
  edit = null; ed.classList.remove('on'); ed.blur(); bus.emit('layers'); bus.emit('render');
}

function commitFromBlur() { if (!edit) return;
  if (canvasDownWhileEditing) { skipCanvasDown = true; setTimeout(() => { skipCanvasDown = false; }, 0); }
  commitEdit(true); exitTextMode(); }
function armCanvasBlurGuard() { canvasDownWhileEditing = !!edit; setTimeout(() => { canvasDownWhileEditing = false; }, 0); }
function exitTextMode() { if (S.tool === 'text') setTool('pencil'); }

function watchLayerActive() {
  const cur = S.cur;
  setTimeout(() => {
    if (cur !== S.cur) return;
    const changed = cur !== seenLayer; seenLayer = cur;
    if (!changed || S.tool !== 'text' || (edit && S.layers[cur] === edit.layer)) return;
    if (edit) commitEdit(true); exitTextMode();
  }, 0);
}

function liveEdit() {
  if (!edit?.layer) return;
  edit.layer.text = { ...edit.layer.text, value: editorText($('text-editor')) };
  edit.layer.name = textLayerName(edit.layer.text.value, edit.layer.name);
  fitBoxToEditor(edit.layer.text, $('text-editor'), S.view.zoom); placeEditor();
  bus.emit('layers'); bus.emit('render');
}

function startEdit(L = activeText(), e = null) {
  if (!L || L.lock) return false;
  if (edit) commitEdit(true);
  edit = { layer: L, original: captureTextLayer(L) }; hideEditGrid(L);
  const ed = setEditorText($('text-editor'), L.text.value || '');
  ed.classList.add('on'); placeEditor(); if (!focusEditorAt(ed, e?.clientX, e?.clientY)) focusEditor(ed, !e); return true;
}

function startDraft(gx, gy) {
  if (edit) commitEdit(true);
  const cur = S.layers[S.cur], ed = setEditorText($('text-editor'), '');
  const source = draftTextSource(loadTextPrefs(), gx, gy), fid = cur ? cur.fid : null;
  edit = { layer: createText(source, fid), source, fid, draft: true };
  if (!edit.layer) { edit = null; return; }
  ed.classList.add('on'); placeEditor(); focusEditor(ed); setTimeout(() => edit && focusEditor(ed), 0);
}

const handler = {
  down({ gx, gy, e }) {
    e?.preventDefault?.();
    canvasDownWhileEditing = false;
    if (skipCanvasDown) { skipCanvasDown = false; return; }
    if (edit) { commitEdit(true); exitTextMode(); return; }
    const i = hitTextLayer(gx, gy);
    if (i >= 0) { selectTextLayer(i); startEdit(S.layers[i], e); return; }
    if (activeText()) { exitTextMode(); return; }
    startDraft(gx, gy);
  },
  hover() { return 'text'; },
};

function activateText() { if (S.tool === 'text') setTool('pencil'); else { seenLayer = S.cur; setTool('text'); actions.run('ui.fontLibrary', true); } }
function syncButton() { const b = textBtn(); if (b) b.classList.toggle('on', S.tool === 'text'); }
function rasterizeAlphaLocked() { rasterizeMatchingText((L) => !!L.alphaLock, { emit: true }); }

export function mount() {
  refreshFonts(); registerTool('text', handler);
  configureFrame({ source: frameSource, layer: () => edit ? edit.layer : activeText(), fonts: () => fonts, place: placeEditor, editing: () => !!edit });
  if (mounted) { syncButton(); return; }
  mounted = true; registerGlobal(frameHandler);
  actions.register('tool.text', activateText);
  actions.register('text.ownsEditHistory', (layer) => edit?.layer === layer);
  actions.register('text.editLayer', (i = S.cur) => { if (S.layers[i]?.kind === 'text') { selectTextLayer(i); return startEdit(S.layers[i]); } return false; });
  textBtn().onclick = activateText;
  bus.on('before-tool-change', () => commitEdit(true));
  bus.on('tool', syncButton); bus.on('render', placeEditor); bus.on('overlay', drawFrame); bus.on('layers', refreshFonts); bus.on('layers', rasterizeAlphaLocked); bus.on('layer-active', watchLayerActive);
  cv().addEventListener('pointerdown', armCanvasBlurGuard, true);
  $('text-editor').addEventListener('blur', commitFromBlur);
  $('text-editor').addEventListener('input', liveEdit);
  $('text-editor').addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.preventDefault(); commitEdit(false); } });
  $('lay-list').addEventListener('dblclick', (e) => { const r = e.target.closest('.lrow[data-li]'); if (r) actions.run('text.editLayer', +r.dataset.li); });
  syncButton();
}
