


import { JSDOM } from 'jsdom';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function fakeCtx() {
  const noop = () => {};
  const img = (w, h) => ({ data: new Uint8ClampedArray(Math.max(0, w) * Math.max(0, h) * 4), width: w, height: h });
  return new Proxy({
    canvas: null,
    createImageData: (w, h) => img(w, h),
    getImageData: (x, y, w, h) => img(w, h),
    putImageData: noop, drawImage: noop, save: noop, restore: noop,
    beginPath: noop, closePath: noop, rect: noop, clip: noop, fill: noop, stroke: noop,
    fillRect: noop, strokeRect: noop, clearRect: noop, moveTo: noop, lineTo: noop, arc: noop,
    setLineDash: noop, setTransform: noop, translate: noop, rotate: noop, scale: noop,
    fillText: noop, measureText: () => ({ width: 0 }),
  }, { get(t, p) { return p in t ? t[p] : (t[p] = undefined); }, set(t, p, v) { t[p] = v; return true; } });
}

export function makeDom() {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const dom = new JSDOM(html, { url: 'http://localhost/', runScripts: 'outside-only', pretendToBeVisual: true });
  const { window } = dom;

  const proto = window.HTMLCanvasElement.prototype;
  proto.getContext = function () { if (!this.__ctx) { this.__ctx = fakeCtx(); this.__ctx.canvas = this; } return this.__ctx; };
  proto.toDataURL = () => 'data:image/png;base64,';
  proto.toBlob = (cb) => cb(new window.Blob([], { type: 'image/png' }));
  window.HTMLAnchorElement.prototype.click = () => {};

  window.requestAnimationFrame = (cb) => { cb(0); return 0; };
  window.cancelAnimationFrame = () => {};
  window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
  window.URL.createObjectURL = () => 'blob:stub';
  window.URL.revokeObjectURL = () => {};
  window.scrollTo = () => {};

  return {
    window,
    run(code) { return vm.runInContext(code, dom.getInternalVMContext()); },
    concat(files) { return files.map((f) => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n;\n'); },
  };
}
