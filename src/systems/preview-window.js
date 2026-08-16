// Окно 1:1: живой предпросмотр в реальном размере (пан/зум, кнопка 1:1).
import { S } from '../core/state.js';
import * as bus from '../core/bus.js';
import { $ } from '../core/dom.js';
import { compositeLayers } from '../core/layer-cache.js';
import { floatingWindow } from '../core/floating-window.js';
import { attachPanZoom } from '../core/pan-zoom.js';
import { makeCanvas, syncCanvasSize } from '../core/canvas.js';

let prevOn = false; const pv = { z: 0, x: 0, y: 0 }; let prevComp = null;
const pcv = () => $('prevcv');

function prevComposite() { if (!prevComp) prevComp = makeCanvas(S.W, S.H);
  if (prevComp.width !== S.W) prevComp.width = S.W; if (prevComp.height !== S.H) prevComp.height = S.H;
  const px = prevComp.getContext('2d'); px.clearRect(0, 0, S.W, S.H); px.imageSmoothingEnabled = false; compositeLayers(px); return prevComp; }

function prevReset() { const c = pcv(), cw = c.clientWidth || 200, ch = c.clientHeight || 200;
  pv.z = 1; pv.x = Math.round((cw - S.W) / 2); pv.y = Math.round((ch - S.H) / 2); }

function syncPrev() { if (!prevOn) return; const cv = pcv();
  const dpr = window.devicePixelRatio || 1, cw = cv.clientWidth, ch = cv.clientHeight;
  syncCanvasSize(cv, cw, ch, dpr);
  if (pv.z <= 0) prevReset();
  const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, cw, ch); c.imageSmoothingEnabled = false;
  c.drawImage(prevComposite(), pv.x, pv.y, S.W * pv.z, S.H * pv.z); }

function togglePrev(on) { prevOn = on === undefined ? !prevOn : on;
  $('prevwin').classList.toggle('on', prevOn); $('prev').classList.toggle('on', prevOn);
  if (prevOn) requestAnimationFrame(() => { prevReset(); syncPrev(); }); }

export function mount() {
  $('prev').onclick = () => togglePrev(); $('prev-x').onclick = () => togglePrev(false);
  $('prev-1to1').onclick = () => { prevReset(); syncPrev(); };
  floatingWindow($('prevwin'), { grip: $('prevgrip'), handle: $('prevrsz'), clampRight: 70,
    onResize: (w, h) => { $('prevwin').style.width = Math.max(120, Math.min(innerWidth - 12, w)) + 'px';
      $('prevwin').style.height = Math.max(110, Math.min(innerHeight - 12, h)) + 'px'; syncPrev(); } });
  attachPanZoom(pcv(), pv, { min: 0.1, max: 40, render: syncPrev });
  bus.on('render', syncPrev);
}
