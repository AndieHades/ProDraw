import { S } from '../../core/state.js';
import * as bus from '../../core/bus.js';
import * as actions from '../../core/actions.js';
import { $, showMenuAt, t, toast } from '../../core/dom.js';
import { floatingWindow } from '../../core/floating-window.js';
import { snapshot } from '../../core/history.js';
import { makeCanvas } from '../../core/canvas.js';
import { markDirty } from '../../core/layer-cache.js';
import { updateTextLayerGrid } from '../../core/text-layer.js';
import { loadFonts, fontById, importFontFile, renameFont, deleteFont } from '../../core/font-store.js';
import { loadTextPrefs, saveTextPrefs } from '../../core/text-prefs.js';
import { TEXT_IMPORT, TEXT_LETTER_SPACING, TEXT_LINE_SPACING, TEXT_SIZE, TEXT_STRETCH } from '../../config/text.js';
import { rgbToHex } from '../../logic/color.js';
import { clamp } from '../../logic/math.js';
import { maxLineWidth } from '../../logic/text-layout.js';

let fonts = [], prefs = loadTextPrefs(), menuFont = null, live = null;
const activeText = () => S.layers[S.cur] && S.layers[S.cur].kind === 'text' ? S.layers[S.cur] : null;
const current = () => activeText()?.text || prefs;
const opened = () => $('font-pop').classList.contains('on');
const activeHex = () => rgbToHex(S.active).toLowerCase();

function syncPrefsColorFromActive() {
  if (!activeText()) prefs = saveTextPrefs({ ...prefs, color: activeHex() });
}

function applyPatch(patch, hist = true) {
  const L = activeText();
  prefs = saveTextPrefs({ ...prefs, ...patch });
  if (L) {
    if (hist) snapshot();
    L.text = { ...L.text, ...patch };
    updateTextLayerGrid(L, S.W, S.H, fonts); markDirty(S.cur);
    bus.emit('layers'); bus.emit('render');
  }
  syncControls(); renderFonts();
}

function applyTextPatch(patch) {
  const L = activeText(); if (!L) return;
  snapshot(); L.text = { ...L.text, ...patch };
  updateTextLayerGrid(L, S.W, S.H, fonts); markDirty(S.cur);
  bus.emit('layers'); bus.emit('render'); syncControls();
}

function textWidth(src) {
  const ctx = makeCanvas(1, 1).getContext('2d'), f = fontById(src.fontId, fonts);
  ctx.font = `${src.size}px ${f.family}`;
  return maxLineWidth(src, (line) => ctx.measureText(line).width);
}

function stretchText() {
  const L = activeText(); if (!L) return;
  const sx = clamp(L.text.box.w / textWidth(L.text), TEXT_STRETCH.minScale, TEXT_STRETCH.maxScale);
  applyTextPatch({ transform: { ...L.text.transform, scaleX: sx } });
}

function syncRange(id, value, conf) {
  $(id).min = conf.min; $(id).max = conf.max; $(id).step = conf.step; $(id).value = value;
  $(id + 'v').textContent = value + ' px';
}

function syncControls() {
  const src = current(), L = activeText();
  syncRange('font-size', src.size, TEXT_SIZE);
  syncRange('font-letter', src.letterSpacing, TEXT_LETTER_SPACING);
  syncRange('font-line', src.lineSpacing, TEXT_LINE_SPACING);
  $('font-color').style.background = src.color;
  for (const b of document.querySelectorAll('.font-tools button:not(#font-color)')) b.disabled = !L;
  for (const b of document.querySelectorAll('.font-tools button[data-align]')) b.classList.toggle('on', !!L && L.text.align === b.dataset.align);
  const upper = $('font-upper');
  if (upper) {
    upper.disabled = !L;
    upper.classList.toggle('on', !!L && L.text.uppercase);
  }
}

function tile(f) {
  const b = document.createElement('button'); b.className = 'ftile'; b.dataset.id = f.id; b.title = f.name;
  b.setAttribute('aria-label', f.name);
  b.classList.toggle('on', current().fontId === f.id);
  const mark = document.createElement('b'); mark.textContent = 'Ta'; mark.style.fontFamily = f.family;
  b.append(mark);
  b.onclick = () => applyPatch({ fontId: f.id });
  b.oncontextmenu = (e) => { e.preventDefault(); if (f.builtin || f.folder) return; menuFont = f; showMenuAt($('font-menu'), e.clientX, e.clientY, true); };
  return b;
}

function renderFonts() {
  const box = $('font-list'); if (!box) return; box.innerHTML = '';
  fonts.forEach((f) => box.appendChild(tile(f)));
}

async function refresh() {
  fonts = await loadFonts(); syncControls(); renderFonts();
}

function pickFont() {
  const i = document.createElement('input'); i.type = 'file'; i.accept = TEXT_IMPORT.accept; i.multiple = true;
  i.onchange = async (e) => {
    const list = [...e.target.files]; e.target.value = '';
    for (const f of list) try { await importFontFile(f); toast(t('toast.fontImported', { name: f.name })); } catch (err) { toast(t('toast.fontImportFail')); }
    refresh();
  };
  i.click();
}

function menuAct(act) {
  const f = menuFont; $('font-menu').classList.remove('on'); if (!f) return;
  if (act === 'delete') deleteFont(f.id).then(refresh);
  if (act === 'rename') {
    const next = window.prompt(t('font.rename'), f.name);
    if (next) renameFont(f.id, next).then(refresh);
  }
}

function setColor(hex) { applyPatch({ color: hex }, false); }
function openColor() { snapshot(); actions.run('color.for', current().color, setColor); }
function syncOpenColor() {
  if (activeText() && $('colpop').classList.contains('on') && !$('fx-edit').classList.contains('on')) actions.run('color.for', current().color, setColor);
}

function open(force = false) {
  const pop = $('font-pop'), show = force || !pop.classList.contains('on');
  pop.classList.toggle('on', show);
  if (show) syncPrefsColorFromActive();
  refresh();
}

function bindRange(id, key) {
  $(id).addEventListener('pointerdown', () => { live = null; });
  $(id).addEventListener('input', () => {
    if (activeText() && live !== id) { snapshot(); live = id; }
    applyPatch({ [key]: +$(id).value }, false);
  });
  $(id).addEventListener('change', () => { live = null; });
}

export function mount() {
  floatingWindow($('font-pop'), { grip: $('font-head'), handle: $('font-rsz'), storeKey: 'fontwin', minW: 250, minH: 180,
    onClose: () => $('font-pop').classList.remove('on') });
  $('font-add').onclick = pickFont;
  bindRange('font-size', 'size');
  bindRange('font-letter', 'letterSpacing');
  bindRange('font-line', 'lineSpacing');
  $('font-color').onclick = openColor;
  $('font-upper').onclick = () => { const L = activeText(); if (L) applyTextPatch({ uppercase: !L.text.uppercase }); };
  for (const b of document.querySelectorAll('.font-tools button[data-align]')) b.onclick = () => applyTextPatch({ align: b.dataset.align });
  $('font-stretch').onclick = stretchText;
  $('font-menu').onclick = (e) => { const b = e.target.closest('button'); if (b) menuAct(b.dataset.act); };
  $('font-pop').addEventListener('dragover', (e) => { e.preventDefault(); });
  $('font-pop').addEventListener('drop', async (e) => { e.preventDefault(); for (const f of e.dataTransfer.files) try { await importFontFile(f); } catch (err) {} refresh(); });
  bus.on('layer-active', () => { if (opened()) { syncPrefsColorFromActive(); syncControls(); renderFonts(); syncOpenColor(); } });
  bus.on('palette', () => { if (opened()) { syncPrefsColorFromActive(); syncControls(); } });
  bus.on('locale', () => { if (opened()) renderFonts(); });
  actions.register('ui.fontLibrary', open);
  actions.register('text.applyPrefs', applyPatch);
  refresh();
}
