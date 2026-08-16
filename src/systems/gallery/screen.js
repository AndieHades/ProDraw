// Экран галереи: рендер плиток (работы/папки), переименование двойным кликом,
// режим выбора, складывание (drag/наложение) и переупорядочивание.
import { $, showMenuAt } from '../../core/dom.js';
import { t, getLocale } from '../../i18n/index.js';
import { childrenOf, renameItem, removeItem, createFolder, moveToFolder, duplicateItem, setOrder, getItem, nextFolderName, folderStats } from './store.js';
import { openWork } from './doc.js';
import { attachDrag } from './drag.js';
import { renderGalleryGrid } from './grid.js';
import { reorderedIds } from '../../logic/gallery-grid.js';

const FOLDER_IC = '<svg viewBox="0 0 24 24"><path d="M3.5 7.5A2 2 0 0 1 5.5 5.5h4l2 2.5h7A2 2 0 0 1 20.5 10v7a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2V7.5z"/></svg>';

// относительное время последнего изменения (как в галереях): только что / N мин / N ч / вчера / N дн / дата
function relTime(ts) {
  if (!ts) return '';
  const m = Math.floor((Date.now() - ts) / 60000);
  if (m < 1) return t('time.now');
  if (m < 60) return m + ' ' + t('time.min');
  const h = Math.floor(m / 60); if (h < 24) return h + ' ' + t('time.hour');
  const d = Math.floor(h / 24); if (d === 1) return t('time.yesterday');
  if (d < 30) return d + ' ' + t('time.days');
  const dt = new Date(ts); return dt.toLocaleDateString(getLocale(), { month: 'long' }) + ' ' + dt.getFullYear(); // больше месяца — «май 2025»
}
let viewFolder = null, selecting = false, onOpen = null, rootTitle = '', selAnchor = null; const selected = new Set();
export const configure = (o) => { onOpen = o.onOpen; rootTitle = $('gal-title').textContent; };
const gridEl = () => $('gal-grid');
export const isSelecting = () => selecting;

export function setSelecting(v) { selecting = v; selected.clear(); selAnchor = null; syncSelUi(); return render(); }
function updateSel() { const n = selected.size;
  setBtn('gal-stack', 'gallery.stack', n, n < 2); setBtn('gal-dup', 'gallery.duplicate', n, !n); setBtn('gal-del', 'gallery.delete', n, !n);
  $('gal-stack').classList.toggle('lit', n >= 2); }
function setBtn(id, key, n, dis) { const b = $(id); if (!b) return; b.textContent = t(key) + (n ? ` (${n})` : ''); b.disabled = dis; }

function syncSelUi() {
  const on = selecting || selected.size > 0, grid = gridEl();
  const sb = $('gal-select'); sb.textContent = on ? '✓' : t('gallery.select'); sb.title = on ? t('gallery.done') : '';
  sb.classList.toggle('confirm', on); sb.classList.toggle('gal-round', on);
  for (const id of ['gal-stack', 'gal-dup', 'gal-del']) $(id).style.display = on ? '' : 'none';
  for (const id of ['gal-import', 'gal-photo', 'gal-new', 'gal-settings']) $(id).style.display = on ? 'none' : '';
  grid.classList.toggle('selecting', on);
  for (const t of grid.querySelectorAll('.gal-tile')) {
    const sel = selected.has(t.dataset.id); t.classList.toggle('sel', sel);
    t.querySelector('.gal-check')?.classList.toggle('on', sel);
  }
  updateSel();
}

function rangeSelect(id) {
  const ids = [...gridEl().querySelectorAll('.gal-tile')].map((t) => t.dataset.id);
  if (!selected.size || !selAnchor || !ids.includes(selAnchor)) selAnchor = id;
  const a = ids.indexOf(selAnchor), b = ids.indexOf(id);
  selected.clear(); ids.slice(Math.min(a, b), Math.max(a, b) + 1).forEach((x) => selected.add(x));
  selecting = true; syncSelUi();
}

function toggleSelect(id) {
  if (selected.has(id)) selected.delete(id); else selected.add(id);
  if (!selected.size) selAnchor = null; else selAnchor ||= id;
  syncSelUi();
}

function dragIds(id) { return selected.has(id) && selected.size > 1 ? [...selected] : [id]; }

async function openItem(id) { if (await openWork(id) && onOpen) onOpen(); }
export function goBack() { viewFolder = null; render(); }

// начать переименование плитки по id (после создания папки сразу даём ввести имя)
function editName(id) { const tile = gridEl().querySelector(`.gal-tile[data-id="${id}"]`); if (!tile) return;
  const nm = tile.querySelector('.gal-cap b'); if (nm) renameInline(nm, { id, name: nm.textContent }); }

function renameInline(nm, item) { nm.contentEditable = 'true'; nm.classList.add('editing'); nm.focus();
  const r = document.createRange(); r.selectNodeContents(nm); const s = getSelection(); s.removeAllRanges(); s.addRange(r);
  let done = false; const fin = async (save) => { if (done) return; done = true; nm.contentEditable = 'false'; nm.classList.remove('editing');
    const v = nm.textContent.trim().slice(0, 40); if (save && v && v !== item.name) await renameItem(item.id, v); render(); };
  nm.onblur = () => fin(true); nm.onkeydown = (e) => { e.stopPropagation(); if (e.key === 'Enter') { e.preventDefault(); nm.blur(); } else if (e.key === 'Escape') { e.preventDefault(); fin(false); } }; }

function tileMenu(x, y, d) { const m = $('rowctx'); m.innerHTML = ''; // ПКМ по плитке: переименовать / дублировать / удалить
  const ren = document.createElement('button'); ren.textContent = t('menu.rename');
  ren.onclick = () => { m.classList.remove('on'); editName(d.id); }; m.appendChild(ren); // переименование — без ре-рендера
  const mk = (label, danger, fn) => { const b = document.createElement('button'); b.textContent = label; if (danger) b.classList.add('danger');
    b.onclick = async () => { m.classList.remove('on'); await fn(); render(); }; m.appendChild(b); };
  mk(t('gallery.duplicate'), false, () => duplicateItem(d.id));
  mk(t('gallery.delete'), true, () => removeItem(d.id));
  showMenuAt(m, x, y); }

async function tileEl(d) {
  const tile = document.createElement('div'); tile.className = 'gal-tile' + (d.kind === 'folder' ? ' folder' : '') + (selected.has(d.id) ? ' sel' : '');
  tile.dataset.id = d.id; tile.dataset.kind = d.kind || 'doc';
  const thumb = document.createElement('div'); thumb.className = 'gal-thumb';
  if (d.kind === 'folder') { const ic = document.createElement('i'); ic.className = 'gal-folder-ic'; ic.innerHTML = FOLDER_IC; thumb.appendChild(ic); } // у всех папок — значок папки
  else { const im = document.createElement('img'); im.src = d.preview || ''; im.draggable = false; thumb.appendChild(im); } // картинка вписывается в квадратную плитку без обрезки
  tile.addEventListener('dragstart', (e) => e.preventDefault()); // не запускать нативный драг картинки (мешает своему)
  tile.addEventListener('contextmenu', (e) => { e.preventDefault(); tileMenu(e.clientX, e.clientY, d); }); // ПКМ (десктоп) — меню
  const chk = document.createElement('div'); chk.className = 'gal-check' + (selected.has(d.id) ? ' on' : ''); thumb.appendChild(chk);
  const cap = document.createElement('div'); cap.className = 'gal-cap';
  const nm = document.createElement('b'); nm.textContent = d.name;
  const sub = document.createElement('small'), tm = document.createElement('small');
  if (d.kind === 'folder') { const st = await folderStats(d.id); sub.textContent = t('gallery.files', { n: st.files }); tm.textContent = relTime(st.updated); }
  else { sub.textContent = `${d.W}×${d.H} px`; tm.textContent = relTime(d.updated); } // размеры и время — на разных строках
  cap.append(nm, sub, tm); tile.append(thumb, cap);
  thumb.onclick = (e) => { if (e.ctrlKey || e.metaKey) { rangeSelect(d.id); return; }
    if (selecting) { toggleSelect(d.id); return; }
    const open = () => { if (d.kind === 'folder') { viewFolder = d.id; render(); } else openItem(d.id); };
    // десктоп: «клевок» уже отыграл на hover — открываем сразу; тач: даём клевку
    // проиграться целиком (1450мс = длительность gal-press), потом открываем
    if (window.matchMedia('(hover: hover)').matches) { open(); return; }
    tile.classList.add('pressing'); setTimeout(() => { tile.classList.remove('pressing'); open(); }, 1600);
  };
  nm.onclick = (e) => { e.stopPropagation(); if (!nm.isContentEditable) renameInline(nm, d); };
  nm.ondblclick = (e) => e.stopPropagation();
  attachDrag(tile, d.id, { gridEl, selecting: isSelecting, dragIds,
    onBack: async (ids) => { const f = viewFolder ? await getItem(viewFolder) : null; // бросок на «назад» — на уровень выше
      await moveToFolder(ids, f ? (f.folder ?? null) : null); render(); },
    onStack: async (ids, targetId, kind) => {
      const ord = (d) => (d ? (d.order ?? d.updated ?? Date.now()) : Date.now());
      if (kind === 'folder') { await moveToFolder(ids.filter((x) => x !== targetId), targetId); await render(); return; } // файл/папка на папку → внутрь неё
      const dragged = await getItem(ids[0]);
      if (dragged && dragged.kind === 'folder') { // папку на файл → файл уходит в эту папку, папка встаёт на место файла
        const tgt = await getItem(targetId);
        await moveToFolder([targetId], ids[0]); await setOrder(ids[0], ord(tgt)); await render(); return; }
      const tgt = await getItem(targetId); // файл на файл → новая папка на месте файла-цели
      const fid = await createFolder(await nextFolderName(t('gallery.folderName')), [targetId, ...ids.filter((x) => x !== targetId)], viewFolder, ord(tgt));
      await render(); editName(fid); },
    onReorder: async (ids, beforeId) => {
      const seq = reorderedIds(await childrenOf(viewFolder), ids, beforeId);
      if (!seq) return;
      // переписываем order строго по новому порядку (по убыванию): сортировка
      // воспроизводит его точно — без дробных коллизий и рассинхрона с сеткой
      const top = Date.now();
      for (let i = 0; i < seq.length; i++) await setOrder(seq[i], top - i * 1000);
      render(); } });
  return tile;
}

export async function render() { const grid = gridEl(); grid.innerHTML = '';
  const f = viewFolder ? await getItem(viewFolder) : null; // внутри папки — имя папки прямо в кнопке «назад»
  const back = $('gal-back'); back.style.display = viewFolder ? '' : 'none';
  back.textContent = viewFolder ? '‹ ' + (f ? f.name : '') : '‹';
  $('gal-title').style.display = viewFolder ? 'none' : ''; $('gal-title').textContent = rootTitle;
  await renderGalleryGrid(grid, await childrenOf(viewFolder), tileEl); }

export async function stackSelected() { if (selected.size < 2) return; const fid = await createFolder(await nextFolderName(t('gallery.folderName')), [...selected], viewFolder); await setSelecting(false); editName(fid); }
export async function dupSelected() { for (const id of selected) await duplicateItem(id); setSelecting(false); }
export async function delSelected() { for (const id of selected) await removeItem(id); setSelecting(false); }
