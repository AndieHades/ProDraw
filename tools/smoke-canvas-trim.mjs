import { app, BrowserWindow } from 'electron';
import fs from 'node:fs';
const profile = fs.mkdtempSync('/tmp/prodraw-trim-browser-');
app.setPath('userData', profile);
const script = async () => {
  const { S, newLayer } = await import('/src/core/state.ts');
  const { newWork, saveCurrent, curWorkId } = await import('/src/systems/gallery/doc.js');
  const { hide } = await import('/src/systems/gallery/index.js');
  const { getDoc } = await import('/src/core/storage.ts');
  const { createPackedRgbaGrid } = await import('/src/logic/raster/PackedRgbaGrid.ts');
  const { packedRgbaRecordFromBitmap } = await import('/src/logic/raster/packedRgbaRecord.ts');
  const { dirtyAll, layerExtCanvas, clippedShift } = await import('/src/core/layer-cache.js');
  const { doUndo, doRedo } = await import('/src/core/history.js');
  const bus = await import('/src/core/bus.ts');
  const assert = (ok, message) => { if (!ok) throw new Error(message); };
  newWork(1600, 1200, 'Trim regression smoke'); hide();
  await saveCurrent();
  const bytes = new Uint8ClampedArray(1600 * 1200 * 4); bytes.fill(255);
  const dense = Array.from({ length: 6 }, (_, index) => {
    const layer = newLayer('Dense ' + index, 1600, 1200);
    layer.grid = createPackedRgbaGrid(packedRgbaRecordFromBitmap(1600, 1200,
      { left: 0, top: 0, width: 1600, height: 1200, rgba: bytes }));
    return layer;
  });
  const small = newLayer('Selection', 1600, 1200);
  small.grid[590][790] = [10, 20, 30, 255]; small.grid[609][809] = [40, 50, 60, 255];
  S.layers = [...dense, small]; S.cur = 6;
  dirtyAll({ preserveGridBounds: true }); bus.emitDoc(); bus.emit('fit');
  await new Promise(requestAnimationFrame);
  const original = dense[0].grid;
  let start = performance.now();
  const button = document.querySelector('#trim-selected');
  assert(button && button.onclick && !button.disabled, 'Trim button is not wired');
  button.click();
  const commandMs = performance.now() - start;
  await new Promise(requestAnimationFrame);
  assert(S.W === 20 && S.H === 20, 'Wrong selected trim bounds');
  assert(dense[0].ext.size === 1600 * 1200 - 400, 'Lost outside content');
  start = performance.now();
  const outside = layerExtCanvas(0, { minx: -790, miny: -590, maxx: -771, maxy: -571 });
  assert(outside.canvas.width === 20 && outside.canvas.height === 20, 'Wrong ext preview');
  assert(outside.canvas.getContext('2d').getImageData(0, 0, 1, 1).data[3] === 255,
    'Outside preview did not render');
  const previewMs = performance.now() - start;
  const clipped = clippedShift(1, 0, 0, 0, 0, 0);
  assert(clipped.canvas.width <= 20 && clipped.canvas.height <= 20, 'Clip preview became full size');
  start = performance.now();
  assert(await saveCurrent(), 'Save failed after crop');
  const saveMs = performance.now() - start;
  const record = await getDoc(curWorkId());
  assert(record.layers[0].ext.format === 'rgba-ext-rows-v1', 'Save expanded compact ext');
  doUndo(); assert(dense[0].grid === original && S.W === 1600, 'Undo failed');
  doRedo(); assert(S.W === 20 && dense[0].ext.get('-790,-590')[3] === 255, 'Redo failed');
  button.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
  await new Promise(requestAnimationFrame);
  assert(document.querySelector('#trim-choice').classList.contains('on'), 'Trim submenu did not open');
  assert(document.querySelectorAll('#trim-choice button svg').length === 2, 'Missing trim choice icons');
  start = performance.now();
  document.querySelector('[data-trim-mode="all"]').click();
  const restoreMs = performance.now() - start;
  assert(S.W === 1600 && S.H === 1200 && dense[0].ext.size === 0, 'All-layer fit did not restore canvas');
  assert(dense[0].grid[0][0][3] === 255, 'All-layer fit lost pixels');
  assert(button.dataset.i18nTitle === 'side.fitAllLayers', 'Main button did not remember all-layer fit');
  doUndo(); assert(S.W === 20, 'All-layer fit Undo failed');
  await new Promise(resolve => setTimeout(resolve, 2500));
  assert(S.W === 20, 'Delayed save changed canvas');
  return { ok: true, denseLayers: 6, commandMs, previewMs, saveMs, restoreMs,
    width: S.W, height: S.H, outsidePixelsPerLayer: dense[0].ext.size };
};
app.whenReady().then(async () => {
  const window = new BrowserWindow({ show: false, width: 1440, height: 960,
    webPreferences: { contextIsolation: true, nodeIntegration: false } });
  const errors = [];
  window.webContents.on('console-message', ({ level, message }) => {
    if (level === 'error') errors.push(message);
  });
  await window.loadURL('http://127.0.0.1:5179/');
  await new Promise(resolve => setTimeout(resolve, 1500));
  const result = await window.webContents.executeJavaScript('(' + script.toString() + ')()');
  console.log(JSON.stringify({ ...result, consoleErrors: errors }));
  if (errors.length) throw new Error('Browser logged errors');
  window.destroy(); app.quit();
}).catch(error => { console.error(error); app.exit(1); });
app.on('quit', () => fs.rmSync(profile, { recursive: true, force: true }));
