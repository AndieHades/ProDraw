import { app, BrowserWindow } from 'electron';
import fs from 'node:fs';
import { penBrushVisual } from './pen-brush-visual.mjs';
import { penBrushProperties, verifyPenBrushPreferences } from './pen-brush-properties.mjs';
const profile = fs.mkdtempSync('/tmp/prodraw-pen-browser-');
app.setPath('userData', profile);
const script = async () => {
  const { S } = await import('/src/core/state.ts');
  const { newWork } = await import('/src/systems/gallery/doc.js');
  const { hide } = await import('/src/systems/gallery/index.js');
  const { ensurePresetBrush } = await import('/src/systems/draw/preset-brush.ts');
  const { presetStrokeActive } = await import('/src/systems/draw/preset-stroke.ts');
  const { doUndo, doRedo } = await import('/src/core/history.js');
  const { contentRevision } = await import('/src/core/layer-cache.js');
  const { layerCanvas } = await import('/src/core/layer-cache.js');
  const results = [];
  const frame = () => new Promise(requestAnimationFrame);
  for (const id of ['lineart', 'big_soft_brush', 'pencil_waxy']) {
    const brush = await ensurePresetBrush(id);
    if (!brush || (id === 'lineart' && !brush.shapeMap)) throw new Error(id + ': shape not decoded');
    newWork(2480, 3508, 'Pen brush regression'); hide();
    S.tool = 'pencil'; S.pencilSize = id === 'lineart' ? 24 : 64;
    S.brushShape.pencil = 'preset:' + id; S.brushOpacity.pencil = 1;
    S.active = [20, 40, 80];
    await frame(); await frame();
    const canvas = document.getElementById('cv'), rect = canvas.getBoundingClientRect();
    const event = (type, step) => { const pointer = new PointerEvent(type, { bubbles: true,
      pointerId: 7, pointerType: 'pen', button: type === 'pointermove' ? -1 : 0,
      buttons: type === 'pointerup' ? 0 : 1,
      clientX: rect.left + S.view.ox + (200 + step * 5) * S.view.zoom,
      clientY: rect.top + S.view.oy + (600 + Math.sin(step / 24) * 100) * S.view.zoom,
      pressure: type === 'pointerup' ? 0 : 0.05 + Math.sin(step / 240 * Math.PI) * 0.9,
      tiltX: 15, tiltY: -8 });
      Object.defineProperty(pointer, 'timeStamp', { value: step * 1000 / 240 });
      return pointer; };
    const timings = [], frames = [];
    const before = contentRevision();
    canvas.dispatchEvent(event('pointerdown', 0));
    if (!presetStrokeActive()) throw new Error(id + ': brush engine was bypassed');
    for (let step = 4; step <= 240; step += 4) {
      const batch = [step - 3, step - 2, step - 1, step].map(i => event('pointermove', i));
      const parent = batch.at(-1);
      Object.defineProperty(parent, 'getCoalescedEvents', { value: () => batch });
      const start = performance.now(); canvas.dispatchEvent(parent);
      timings.push(performance.now() - start);
      await frame(); frames.push(performance.now() - start);
    }
    const start = performance.now(); canvas.dispatchEvent(event('pointerup', 242));
    const releaseMs = performance.now() - start; await frame();
    if (contentRevision() <= before || S.undoStack.length !== 1) throw new Error('Stroke missing');
    const pixels = layerCanvas(S.cur).getContext('2d').getImageData(180, 480, 1280, 240).data;
    if (!pixels.some((value, index) => index % 4 === 3 && value > 0)) throw new Error('Empty stroke');
    doUndo(); doRedo(); await frame();
    const restored = layerCanvas(S.cur).getContext('2d').getImageData(180, 480, 1280, 240).data;
    if (!restored.every((value, index) => value === pixels[index])) throw new Error('Redo mismatch');
    const percentile = (values, p) => [...values].sort((a, b) => a - b)[Math.floor((values.length - 1) * p)];
    results.push({ id, shape: brush.shapeMap && [brush.shapeMap.width, brush.shapeMap.height],
      grain: brush.grainMap && [brush.grainMap.width, brush.grainMap.height],
      settings: { spacing: brush.strokePath.spacing, stabilization: brush.stabilization,
        shape: brush.shape, grain: brush.grain, dynamics: brush.dynamics, taper: brush.taper },
      inputP50: percentile(timings, 0.5), inputP95: percentile(timings, 0.95),
      frameP95: percentile(frames, 0.95), releaseMs });
  }
  return results;
};
app.whenReady().then(async () => {
  const window = new BrowserWindow({ show: false, width: 1440, height: 960,
    webPreferences: { contextIsolation: true, nodeIntegration: false } });
  const errors = [];
  window.webContents.on('console-message', ({ level, message }) => {
    if (level === 'error') errors.push(message);
  });
  await window.loadURL(process.env.PRODRAW_SMOKE_URL ?? 'http://127.0.0.1:5179/');
  await new Promise(resolve => setTimeout(resolve, 1500));
  if (process.env.PRODRAW_PROFILE) {
    window.webContents.debugger.attach('1.3');
    await window.webContents.debugger.sendCommand('Profiler.enable');
    await window.webContents.debugger.sendCommand('Profiler.start');
  }
  const results = process.env.PRODRAW_VISUAL_ONLY || process.env.PRODRAW_SKIP_TIMING ? [] :
    await window.webContents.executeJavaScript('(' + script.toString() + ')()');
  if (process.env.PRODRAW_PROFILE) {
    const { profile } = await window.webContents.debugger.sendCommand('Profiler.stop');
    fs.writeFileSync('/tmp/prodraw-pen.cpuprofile', JSON.stringify(profile));
  }
  const png = await window.webContents.executeJavaScript('(' + penBrushVisual.toString() + ')()');
  const prefix = process.env.PRODRAW_VISUAL_PREFIX ?? '/tmp/prodraw-lineart-after';
  fs.writeFileSync(prefix + '.png', Buffer.from(png, 'base64'));
  fs.writeFileSync(prefix + '-app.png', (await window.webContents.capturePage()).toPNG());
  let properties = null, restored = null;
  if (!process.env.PRODRAW_VISUAL_ONLY) {
    properties = await window.webContents.executeJavaScript('(' + penBrushProperties.toString() + ')()');
    fs.writeFileSync(prefix + '-settings.png', (await window.webContents.capturePage()).toPNG());
    await window.loadURL(process.env.PRODRAW_SMOKE_URL ?? 'http://127.0.0.1:5179/');
    await new Promise(resolve => setTimeout(resolve, 1500));
    restored = await window.webContents.executeJavaScript('(' + verifyPenBrushPreferences.toString() + ')()');
  }
  console.log(JSON.stringify({ results, properties, restored, consoleErrors: errors }));
  if (errors.length) throw new Error('Browser logged errors');
  if (process.env.PRODRAW_PERFORMANCE_GATE) {
    const budget = await window.webContents.executeJavaScript(
      "import('/src/config/performance.ts').then(m => m.PERFORMANCE_BUDGETS.pointerKernelP95Milliseconds)");
    if (results.some(result => result.inputP95 > budget)) throw new Error('Pen input p95 exceeds ' + budget + ' ms');
  }
  window.destroy(); app.quit();
}).catch(error => { console.error(error); app.exit(1); });
app.on('quit', () => fs.rmSync(profile, { recursive: true, force: true }));
