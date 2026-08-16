

import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import { makeDom } from './harness.mjs';

const { window } = makeDom();
for (const k of ['document', 'requestAnimationFrame', 'cancelAnimationFrame', 'matchMedia', 'HTMLCanvasElement', 'Blob', 'File', 'Image', 'localStorage', 'getSelection', 'performance', 'window']) {
  try { Object.defineProperty(globalThis, k, { value: k === 'window' ? window : window[k], configurable: true, writable: true }); } catch (e) {}
}
globalThis.indexedDB = window.indexedDB = globalThis.indexedDB;
globalThis.confirm = () => true;
globalThis.URL.createObjectURL = () => 'blob:stub';
globalThis.URL.revokeObjectURL = () => {};

await import('../src/app.js');

assert.ok(window.__app && window.__app.S, 'window.__app is exposed');
assert.ok(document.querySelectorAll('#pal .sw:not(.plus)').length > 0, 'palette rendered');
assert.ok(document.getElementById('active').style.background, 'active color rendered');
assert.ok(document.getElementById('t-pencil').title.includes('(B)'), 'tooltip localized');
assert.ok(document.getElementById('cropbar').__fw, 'crop panel is draggable');
assert.ok(document.getElementById('selbar').__fw, 'selection panel is draggable');
assert.ok(parseFloat(document.getElementById('sidebar').style.minHeight) >= 80, 'sidebar minimum height applied');
const i18n = await import('../src/i18n/index.js');
i18n.setLocale('en'); assert.ok(document.getElementById('t-pencil').title === 'Pencil (B)', 'language change applied');
i18n.setLocale('ru'); assert.ok(document.getElementById('t-pencil').title === i18n.t('tool.pencil'), 'language changed back');
console.log("Boot test passed");
console.log(`  palette swatches: ${document.querySelectorAll('#pal .sw:not(.plus)').length}`);
