import { $, toast, t } from '../core/dom.js';
import * as actions from '../core/actions.js';

let detachedWin = null, detachedPoll = null, closeCb = null;

export const detachedOpen = () => !!(detachedWin && !detachedWin.closed);
export const focusDetached = () => { if (detachedOpen()) detachedWin.focus(); };
export function syncDetached(dataUrl) {
  if (detachedOpen() && detachedWin.__pxhSetReference) detachedWin.__pxhSetReference(dataUrl);
}

function detachedScript() {
  const cv = document.getElementById('cv'), hint = document.getElementById('hint'), file = document.getElementById('file'), x = cv.getContext('2d', { willReadFrequently: true });
  const img = new Image(), src = document.createElement('canvas'), sx = src.getContext('2d', { willReadFrequently: true });
  const view = { z: 1, x: 0, y: 0 }; let has = false, drag = null;
  function resize() { const d = window.devicePixelRatio || 1; cv.width = Math.max(1, Math.round(innerWidth * d)); cv.height = Math.max(1, Math.round(innerHeight * d)); cv.style.width = innerWidth + 'px'; cv.style.height = innerHeight + 'px'; x.setTransform(d, 0, 0, d, 0, 0); render(); }
  function fit() { if (!has) { render(); return; } view.z = Math.min(innerWidth / src.width, innerHeight / src.height); view.x = (innerWidth - src.width * view.z) / 2; view.y = (innerHeight - src.height * view.z) / 2; render(); }
  function render() { x.fillStyle = '#1f1f1f'; x.fillRect(0, 0, innerWidth, innerHeight); hint.style.display = has ? 'none' : 'block'; if (!has) return; x.imageSmoothingEnabled = view.z < 2; x.drawImage(src, view.x, view.y, src.width * view.z, src.height * view.z); }
  function load(url) { if (!url) { has = false; render(); return; } img.onload = () => { src.width = Math.max(1, img.naturalWidth || img.width || 1); src.height = Math.max(1, img.naturalHeight || img.height || 1); sx.clearRect(0, 0, src.width, src.height); sx.drawImage(img, 0, 0); has = true; fit(); }; img.src = url; }
  function pick(e) { if (!has) return; const px = Math.floor((e.clientX - view.x) / view.z), py = Math.floor((e.clientY - view.y) / view.z); if (px < 0 || py < 0 || px >= src.width || py >= src.height) return; const d = sx.getImageData(px, py, 1, 1).data; if (d[3] > 10 && opener && opener.__pxhReferencePick) opener.__pxhReferencePick([d[0], d[1], d[2]]); }
  function read(files) { [...files].filter((it) => ((it.type || '').startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|avif|svg)$/i.test(it.name || ''))).forEach((f) => { const r = new FileReader(); r.onload = () => { if (opener && opener.__pxhReferenceSetDataUrl) opener.__pxhReferenceSetDataUrl(r.result); }; r.readAsDataURL(f); }); }
  function fileDrop(e) { e.preventDefault(); read(e.dataTransfer.files || []); }
  window.__pxhSetReference = load; window.addEventListener('resize', resize);
  document.getElementById('open').onclick = () => file.click(); document.getElementById('rot').onclick = () => opener && opener.__pxhReferenceRotate && opener.__pxhReferenceRotate();
  document.getElementById('flip').onclick = () => opener && opener.__pxhReferenceFlip && opener.__pxhReferenceFlip();
  file.onchange = (e) => { read(e.target.files || []); e.target.value = ''; };
  cv.addEventListener('wheel', (e) => { if (!has) return; e.preventDefault(); const old = view.z, nz = Math.max(0.05, Math.min(40, old * (e.deltaY < 0 ? 1.12 : 1 / 1.12))); view.x = e.clientX - (e.clientX - view.x) * (nz / old); view.y = e.clientY - (e.clientY - view.y) * (nz / old); view.z = nz; render(); }, { passive: false });
  cv.addEventListener('pointerdown', (e) => { if (![0, 2].includes(e.button)) return; e.preventDefault(); try { cv.setPointerCapture(e.pointerId); } catch (err) {} drag = { id: e.pointerId, kind: e.button === 2 ? 'pan' : 'pick', x: e.clientX, y: e.clientY, ox: view.x, oy: view.y, moved: false }; });
  cv.addEventListener('pointermove', (e) => { if (!drag || drag.id !== e.pointerId) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; if (Math.hypot(dx, dy) > 3) drag.moved = true; if (drag.kind === 'pan') { view.x = drag.ox + dx; view.y = drag.oy + dy; render(); } });
  cv.addEventListener('pointerup', (e) => { if (!drag || drag.id !== e.pointerId) return; const d = drag; drag = null; if (d.kind === 'pick' && !d.moved) pick(e); });
  cv.addEventListener('contextmenu', (e) => e.preventDefault());
  window.addEventListener('dragover', (e) => e.preventDefault()); window.addEventListener('drop', fileDrop); resize();
}

function detachedHtml() { return `<!doctype html><html><head><meta charset="utf-8"><title>${t('label.reference')}</title><style>
html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#1f1f1f;color:#a9a9a9;font:12px system-ui}
#cv{display:block;width:100vw;height:100vh;cursor:crosshair;touch-action:none}
#hint{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);pointer-events:none;white-space:nowrap}
#bar{position:fixed;left:8px;top:8px;display:flex;gap:6px;z-index:2;padding:5px;border:1px solid #3a3a3a;border-radius:9px;background:#202020cc;backdrop-filter:blur(8px)}
button{width:30px;height:30px;border:0;border-radius:7px;background:#303030;color:#f2f2f2;font:700 13px system-ui}button:hover{background:#4da3ff}#file{display:none}
</style></head><body><div id="bar"><button id="open" title="${t('reference.openImage')}">+</button><button id="rot" title="${t('reference.rotate90')}">R</button><button id="flip" title="${t('reference.flip')}">F</button><input id="file" type="file" accept="image/*" multiple></div><canvas id="cv"></canvas><div id="hint">${t('reference.emptyHint')}</div><script>(${detachedScript.toString()})()</script></body></html>`; }

function markDetachedClosed() {
  if (detachedPoll) clearInterval(detachedPoll);
  detachedPoll = null; detachedWin = null;
  const cb = closeCb; closeCb = null; if (cb) cb();
}

function watchDetached(onClosed) {
  clearInterval(detachedPoll); closeCb = onClosed;
  detachedPoll = setInterval(() => { if (!detachedWin || detachedWin.closed) markDetachedClosed(); }, 600);
  if (detachedPoll && detachedPoll.unref) detachedPoll.unref();
}

export function openDetached(e, dataUrl, onDropDataUrl, onClosed, onRotate, onFlip) {
  if (detachedOpen()) { detachedWin.focus(); return true; }
  const r = $('refwin').getBoundingClientRect(), w = Math.max(220, Math.round(r.width)), h = Math.max(180, Math.round(r.height));
  const left = Math.round(Number.isFinite(e && e.screenX) ? e.screenX - w / 2 : window.screenX + r.left);
  const top = Math.round(Number.isFinite(e && e.screenY) ? e.screenY - 18 : window.screenY + r.top);
  const p = window.open('', 'pxh-reference-detached', `popup=yes,width=${w},height=${h},left=${left},top=${top}`);
  if (!p) { toast(t('toast.refPopupBlocked')); return false; }
  detachedWin = p; p.document.open(); p.document.write(detachedHtml()); p.document.close();
  p.addEventListener('beforeunload', markDetachedClosed);
  window.__pxhReferencePick = (rgb) => actions.run('color.setActive', rgb);
  window.__pxhReferenceSetDataUrl = (url) => onDropDataUrl(url);
  window.__pxhReferenceRotate = onRotate; window.__pxhReferenceFlip = onFlip;
  watchDetached(onClosed); setTimeout(() => syncDetached(dataUrl), 0); return true;
}

export function bindDetachDrag(opts) {
  let d = null; const M = 24;
  $('refgrip').addEventListener('pointerdown', (e) => { if (e.button !== 0 || (e.target.closest && e.target.closest('button'))) return; d = { id: e.pointerId }; }, true);
  window.addEventListener('pointermove', (e) => { if (!d || e.pointerId !== d.id) return;
    if (e.clientX < -M || e.clientY < -M || e.clientX > innerWidth + M || e.clientY > innerHeight + M) {
      d = null; if (openDetached(e, opts.dataUrl(), opts.add, opts.closed, opts.rotate, opts.flip)) opts.closeLocal();
    } }, true);
  window.addEventListener('pointerup', (e) => { if (d && e.pointerId === d.id) d = null; }, true);
  window.addEventListener('pointercancel', () => { d = null; }, true);
}
