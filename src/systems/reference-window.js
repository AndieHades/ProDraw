// Reference board: several draggable images, persisted with the current doc.
// Eyedropper reads rendered pixels from #refcv through systems/eyedropper.
import { $, toast, t } from '../ui/dom/ShellDom.ts';
import { S } from '../core/state.js';
import * as bus from '../core/bus.ts';
import { makeCanvas, syncCanvasSize } from '../core/canvas.js';
import { defaultReferenceBoard, normalizeReferenceBoard } from '../core/reference-board.js';
import { C } from '../styles/canvas-colors.ts';
import { copyRefs, pasteRef, saveRef } from './reference-window-clipboard.js';
import { bindDetachDrag, detachedOpen, focusDetached, syncDetached } from './reference-window-detached.js';
import { bindReferenceDrop, isImageFile } from './reference-window-drop.js';
import { openReferenceMenu } from './reference-window-menu.js';
import { boardBounds, boxRect, bringFrontIds, nextBoardPosition, referenceHit, referencePoint, selectedItems, selectedSet, setSelected, transformBoardItems, transformItem, updateBoxSelection } from './reference-window-ops.js';
import { mountReferenceWindow } from '../ui/reference/ReferenceWindowPresenter.ts';
import { createReferenceImageCache } from './reference-window/cache.js';

let refOn = false, drag = null, mounted = false, localEmit = false, menuRefId = null;
const rcv = () => $('refcv');
const imageCache = createReferenceImageCache(() => { refRender(); syncDetachedImage(); });
const { cacheLoaded, ensureImage } = imageCache;

function board() { if (!S.referenceBoard || !S.referenceBoard.view || !Array.isArray(S.referenceBoard.items)) S.referenceBoard = defaultReferenceBoard(); return S.referenceBoard; }
function refSize() { const cv = rcv(), r = cv.getBoundingClientRect();
  return { w: Math.max(1, cv.clientWidth || r.width || 260), h: Math.max(1, cv.clientHeight || r.height || 200) }; }
function syncRefButton() { $('refbtn').classList.toggle('on', refOn || detachedOpen()); }
function emitReference() { localEmit = true; bus.emit('reference'); localEmit = false; }
function changed() { refRender(); syncDetachedImage(); emitReference(); }


const bounds = () => boardBounds(board().items);
function fitBoard() { const bd = bounds(), b = board(), s = refSize(), pad = 24; if (!bd) return;
  b.view.z = Math.max(0.05, Math.min(40, Math.min((s.w - pad) / bd.w, (s.h - pad) / bd.h)));
  b.view.x = (s.w - bd.w * b.view.z) / 2 - bd.x * b.view.z; b.view.y = (s.h - bd.h * b.view.z) / 2 - bd.y * b.view.z;
}
const placeNext = (w) => nextBoardPosition(board(), refSize(), w);

export function refRender() { if (!refOn) return; const cv = rcv(), s = refSize(), dpr = window.devicePixelRatio || 1;
  syncCanvasSize(cv, s.w, s.h, dpr);
  const x = cv.getContext('2d', { willReadFrequently: true }), b = board();
  x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, s.w, s.h); x.fillStyle = C.prevBg; x.fillRect(0, 0, s.w, s.h);
  if (!b.items.length) { x.fillStyle = C.hint; x.font = '12px system-ui'; x.textAlign = 'center'; x.fillText(t('reference.emptyHint'), s.w / 2, s.h / 2); return; }
  const sel = selectedSet(b);
  for (const it of b.items) { const rec = ensureImage(it), sx = b.view.x + it.x * b.view.z, sy = b.view.y + it.y * b.view.z;
    const sw = it.w * b.view.z, sh = it.h * b.view.z; x.imageSmoothingEnabled = b.view.z < 2;
    if (rec.ready) x.drawImage(rec.img, sx, sy, sw, sh); else { x.strokeStyle = C.hint; x.strokeRect(sx, sy, sw, sh); }
    if (sel.has(it.id)) { x.save(); x.strokeStyle = C.accent; x.lineWidth = 2; x.setLineDash([5, 3]); x.strokeRect(sx - 1, sy - 1, sw + 2, sh + 2); x.restore(); } }
  if (drag && drag.kind === 'box' && drag.moved) { const r = boxRect(b, drag); x.save(); x.strokeStyle = C.accent; x.fillStyle = C.accent; x.globalAlpha = 0.14; x.fillRect(r.sx, r.sy, r.sw, r.sh); x.globalAlpha = 1; x.setLineDash([5, 3]); x.strokeRect(r.sx, r.sy, r.sw, r.sh); x.restore(); }
}

function snapshotCanvas() { const bd = bounds(); if (!bd) return null;
  const c = makeCanvas(Math.ceil(bd.w), Math.ceil(bd.h)), x = c.getContext('2d');
  x.fillStyle = C.prevBg; x.fillRect(0, 0, c.width, c.height);
  for (const it of board().items) { const rec = ensureImage(it); if (rec.ready) x.drawImage(rec.img, it.x - bd.x, it.y - bd.y, it.w, it.h); }
  return c;
}
function refDataUrl() { const c = snapshotCanvas(); return c ? c.toDataURL('image/png') : null; } function syncDetachedImage() { syncDetached(refDataUrl()); syncRefButton(); }

function toggleRef(on, emit = true) {
  refOn = on === undefined ? !refOn : !!on; board().open = refOn || detachedOpen();
  $('refwin').classList.toggle('on', refOn); syncRefButton();
  if (refOn) requestAnimationFrame(refRender); if (emit) emitReference();
}

function pointerDown(e) { if (![0, 2].includes(e.button || 0)) return; const item = referenceHit(board(), rcv(), e), p = referencePoint(rcv(), e), b = board(), id = e.pointerId ?? 1;
  if (e.button === 2 && item) return;
  e.preventDefault(); try { rcv().setPointerCapture(e.pointerId); } catch (err) {}
  if (e.button === 2) drag = { id, kind: 'pan', x: p.x, y: p.y, ox: b.view.x, oy: b.view.y };
  else if (item) { const ids = selectedSet(b), add = e.ctrlKey || e.metaKey, wasSelected = ids.has(item.id);
    if (add) { if (wasSelected) ids.delete(item.id); else ids.add(item.id); setSelected(b, ids); }
    else if (!wasSelected) setSelected(b, [item.id]);
    const moving = selectedItems(b), after = selectedSet(b);
    if (moving.length && after.has(item.id)) { bringFrontIds(b, moving.map((it) => it.id));
      drag = { id, kind: 'items', x: p.x, y: p.y, moved: false, clickId: item.id, collapse: !add && wasSelected && after.size > 1, items: moving.map((it) => ({ it, x: it.x, y: it.y })) }; } }
  else { if (!e.ctrlKey && !e.metaKey) setSelected(b, []);
    drag = { id, kind: 'box', x: p.x, y: p.y, px: p.x, py: p.y, moved: false, mode: e.ctrlKey || e.metaKey ? 'add' : 'replace', base: [...selectedSet(b)] }; }
  changed();
}
function pointerMove(e) { if (!drag || drag.id !== (e.pointerId ?? 1)) return; const p = referencePoint(rcv(), e), dx = p.x - drag.x, dy = p.y - drag.y, b = board();
  e.preventDefault(); if (drag.kind === 'items') { drag.moved = drag.moved || Math.hypot(dx, dy) > 3;
    if (drag.moved) drag.items.forEach((m) => { m.it.x = m.x + dx / b.view.z; m.it.y = m.y + dy / b.view.z; }); }
  else if (drag.kind === 'box') { drag.px = p.x; drag.py = p.y; drag.moved = drag.moved || Math.hypot(dx, dy) > 3; if (drag.moved) updateBoxSelection(b, drag); }
  else { b.view.x = drag.ox + dx; b.view.y = drag.oy + dy; } changed();
}
function pointerUp(e) { if (!drag || drag.id !== (e.pointerId ?? 1)) return; const d = drag;
  if (d.kind === 'box' && !d.moved && d.mode === 'add') setSelected(board(), d.base); if (d.kind === 'items' && !d.moved && d.collapse) setSelected(board(), [d.clickId]);
  drag = null; refRender(); emitReference();
}
function wheel(e) { if (!board().items.length) return; e.preventDefault(); const b = board(), p = referencePoint(rcv(), e), old = b.view.z;
  const nz = Math.max(0.05, Math.min(40, old * (e.deltaY < 0 ? 1.12 : 1 / 1.12)));
  b.view.x = p.x - (p.x - b.view.x) * (nz / old); b.view.y = p.y - (p.y - b.view.y) * (nz / old); b.view.z = nz; changed();
}

function deleteSelected() { const b = board(), ids = selectedSet(b); if (!ids.size) return;
  b.items = b.items.filter((it) => { if (!ids.has(it.id)) return true; imageCache.delete(it.id); return false; }); setSelected(b, []); changed(); }
function transformActive(kind) { const b = board(), list = selectedItems(b);
  if (list.length) list.forEach((it) => transformItem(it, ensureImage(it), kind, cacheLoaded));
  else if (b.items.length) { transformBoardItems(b.items, bounds(), ensureImage, cacheLoaded, kind); fitBoard(); }
  changed();
}

function openCtx(e) {
  e.preventDefault(); const item = referenceHit(board(), rcv(), e), b = board();
  if (!item) { clearSelection(); return; }
  if (!selectedSet(b).has(item.id)) setSelected(b, [item.id]);
  menuRefId = item.id; changed();
  openReferenceMenu(e.clientX, e.clientY, {
    rotate: () => transformActive('rotate'), flip: () => transformActive('flip'), delete: deleteSelected,
    copy: () => copyRefs(selectedItems(board()), ensureImage),
    paste: () => pasteRef((url) => addReferenceDataUrl(url)),
    save: () => { const ref = board().items.find((it) => it.id === menuRefId); if (ref) saveRef(ref, ensureImage); },
  });
}

function addReferenceDataUrl(url, opts = {}) { if (!url) return; const img = new Image();
  img.onerror = () => toast(t('toast.imgOpenFail'));
  img.onload = () => { const b = board(), first = !b.items.length, w = Math.max(1, img.naturalWidth || img.width || 1), h = Math.max(1, img.naturalHeight || img.height || 1);
    const pos = placeNext(w, h), x = first ? 0 : pos.x, y = first ? 0 : pos.y;
    const item = { id: b.nextId++, src: String(url), x, y, w, h }; b.items.push(item); setSelected(b, [item.id]); b.open = true; cacheLoaded(item, img);
    if (opts.open !== false && !detachedOpen()) toggleRef(true, false); if (first) fitBoard(); changed(); };
  img.src = url;
}
function loadRefFile(f, opts) { const r = new window.FileReader();
  r.onerror = () => toast(t('toast.imgOpenFail')); r.onload = () => addReferenceDataUrl(String(r.result), opts); r.readAsDataURL(f); }

function syncFromState() { if (localEmit) return; S.referenceBoard = normalizeReferenceBoard(S.referenceBoard); imageCache.prune(board().items); board().items.forEach(ensureImage);
  refOn = !!board().open && !detachedOpen(); $('refwin').classList.toggle('on', refOn); syncRefButton(); refRender(); syncDetachedImage(); }
const typing = (el) => el && (['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) || el.isContentEditable); const inRefWindow = (target) => target && target.nodeType && $('refwin').contains(target);
function clearSelection() { const b = board(); if (!selectedSet(b).size) return; setSelected(b, []); changed(); }

export function mount() {
  if (mounted) return; mounted = true;
  mountReferenceWindow({
    toggle: () => { if (detachedOpen()) focusDetached(); else toggleRef(); }, close: () => toggleRef(false),
    rotate: () => transformActive('rotate'), flip: () => transformActive('flip'),
    loadFiles: (files) => files.filter(isImageFile).forEach((file) => loadRefFile(file)),
    pointerDown, pointerMove, pointerUp, wheel, contextMenu: openCtx,
    outsidePointer: (event) => { if (refOn && !inRefWindow(event.target)) clearSelection(); },
    keyDown: (event) => { if ((event.key === 'Delete' || event.key === 'Backspace') && refOn &&
      selectedSet(board()).size && !typing(event.target)) { event.preventDefault(); deleteSelected(); } },
    bindExternal: () => { bindReferenceDrop(loadRefFile);
      bindDetachDrag({ dataUrl: refDataUrl, add: (url) => addReferenceDataUrl(url, { open: false }),
        closeLocal: () => toggleRef(false), closed: () => { if (!refOn) board().open = false;
          syncRefButton(); emitReference(); }, rotate: () => transformActive('rotate'), flip: () => transformActive('flip') }); },
    subscribe: (listener) => { bus.on('reference', listener); }, sync: syncFromState,
    resize: (w, h) => { $('refwin').style.width = Math.max(140, Math.min(innerWidth - 12, w)) + 'px';
      $('refwin').style.height = Math.max(120, Math.min(innerHeight - 12, h)) + 'px'; refRender(); }
  });
}
