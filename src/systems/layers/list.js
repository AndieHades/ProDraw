import { S } from '../../core/state.js';
import * as bus from '../../core/bus.js';
import * as actions from '../../core/actions.js';
import { $, t } from '../../core/dom.js';
import { snapshot } from '../../core/history.js';
import { menuGesture } from '../../core/long-press.js';
import { inlineRename, nameRenameGesture } from '../../core/inline-rename.js';
import { layerCanvas } from '../../core/layer-cache.js';
import { makeCanvas } from '../../core/canvas.js';
import { C } from '../../styles/canvas-colors.js';
import { folderChain } from '../../core/layers.js';
import { dragRow } from './drag.js';
import { selectRange } from './range-select.js';
import { openLctx } from './menu.js';
import { attachLayerSwipe } from './swipe.js';
import { toggleLock, toggleAlphaLock, toggleReference } from './ops.js';
import { folderLayers, folderStackPos, activeOpacityRef } from './helpers.js';
import { appendEffects } from './fx-rows.js';
import { bgRow } from './bg-row.js';
import { syncLayerActionButtons } from './actions-bar.js';

const INDENT = 16; // отступ на уровень вложенности

export const EYE = '<svg viewBox="0 0 24 24"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.6"/><path class="slash" d="M4 4l16 16"/></svg>'; // глаз = видимость
const CLIP_IC = '<svg viewBox="0 0 24 24"><path d="M16 5h-4.5A2.5 2.5 0 0 0 9 7.5V15"/><path d="M5.5 11.5l3.5 4 3.5-4"/></svg>'; // обтравка: стрелка вниз на слой ниже
const LOCK_IC = '<svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';
const ALPHA_IC = '<svg viewBox="0 0 24 24"><rect x="4.5" y="4.5" width="15" height="15" rx="2"/><path d="M12 4.5v15M4.5 12h15"/></svg>';
const REF_IC = '<svg viewBox="0 0 24 24"><path d="M6 4.5h12v15l-6-3.5-6 3.5z"/><path d="M9 8.5h6M9 12h4"/></svg>';
const SYM_IC = '<svg viewBox="0 0 24 24"><path d="M12 4v16" stroke-dasharray="2.5 2.5"/><path d="M8.5 8.5L5 12l3.5 3.5M15.5 8.5L19 12l-3.5 3.5"/><path class="slash" d="M4 4l16 16"/></svg>';
const TILE_IC = '<svg viewBox="0 0 24 24"><rect x="3.5" y="3.5" width="7" height="7" rx="1"/><rect x="13.5" y="3.5" width="7" height="7" rx="1" fill="currentColor" stroke="none"/><rect x="3.5" y="13.5" width="7" height="7" rx="1" fill="currentColor" stroke="none"/><rect x="13.5" y="13.5" width="7" height="7" rx="1"/></svg>';
const TEXT_IC = '<b>T</b>';
export let layDragSquelch = false;
export const setSquelch = (v) => { layDragSquelch = v; };

function thumbFor(i) { const th = makeCanvas(40, 40); th.className = 'lth';
  const tx = th.getContext('2d'); tx.imageSmoothingEnabled = false; tx.fillStyle = C.checkA; tx.fillRect(0, 0, 40, 40); tx.fillStyle = C.checkB;
  for (let yy = 0; yy < 5; yy++) for (let xx = 0; xx < 5; xx++) if ((xx + yy) & 1) tx.fillRect(xx * 8, yy * 8, 8, 8);
  const k = Math.min(40 / S.W, 40 / S.H), w2 = Math.max(1, Math.round(S.W * k)), h2 = Math.max(1, Math.round(S.H * k));
  tx.drawImage(layerCanvas(i), (40 - w2) / 2, (40 - h2) / 2, w2, h2); return th; }

export function startInlineRename(span, ref) {
  inlineRename(span, ref.name, (v) => { if (v) { snapshot(); ref.name = v; } layList(); });
}

function nameSpan(text, isActive, ref) { const nm = document.createElement('span'); nm.className = 'lname'; nm.textContent = text;
  nameRenameGesture(nm, { isActive: () => !!(isActive && isActive()), rename: () => startInlineRename(nm, ref) });
  return nm; }

function folderCountSpan(f) {
  const n = folderLayers(f).length;
  if (!n) return null;
  const c = document.createElement('span'); c.className = 'fcount'; c.textContent = n; return c; // разделитель '· ' — в CSS (.fcount::before)
}

function wireVis(vis, obj) {
  vis.addEventListener('pointerdown', (e) => e.stopPropagation());
  vis.addEventListener('click', (e) => { e.stopPropagation(); snapshot(); obj.visible = !obj.visible; vis.classList.toggle('off', !obj.visible); bus.emit('visibility'); bus.emit('render'); });
}

function folderRow(f, depth) {
  const isSel = S.markedFolders.has(f.id), isOn = f.id === S.selFolder && !S.fxCur;
  // закрытая папка, внутри которой спрятана активная строка → мягкая голубая
  // подсветка. При раскрытии она пропадает, а если слой глубже — подсветится
  // следующая закрытая папка (рендерится только внешняя закрытая).
  const hasActive = !f.open && !isOn && !isSel && containsActive(f);
  const fr = document.createElement('div'); fr.dataset.fid = f.id; fr.style.marginLeft = depth * INDENT + 'px';
  fr.className = 'lrow frow' + (f.open ? ' open' : '') + (isOn ? ' on' : isSel ? ' marked' : hasActive ? ' has-active' : '');
  const car = document.createElement('button'); car.className = 'caret' + (f.open ? ' open' : ''); car.innerHTML = '<svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>';
  car.addEventListener('pointerdown', (e) => e.stopPropagation());
  car.addEventListener('click', (e) => { e.stopPropagation(); if (layDragSquelch) return; f.open = !f.open; layList(); }); // раскрыть/свернуть — выбор не меняем
  const nm = nameSpan(f.name, () => f.id === S.selFolder && !S.fxCur, f), cnt = folderCountSpan(f);
  const vis = document.createElement('button'); vis.className = 'eye' + (f.visible ? '' : ' off'); vis.innerHTML = EYE; wireVis(vis, f);
  fr.append(car, nm); if (cnt) fr.append(cnt);
  if (S.sym || S.symH || S.symD1 || S.symD2) { const sy = document.createElement('button'); sy.className = 'eye lsym' + (f.symLock ? ' off' : ''); sy.innerHTML = SYM_IC;
    sy.addEventListener('pointerdown', (e) => e.stopPropagation());
    sy.addEventListener('click', (ev) => { ev.stopPropagation(); snapshot(); f.symLock = !f.symLock; sy.classList.toggle('off', f.symLock); bus.emit('render'); }); fr.append(sy); }
  fr.append(vis);
  fr.addEventListener('click', (ev) => { if (layDragSquelch) return;
    S.bgSel = false;
    if (ev.shiftKey && selectRange(fr)) { layList(); return; } // shift-клик — диапазон от активной строки до этой папки
    if (ev.ctrlKey || ev.metaKey) { if (S.markedFolders.has(f.id)) { S.markedFolders.delete(f.id); if (S.selFolder === f.id) S.selFolder = S.markedFolders.size ? [...S.markedFolders][0] : null; }
      else S.markedFolders.add(f.id); layList(); return; } // ctrl-добавление не делает папку активной — primary не меняется
    S.selFolder = f.id; S.markedFolders = new Set([f.id]); S.marked.clear(); S.fxSel.clear(); S.fxCur = null; layList(); });
  menuGesture(fr, (x, y) => openLctx(x, y, 'folder', f), '.lname'); dragRow(fr, { kind: 'folder', fid: f.id }); return fr;
}

// активная строка (слой/выбранная вложенная папка) спрятана внутри папки f
function containsActive(f) {
  if (S.bgSel) return false;
  if (!S.selFolder && !S.fxCur) { const cur = S.layers[S.cur]; if (cur && folderChain(cur.fid).some((x) => x.id === f.id)) return true; }
  return S.selFolder != null && S.selFolder !== f.id && folderChain(S.selFolder).some((x) => x.id === f.id);
}

function toggleLayerSelect(i) {
  if (S.bgSel) { S.bgSel = false; S.cur = i; S.marked.clear(); S.markedFolders.clear(); S.selFolder = null; S.fxCur = null; layList(); return; } // фон вне мультивыбора — ctrl поверх активного фона = одиночный выбор
  if (S.selFolder == null && !S.fxCur) {
    if (i === S.cur) { if (S.marked.size) { const nx = [...S.marked][0]; S.marked.delete(nx); S.cur = nx; } } // снять активный → повысить другой
    else if (S.marked.has(i)) S.marked.delete(i); // убрать из набора
    else { S.marked.add(S.cur); S.cur = i; } // добавить: прежний активный → в набор, кликнутый → активный
  } else { S.marked.delete(i); S.cur = i; S.selFolder = null; S.fxCur = null; } // папка/эффект были активны → активный теперь слой, их пометки остаются
  layList();
}

function layerRow(L, i, depth) {
  const isCurPrim = i === S.cur && !S.selFolder && !S.fxCur && !S.bgSel;
  const row = document.createElement('div'); row.className = 'lrow' + (isCurPrim ? ' on' : S.marked.has(i) ? ' marked' : '') + (L.clip ? ' clip' : '') + (L.kind === 'tilemap' ? ' tmap' : '');
  row.dataset.li = i; row.style.marginLeft = depth * INDENT + 'px';
  const nm = nameSpan(L.name, () => i === S.cur && !S.selFolder && !S.fxCur && !S.bgSel, L);
  const vis = document.createElement('button'); vis.className = 'eye' + (L.visible ? '' : ' off'); vis.innerHTML = EYE; wireVis(vis, L); // глаз = видимость
  if (L.clip) { const ar = document.createElement('i'); ar.className = 'clip-arrow'; ar.innerHTML = CLIP_IC; row.append(ar); } // обтравка: стрелка + сдвиг
  row.append(thumbFor(i), nm); // миниатюра + имя
  if (L.kind === 'tilemap') { const tl = document.createElement('button'); tl.className = 'eye ltile'; tl.innerHTML = TILE_IC; tl.title = t('menu.convertLayer'); // клик запекает Tilemap обратно в обычный слой
    tl.addEventListener('pointerdown', (e) => e.stopPropagation()); tl.addEventListener('click', (ev) => { ev.stopPropagation(); actions.run('tile.bakeConvert', i); }); row.append(tl); }
  if (L.kind === 'text') { const tx = document.createElement('button'); tx.className = 'eye ltext'; tx.innerHTML = TEXT_IC; tx.title = t('tool.text');
    tx.addEventListener('pointerdown', (e) => e.stopPropagation()); tx.addEventListener('click', (ev) => { ev.stopPropagation(); actions.run('text.editLayer', i); }); row.append(tx); }
  if (S.sym || S.symH || S.symD1 || S.symD2) { const sy = document.createElement('button'); sy.className = 'eye lsym' + (L.symLock ? ' off' : ''); sy.innerHTML = SYM_IC; // симметрия на слое (можно выключить)
    sy.addEventListener('pointerdown', (e) => e.stopPropagation());
    sy.addEventListener('click', (ev) => { ev.stopPropagation(); snapshot(); L.symLock = !L.symLock; sy.classList.toggle('off', L.symLock); bus.emit('render'); }); row.append(sy); }
  if (L.reference) { const rf = document.createElement('button'); rf.className = 'eye lref'; rf.innerHTML = REF_IC;
    rf.addEventListener('pointerdown', (e) => e.stopPropagation()); rf.addEventListener('click', (ev) => { ev.stopPropagation(); toggleReference(L); }); row.append(rf); }
  if (L.lock || L.alphaLock) { const fl = document.createElement('button'); fl.className = 'eye'; fl.innerHTML = L.lock ? LOCK_IC : ALPHA_IC; // замок/альфа — клик снимает
    fl.addEventListener('pointerdown', (e) => e.stopPropagation()); fl.addEventListener('click', (ev) => { ev.stopPropagation(); if (L.lock) toggleLock(L); else toggleAlphaLock(L); }); row.append(fl); }
  row.append(vis);
  row.addEventListener("click", (ev) => { if (layDragSquelch) return;
    if (ev.ctrlKey || ev.metaKey) { toggleLayerSelect(i); return; } // ctrl/cmd-клик — поштучный выбор
    if (ev.shiftKey && selectRange(row)) { layList(); return; } // shift-клик — диапазон от активной строки до кликнутой
    S.cur = i; S.marked.clear(); S.markedFolders.clear(); S.selFolder = null; S.fxSel.clear(); S.fxCur = null; S.bgSel = false; layList(); }); // тап — выбрать только этот слой активным
  menuGesture(row, (x, y) => { if (S.cur !== i) { S.cur = i; S.markedFolders.clear(); S.selFolder = null; S.fxSel.clear(); S.fxCur = null; layList(); } openLctx(x, y, 'layer', L); }, '.lname');
  attachLayerSwipe(row, L); dragRow(row, { kind: 'layer', idx: i }); return row;
}

function appendFolderRow(box, f, depth, rendered) {
  if (rendered.has(f.id)) return;
  rendered.add(f.id); box.appendChild(folderRow(f, depth)); appendEffects(box, f, depth + 1);
}

function childItems(parent) {
  const items = [];
  S.layers.forEach((L, i) => { if ((L.fid ?? null) === (parent ?? null)) items.push({ kind: 'layer', pos: i, order: i, L, i }); });
  S.folders.forEach((f, order) => { if ((f.parent ?? null) === (parent ?? null)) items.push({ kind: 'folder', pos: folderStackPos(f), order, f }); });
  items.sort((a, b) => (b.pos - a.pos) || (a.kind === 'layer' ? -1 : b.kind === 'layer' ? 1 : 0) || (a.order - b.order));
  return items;
}

function appendChildren(box, parent, depth, rendered) {
  for (const item of childItems(parent)) {
    if (item.kind === 'folder') {
      appendFolderRow(box, item.f, depth, rendered);
      if (item.f.open) appendChildren(box, item.f.id, depth + 1, rendered);
    } else {
      box.appendChild(layerRow(item.L, item.i, depth)); appendEffects(box, item.L, depth + 1);
    }
  }
}

export function layList() {
  const box = $('lay-list'); if (!box) return; box.innerHTML = '';
  const rendered = new Set();
  appendChildren(box, null, 0, rendered);
  box.appendChild(bgRow()); // фон-слой Background — всегда в самом низу, с отступом (CSS)
  const ref = activeOpacityRef(), op = $('lay-op'); if (op && ref) { const v = Math.round((ref.opacity ?? 1) * 100); op.value = v; $('lay-opv').textContent = v + '%'; } // ползунок — прозрачность активной строки
  syncLayerActionButtons();
  bus.emit('layer-active'); // активный слой мог смениться (выбор строки идёт через layList)
}
