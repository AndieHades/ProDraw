import { S, MAX_LAYERS, blank } from '../../core/state.js';
import * as bus from '../../core/bus.js';
import * as actions from '../../core/actions.js';
import { $, t, toast } from '../../core/dom.js';
import { setTool } from '../../core/tools.js';
import { registerGlobal, registerTool } from '../../core/canvas-handlers.js';
import { snapshot } from '../../core/history.js';
import { markDirty, dirtyAll } from '../../core/layer-cache.js';
import { makeTextLayer, updateTextLayerGrid } from '../../core/text-layer.js';
import { rasterizeMatchingText } from '../../core/text-rasterize.js';
import { loadTextPrefs } from '../../core/text-prefs.js';
import { loadFonts, fontById } from '../../core/font-store.js';
import { TEXT_BOX } from '../../config/text.js';
import { cloneTextSource, normalizeTextSource, textLayerName } from '../../logic/text-model.js';
import { lineAdvance } from '../../logic/text-layout.js';
import { fitBoxToEditor } from './box-fit.js';
import { focusEditor, focusEditorAt } from './editor-focus.js';
import { configureFrame, drawFrame, frameHandler } from './frame.js';

let edit = null, fonts = [], mounted = false, skipCanvasDown = false, canvasDownWhileEditing = false, seenLayer = S.cur;
const cv = () => $('cv');
const textBtn = () => $('t-text');
const fallbackName = () => t('layer.textName') + ' ' + (S.layerSeq++);
const activeText = () => S.layers[S.cur] && S.layers[S.cur].kind === 'text' ? S.layers[S.cur] : null;
const frameSource = () => (edit ? (edit.layer ? edit.layer.text : edit.source) : activeText()?.text);

async function refreshFonts() { fonts = await loadFonts(); }

function hitText(gx, gy) {
  for (let i = S.layers.length - 1; i >= 0; i--) {
    const L = S.layers[i], b = L && L.text && L.text.box;
    if (L && L.kind === 'text' && L.visible !== false && b && gx >= b.x && gy >= b.y && gx < b.x + b.w && gy < b.y + b.h) return i;
  }
  return -1;
}

function selectLayer(i) {
  S.cur = i; S.bgSel = false; S.marked.clear(); S.markedFolders.clear(); S.selFolder = null; S.fxSel.clear(); S.fxCur = null;
  bus.emit('layers');
}

function createText(src, fid = null) {
  if (S.layers.length >= MAX_LAYERS) { toast(t('toast.maxLayers')); return null; }
  snapshot();
  const L = makeTextLayer(textLayerName(src.value, fallbackName()), S.W, S.H, src, src.box);
  const cur = S.layers[S.cur]; L.fid = fid ?? (cur ? cur.fid : null);
  const at = cur ? S.cur + 1 : S.layers.length;
  S.layers.splice(at, 0, L); selectLayer(at); dirtyAll(); bus.emitDoc(); toast(t('toast.textCreated'));
  return L;
}

function removeLayer(layer) {
  const idx = S.layers.indexOf(layer);
  if (idx < 0) return;
  S.layers.splice(idx, 1); S.marked.clear(); dirtyAll();
  if (S.layers.length) { S.cur = Math.max(0, Math.min(idx, S.layers.length - 1)); S.bgSel = false; } else { S.cur = 0; S.bgSel = true; }
}

function editorText() { const ed = $('text-editor'); return (ed.innerText ?? ed.textContent).replace(/\n$/, ''); }
function setEditorText(value) { const ed = $('text-editor'); ed.textContent = value; ed.innerText = value; return ed; }
function hideEditGrid(layer) { layer.grid = blank(S.W, S.H); layer.ext = new Map(); markDirty(S.layers.indexOf(layer)); bus.emit('render'); }
function draftSource(gx, gy) {
  return normalizeTextSource({ ...loadTextPrefs(), value: '', box: { ...TEXT_BOX, x: gx, y: gy } });
}
function placeEditor() {
  if (!edit) return;
  const src = edit.layer ? edit.layer.text : edit.source, ed = $('text-editor'), r = cv().getBoundingClientRect(), z = S.view.zoom, b = src.box;
  const tr = src.transform, f = fontById(src.fontId, fonts);
  ed.style.left = r.left + S.view.ox + (b.x + b.w / 2 + tr.x) * z + 'px';
  ed.style.top = r.top + S.view.oy + (b.y + b.h / 2 + tr.y) * z + 'px';
  ed.style.width = Math.max(24, b.w * z) + 'px';
  ed.style.minHeight = Math.max(18, b.h * z) + 'px';
  ed.style.fontSize = Math.max(10, src.size * z) + 'px';
  ed.style.lineHeight = Math.max(12, lineAdvance(src) * z) + 'px';
  ed.style.fontFamily = f.family; ed.style.color = src.color;
  ed.style.letterSpacing = src.letterSpacing * z + 'px';
  ed.style.textAlign = src.align;
  ed.style.textTransform = src.uppercase ? 'uppercase' : 'none';
  ed.style.transform = `translate(-50%, -50%) rotate(${tr.rotation}rad) scale(${tr.scaleX}, ${tr.scaleY})`;
}

function commitEdit(save = true) {
  if (!edit) return;
  const { layer, original } = edit, ed = $('text-editor');
  const value = editorText();
  if (save && layer && !value.trim()) removeLayer(layer);
  else if (save && layer) {
    layer.text.value = value; layer.name = textLayerName(value, layer.name);
    updateTextLayerGrid(layer, S.W, S.H, fonts); markDirty(S.layers.indexOf(layer));
  } else if (save && value.trim()) createText({ ...edit.source, ...loadTextPrefs(), value }, edit.fid);
  else if (!save && edit.draft) removeLayer(layer);
  else if (!save && layer) { layer.text = original; updateTextLayerGrid(layer, S.W, S.H, fonts); markDirty(S.layers.indexOf(layer)); }
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
  edit.layer.text.value = editorText(); edit.layer.name = textLayerName(edit.layer.text.value, edit.layer.name);
  fitBoxToEditor(edit.layer.text, $('text-editor'), S.view.zoom); placeEditor();
  bus.emit('layers'); bus.emit('render');
}

function startEdit(L = activeText(), e = null) {
  if (!L || L.lock) return false;
  if (edit) commitEdit(true);
  snapshot(); edit = { layer: L, original: cloneTextSource(L.text) }; hideEditGrid(L);
  const ed = setEditorText(L.text.value || '');
  ed.classList.add('on'); placeEditor(); if (!focusEditorAt(ed, e?.clientX, e?.clientY)) focusEditor(ed, !e); return true;
}

function startDraft(gx, gy) {
  if (edit) commitEdit(true);
  const cur = S.layers[S.cur], ed = setEditorText(''), source = draftSource(gx, gy), fid = cur ? cur.fid : null;
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
    const i = hitText(gx, gy);
    if (i >= 0) { selectLayer(i); startEdit(S.layers[i], e); return; }
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
  actions.register('text.editLayer', (i = S.cur) => { if (S.layers[i]?.kind === 'text') { selectLayer(i); return startEdit(S.layers[i]); } return false; });
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
