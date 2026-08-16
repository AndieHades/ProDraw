// Менеджер палитр: сохранить текущую, загрузить, собрать из изображения.
import { S } from '../core/state.js';
import * as bus from '../core/bus.js';
import { $, showMenuAt, toast, t } from '../core/dom.js';
import { createLibraryDialog } from '../core/library-dialog.js';
import { paintStack } from '../core/composite.js';
import { compositeAt } from '../core/layer-cache.js';
import { makeCanvas } from '../core/canvas.js';
import { rgb, eqc } from '../logic/color.js';
import { exactPaletteFromRgba, samplesFromRgba, sourcePaletteFromSamples } from '../logic/quantize.js';
import { sortPalette } from '../logic/palette-sort.js';
import { defaultPalette } from '../config/palette.js';
import { initPaletteCreateChoice, refreshPaletteCreateChoice } from './palette-create-choice.js';
import { allFolderPalettes, deletePaletteFromFolder, isPaletteImageFile, savePaletteToFolder } from '../core/palette-files.js';

const STORE = 'palettes';
const EXACT_LIMIT = 512, EXACT_MAX_PIXELS = 2_000_000, SAMPLE_MAX_SIDE = 220, QUANT_COLORS = 64;
const FILE_PALETTE_LIMIT = 128, CANVAS_PALETTE_LIMIT = 48;
const palStore = () => { try { return JSON.parse(localStorage.getItem(STORE)) || {}; } catch (e) { return {}; } };
const saveStore = (o) => { try { localStorage.setItem(STORE, JSON.stringify(o)); } catch (e) {} };
const isImageFile = isPaletteImageFile;
const hasFileTransfer = (dt) => dt && Array.from(dt.types || []).includes('Files');
let dlg = null, folderCache = [];

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

export function paletteFromImageData(data, limit = EXACT_LIMIT) {
  const exact = exactPaletteFromRgba(data, limit);
  if (!exact.overflow) return exact.colors.slice(0, limit);
  const samples = samplesFromRgba(data);
  return samples.length ? sourcePaletteFromSamples(samples, limit === EXACT_LIMIT ? QUANT_COLORS : limit) : [];
}

function readImagePalette(im, limit = EXACT_LIMIT) {
  const exact = im.naturalWidth * im.naturalHeight <= EXACT_MAX_PIXELS;
  const k = exact ? 1 : Math.min(1, SAMPLE_MAX_SIDE / Math.max(im.naturalWidth, im.naturalHeight));
  const w = Math.max(1, Math.round(im.naturalWidth * k)), h = Math.max(1, Math.round(im.naturalHeight * k));
  const c = makeCanvas(w, h);
  const x = c.getContext('2d'); x.imageSmoothingEnabled = k < 1; x.drawImage(im, 0, 0, w, h);
  return paletteFromImageData(x.getImageData(0, 0, w, h).data, limit);
}

function fallbackCanvasPalette() { const seen = new Set(), pal = [];
  for (let y = 0; y < S.H; y++) for (let x = 0; x < S.W; x++) { const c = compositeAt(x, y); if (!c) continue;
    const k = c[0] + ',' + c[1] + ',' + c[2]; if (seen.has(k)) continue;
    seen.add(k); pal.push(c); }
  return pal;
}

export function paletteFromCanvas() {
  const c = makeCanvas(S.W, S.H);
  const x = c.getContext('2d'); x.imageSmoothingEnabled = false; paintStack(x, false);
  const pal = paletteFromImageData(x.getImageData(0, 0, S.W, S.H).data, CANVAS_PALETTE_LIMIT);
  if (pal.length) return sortPalette(pal);
  const fallback = fallbackCanvasPalette();
  return sortPalette(fallback.length > CANVAS_PALETTE_LIMIT ? sourcePaletteFromSamples(fallback, CANVAS_PALETTE_LIMIT) : fallback);
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

export function paletteFromImageFile(file, mode = 'replace', pt = null, limit = EXACT_LIMIT) {
  if (!isImageFile(file)) { toast(t('toast.notImage')); return; }
  const url = URL.createObjectURL(file), im = new Image();
  im.onerror = () => { URL.revokeObjectURL(url); toast(t('toast.imgOpenFail')); };
  im.onload = () => { URL.revokeObjectURL(url);
    const pal = readImagePalette(im, limit); if (!pal.length) { toast(t('toast.imgEmpty')); return; }
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
