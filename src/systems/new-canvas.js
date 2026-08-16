import { $ } from '../core/dom.js';
import { commitNumericField, isNumericLiteral, numericFieldValue, setNumericField } from '../core/numeric-field.js';
import * as actions from '../core/actions.js';
import { t } from '../i18n/index.js';
import { MAX_SIZE } from '../config/limits.js';
import { clampRound } from '../logic/math.js';
import { rgb } from '../logic/color.js';
import { newWork } from './gallery/doc.js';
import { hide as hideGallery, show as showGallery } from './gallery/index.js';
import { buildPresetLists } from './new-canvas/list.js';

const STORE = 'customSizes';
const BGS = [{ label: 'new.bgTransparent', color: null }, { label: 'new.bgWhite', color: [255, 255, 255] }, { label: 'new.bgBlack', color: [0, 0, 0] }];
let editIdx = null, linked = false, ratio = 1, bgIdx = 0, mode = 'rgba', nameCustom = false, suppressOutsideClick = false;
const custom = () => { try { return JSON.parse(localStorage.getItem(STORE)) || []; } catch (e) { return []; } };
const saveCustom = (a) => { try { localStorage.setItem(STORE, JSON.stringify(a)); } catch (e) {} };
const dim = (p) => `${p.w} x ${p.h}`;
const clampSize = (v) => clampRound(v, 2, MAX_SIZE);
const panel = () => $('new-ovl')?.querySelector('.new-panel');
const isOpen = () => $('new-ovl')?.classList.contains('on');
const bgColor = () => BGS[bgIdx].color;
const dimValue = (id) => numericFieldValue($(id), 64);
const currentDimName = () => dim({ w: dimValue('new-w'), h: dimValue('new-h') });
const syncName = (force = false) => { if (force || !nameCustom) $('new-name-in').value = currentDimName(); };
const setDim = (id, v) => setNumericField($(id), clampSize(v));

function setMode(next) {
  mode = next;
  $('new-mode-rgba').classList.toggle('on', mode === 'rgba');
  $('new-mode-gray').classList.toggle('on', mode === 'grayscale');
}

function syncBg() {
  const st = BGS[bgIdx], sw = $('new-bg-swatch');
  sw.classList.toggle('transparent', !st.color);
  sw.style.background = st.color ? rgb(st.color) : '';
  $('new-bg-text').textContent = t(st.label);
}

function createDoc(p) {
  $('new-ovl').classList.remove('on');
  hideGallery();
  newWork(p.w, p.h, p.label, bgColor(), mode);
}

function buildLists() { buildPresetLists(custom(), { create: createDoc, edit: editCustom, remove: removeCustom }); }

function setLinked(on) {
  linked = on; $('new-link').classList.toggle('on', on);
  if (on) { const w = dimValue('new-w'), h = dimValue('new-h'); ratio = (w > 0 && h > 0) ? w / h : 1; }
}

function syncRatio(which) {
  if (!linked) return;
  if (which === 'w') { const w = dimValue('new-w'); if (w > 0) setDim('new-h', w / ratio); }
  else { const h = dimValue('new-h'); if (h > 0) setDim('new-w', h * ratio); }
}

function commitDim(which) {
  const id = which === 'w' ? 'new-w' : 'new-h';
  const v = commitNumericField($(id), { min: 2, max: MAX_SIZE, integer: true, relativeMinus: true, fallback: 64 });
  if (v == null) return false;
  syncRatio(which); syncName(); return true;
}

function commitDims() {
  const first = document.activeElement === $('new-h') ? 'h' : 'w';
  commitDim(first); commitDim(first === 'w' ? 'h' : 'w');
}

function readCustom() {
  commitDims();
  const w = dimValue('new-w'), h = dimValue('new-h');
  if (!w || !h || w < 2 || h < 2 || w > MAX_SIZE || h > MAX_SIZE) return null;
  return { w, h, label: ($('new-name-in').value.trim() || dim({ w, h })).slice(0, 24) };
}

function persistPreset(entry) {
  const a = custom();
  if (editIdx != null) a[editIdx] = entry;
  else {
    const old = a.findIndex((p) => p.w === entry.w && p.h === entry.h && p.label === entry.label);
    if (old >= 0) a.splice(old, 1);
    a.unshift(entry);
  }
  saveCustom(a); buildLists(); editIdx = null;
}

function editCustom(i) {
  const c = custom()[i]; if (!c) return;
  editIdx = i; nameCustom = true; $('new-name-in').value = c.label || dim(c); setDim('new-w', c.w); setDim('new-h', c.h); $('new-save').checked = true;
  if (linked) setLinked(true);
  $('new-w').focus(); $('new-w').select();
}

function removeCustom(i) { const a = custom(); a.splice(i, 1); saveCustom(a); buildLists(); }

function createCustom() {
  const entry = readCustom(); if (!entry) return;
  if ($('new-save').checked) persistPreset(entry);
  else editIdx = null;
  createDoc(entry);
}

function closeDlg() { editIdx = null; $('new-ovl').classList.remove('on'); }

function openDlg(ensureGallery = true) {
  if (ensureGallery) showGallery();
  syncName();
  buildLists(); syncBg(); setMode(mode);
  const ovl = $('new-ovl'); ovl.dataset.openedAt = Date.now(); ovl.classList.add('on');
}

function closeOutside(e) {
  if (!isOpen()) return;
  const target = e.target, p = panel(), r = p?.getBoundingClientRect();
  const inPanel = r && e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
  if (p?.contains(target) || inPanel || target.closest?.('#rowctx') || target.closest?.('#gal-new') || target.closest?.('#new')) return;
  suppressOutsideClick = true; e.preventDefault(); e.stopPropagation(); closeDlg();
}

function bindOpen(el, ensureGallery) {
  if (!el) return; let suppressClick = 0;
  el.onclick = (e) => { if (Date.now() < suppressClick) { e.preventDefault(); return; } isOpen() ? closeDlg() : openDlg(ensureGallery); };
  el.addEventListener('touchend', (e) => {
    e.preventDefault(); suppressClick = Date.now() + 500; setTimeout(() => { isOpen() ? closeDlg() : openDlg(ensureGallery); }, 0);
  }, { passive: false });
}

export function mount() {
  setDim('new-w', 64); setDim('new-h', 64);
  bindOpen($('new'), true); bindOpen($('gal-new'), false);
  actions.register('doc.new', () => openDlg(true));
  $('new-create').onclick = createCustom;
  $('new-link').onclick = () => setLinked(!linked);
  $('new-bg').onclick = () => { bgIdx = (bgIdx + 1) % BGS.length; syncBg(); };
  $('new-mode-rgba').onclick = () => setMode('rgba');
  $('new-mode-gray').onclick = () => setMode('grayscale');
  for (const [id, which] of [['new-w', 'w'], ['new-h', 'h']]) {
    $(id).addEventListener('input', () => { if (isNumericLiteral($(id).value)) { syncRatio(which); syncName(); } });
    $(id).addEventListener('blur', () => commitDim(which));
  }
  $('new-name-in').addEventListener('input', () => { nameCustom = $('new-name-in').value.trim() !== ''; if (!nameCustom) syncName(true); });
  ['new-w', 'new-h'].forEach((id) => $(id).addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); commitDim(id === 'new-w' ? 'w' : 'h'); createCustom(); } }));
  $('new-name-in').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); createCustom(); } });
  document.addEventListener('pointerdown', closeOutside, true);
  document.addEventListener('click', (e) => {
    if (suppressOutsideClick) { suppressOutsideClick = false; e.preventDefault(); e.stopPropagation(); return; }
    closeOutside(e);
  }, true);
  syncBg(); setMode('rgba');
}
