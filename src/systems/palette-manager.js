// Менеджер палитр: сохранить текущую, загрузить, собрать из изображения.
import { S } from '../core/state.js';
import * as bus from '../core/bus.js';
import { $, showMenuAt, toast, t } from '../core/dom.js';
import { createLibraryDialog } from '../core/library-dialog.js';
import { compositeAt, contentRevision } from '../core/layer-cache.js';
import { PaletteCompositeCache } from '../core/palette-composite-cache.js';
import { paletteFromCanvasSource, paletteFromImageData,
  paletteFromImageSource, paletteFromPointSource } from '../core/palette-sampling.js';
import { rgb, eqc } from '../logic/color.js';
import { sortPalette } from '../logic/palette-sort.js';
import { defaultPalette } from '../config/palette.js';
import { CANVAS_PALETTE_LIMIT, FILE_PALETTE_LIMIT,
  PALETTE_EXACT_LIMIT } from '../config/palette-sampling.js';
import { initPaletteCreateChoice, refreshPaletteCreateChoice } from './palette-create-choice.js';
import { allFolderPalettes, deletePaletteFromFolder, isPaletteImageFile, savePaletteToFolder } from '../core/palette-files.js';

const STORE = 'palettes';
const palStore = () => { try { return JSON.parse(localStorage.getItem(STORE)) || {}; } catch (e) { return {}; } };
const saveStore = (o) => { try { localStorage.setItem(STORE, JSON.stringify(o)); } catch (e) {} };
const isImageFile = isPaletteImageFile;
const hasFileTransfer = (dt) => dt && Array.from(dt.types || []).includes('Files');
let dlg = null, folderCache = [];
const compositeCache = new PaletteCompositeCache();
bus.on('composite-ready', (source) => compositeCache.accept(source, S, contentRevision()));

function dialog() { if (dlg) return dlg;
  dlg = createLibraryDialog({ overlayId: 'pal-ovl', sheetId: 'pal-sheet', titleKey: 'dialog.palettes',
    nameId: 'pal-name', saveId: 'pal-save', saveRowId: 'pal-save-row', listId: 'pal-list',
    placeholderKey: 'palette.namePlaceholder', nameMax: 20 });
  return dlg; }

function cleanPalette(arr) { const seen = new Set(), out = [];
  for (const c of arr || []) { if (!c) continue; const k = c[0] + ',' + c[1] + ',' + c[2];
    if (!seen.has(k)) { seen.add(k); out.push([c[0], c[1], c[2]]); } }
  return out;
}

function defaultPaletteName(st = palStore()) {
  const used = new Set(Object.keys(st));
  for (let i = 1; ; i++) {
    const name = t('palette.defaultName', { n: String(i).padStart(2, '0') });
    if (!used.has(name)) return name.slice(0, 20);
  }
}

const builtInPalettes = () => [{ name: t('palette.apollo'), colors: defaultPalette(), removable: false }, ...folderCache];
function refreshFolderCache() { allFolderPalettes().then((p) => { folderCache = p; if (dlg) palListUI(); }); }

function loadPalette(arr, name) { S.palette = cleanPalette(arr); if (S.palette.length) S.active = S.palette[0].slice();
  bus.emit('palette'); bus.emit('render'); dialog().close(); if (name) toast(t('toast.paletteLoaded', { name })); }
function replaceFromImage(pal) { loadPalette(pal); toast(t('toast.paletteFromImg', { n: pal.length })); }
function addFromImage(pal) { let n = 0;
  for (const c of pal) if (!S.palette.some((p) => eqc(p, c))) { S.palette.push(c.slice()); n++; }
  bus.emit('palette'); bus.emit('render'); toast(t('toast.tsgAdded', { n }));
}

function paletteEntries(st) { const byName = new Map();
  for (const p of builtInPalettes()) byName.set(p.name, p);
  for (const [nm, colors] of Object.entries(st)) { const p = byName.get(nm);
    byName.set(nm, p && p.folder ? { ...p, removable: true } : { name: nm, colors, removable: true }); }
  return [...byName.values()]; }
function removePaletteEntry(entry) { const s2 = palStore(); delete s2[entry.name]; saveStore(s2);
  deletePaletteFromFolder(entry.fileName || entry.name).then(refreshFolderCache); palListUI(); }
function appendPaletteRow(box, entry) { const row = document.createElement('div'), nm = entry.name, pal = entry.colors; row.className = 'prow';
    const head = document.createElement('div'); head.className = 'prow-top'; // имя сверху + удаление
    const name = document.createElement('span'); name.className = 'pname'; name.textContent = nm;
    const del = document.createElement('button'); del.className = 'prow-del'; del.title = t('gallery.delete');
    del.innerHTML = '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>';
    del.onclick = (e) => { e.stopPropagation(); removePaletteEntry(entry); };
    head.append(name); if (entry.removable) head.append(del);
    const sw = document.createElement('div'); sw.className = 'pswatches'; sw.title = t('btn.addPalette'); // вся палитра целиком, квадраты как в #pal; клик — загрузить
    pal.forEach((c) => { const i = document.createElement('i'); i.style.background = rgb(c); sw.appendChild(i); });
    sw.onclick = () => loadPalette(pal, nm);
    row.append(head, sw); box.appendChild(row); }
function palListUI() { const box = dialog().list; box.innerHTML = '';
  const entries = paletteEntries(palStore());
  if (!entries.length) { box.innerHTML = '<p class="hint" style="margin:10px 2px">' + t('palette.none') + '</p>'; return; }
  for (const p of entries) appendPaletteRow(box, p); }

export { paletteFromImageData };
export function paletteFromCanvas(options = {}) {
  const source = compositeCache.current(S, contentRevision());
  const result = source
    ? paletteFromCanvasSource(source.canvas, S.W, S.H,
      { ...options, limit: CANVAS_PALETTE_LIMIT, smoothing: false })
    : paletteFromPointSource(S.W, S.H, compositeAt,
      { ...options, limit: CANVAS_PALETTE_LIMIT });
  return result.cancelled ? [] : sortPalette(result.colors);
}

function showDropChoice(pal, pt) {
  const m = $('rowctx'); m.innerHTML = '';
  const head = document.createElement('div'); head.className = 'cctx-head'; head.textContent = t('palette.dropTitle', { n: pal.length });
  const add = document.createElement('button'); add.textContent = t('palette.dropAdd');
  const create = document.createElement('button'); create.textContent = t('palette.dropNew');
  add.onclick = () => { m.classList.remove('on'); addFromImage(pal); };
  create.onclick = () => { m.classList.remove('on'); replaceFromImage(pal); };
  m.append(head, add, create); showMenuAt(m, pt.x, pt.y, true);
}

export function paletteFromImageFile(file, mode = 'replace', pt = null, limit = PALETTE_EXACT_LIMIT) {
  if (!isImageFile(file)) { toast(t('toast.notImage')); return; }
  const url = URL.createObjectURL(file), im = new Image();
  im.onerror = () => { URL.revokeObjectURL(url); toast(t('toast.imgOpenFail')); };
  im.onload = () => { URL.revokeObjectURL(url);
    const pal = paletteFromImageSource(im, limit); if (!pal.length) { toast(t('toast.imgEmpty')); return; }
    if (mode === 'ask') showDropChoice(pal, pt || { x: innerWidth / 2, y: innerHeight / 2 }); else replaceFromImage(pal); };
  im.src = url;
}

function dropPalette(e) {
  if (e.dataTransfer && e.dataTransfer.files.length) { e.preventDefault(); e.stopPropagation(); }
  const f = e.dataTransfer && [...e.dataTransfer.files].find(isImageFile);
  if (!f) { if (e.dataTransfer && e.dataTransfer.files.length) toast(t('toast.notImage')); return; }
  paletteFromImageFile(f, 'ask', { x: e.clientX, y: e.clientY });
}

function openPaletteWindow() { const d = dialog(); d.name.value = defaultPaletteName(); palListUI(); d.setSaveVisible(true); d.open(); }
function openPresetMenu() { const d = dialog(); d.name.value = ''; palListUI(); d.setSaveVisible(false); d.open(); }
function newPalette() { S.palette = []; bus.emit('palette'); bus.emit('render'); toast(t('palette.new')); }
function createFromCanvas() { const pal = paletteFromCanvas();
  if (!pal.length) { toast(t('toast.canvasEmpty')); return; }
  loadPalette(pal); toast(t('toast.paletteFromCanvas', { n: pal.length }));
}

export function mount() {
  dialog();
  const palImg = document.createElement('input'); palImg.type = 'file'; palImg.accept = 'image/*';
  palImg.onchange = (e) => { const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    paletteFromImageFile(f, 'replace', null, FILE_PALETTE_LIMIT); };
  initPaletteCreateChoice({ blank: newPalette, image: () => palImg.click(), canvas: createFromCanvas });
  $('pal-save-open').onclick = openPaletteWindow;
  $('pal-presets').onclick = openPresetMenu;
  dialog().save.onclick = () => { if (!S.palette.length) { toast(t('toast.paletteEmpty')); return; }
    const s2 = palStore(), nm = (dialog().name.value.trim() || defaultPaletteName(s2)).slice(0, 20);
    s2[nm] = S.palette.map((c) => [c[0], c[1], c[2]]); saveStore(s2); savePaletteToFolder(nm, S.palette).then(refreshFolderCache);
    dialog().name.value = defaultPaletteName(s2); palListUI(); toast(t('toast.paletteSaved', { name: nm })); };
  bus.on('locale', () => { dialog().refresh(); palListUI(); refreshPaletteCreateChoice(); });
  const stopPaletteDrag = (e) => { if (hasFileTransfer(e.dataTransfer)) { e.preventDefault(); e.stopPropagation(); } };
  $('palbar').addEventListener('dragenter', stopPaletteDrag);
  $('palbar').addEventListener('dragover', stopPaletteDrag);
  $('palbar').addEventListener('drop', dropPalette);
  refreshFolderCache();
}
