// Runs inside the production browser; every mark goes through canvas pointer events.
export async function penBrushVisual() {
  const { S } = await import('/src/core/state.ts');
  const { newWork } = await import('/src/systems/gallery/doc.js');
  const { hide } = await import('/src/systems/gallery/index.js');
  const { ensurePresetBrush, presetBrushForShape, presetEngine } = await import('/src/systems/draw/preset-brush.ts');
  const { layerCanvas } = await import('/src/core/layer-cache.js');
  const { presetStrokeActive } = await import('/src/systems/draw/preset-stroke.ts');
  const decoded = await ensurePresetBrush('lineart');
  if (!decoded?.shapeMap || !presetEngine()) throw new Error('Lineart engine or native shape missing');
  newWork(1200, 1080, 'Lineart · pressure and curve verification'); hide();
  S.tool = 'pencil'; S.brushShape.pencil = 'preset:lineart';
  S.brushOpacity.pencil = 1; S.active = [20, 30, 40];
  if (!presetBrushForShape(S.brushShape.pencil)) throw new Error('Live Lineart is unavailable');
  await new Promise(requestAnimationFrame);
  const canvas = document.getElementById('cv'), rect = canvas.getBoundingClientRect();
  const sizes = [1, 3, 8, 24, 64, 128];
  for (const [row, size] of sizes.entries()) {
    S.pencilSize = size;
    for (let i = 0; i <= 240; i++) {
      const t = i / 240, x = 90 + t * 1020;
      const y = row * 180 + 90 + Math.sin(t * Math.PI * 3) * 30;
      const type = i === 0 ? 'pointerdown' : i === 240 ? 'pointerup' : 'pointermove';
      const event = new PointerEvent(type, { bubbles: true, pointerId: 5,
        pointerType: 'pen', buttons: i === 240 ? 0 : 1, button: type === 'pointermove' ? -1 : 0,
        clientX: rect.left + S.view.ox + x * S.view.zoom,
        clientY: rect.top + S.view.oy + y * S.view.zoom,
        pressure: i === 240 ? 0 : 0.08 + 0.92 * Math.sin(Math.PI * t), tiltX: 15, tiltY: -8 });
      Object.defineProperty(event, 'timeStamp', { value: (row * 300 + i) * 1000 / 240 });
      canvas.dispatchEvent(event);
      if (i === 0 && !presetStrokeActive()) throw new Error('Wrong stroke path: ' +
        JSON.stringify({ shape: S.brushShape.pencil, tool: S.tool, loaded: !!presetBrushForShape(S.brushShape.pencil) }));
    }
    await new Promise(requestAnimationFrame);
  }
  const layer = layerCanvas(S.cur), rgba = layer.getContext('2d').getImageData(0, 0, S.W, S.H).data;
  for (let row = 1; row < sizes.length; row++) for (let x = 220; x < 990; x++) {
    let coverage = 0;
    for (let y = row * 180; y < (row + 1) * 180; y++) coverage += rgba[(y * S.W + x) * 4 + 3];
    if (coverage === 0) throw new Error(`Lineart ${sizes[row]} px has a gap at ${x}`);
  }
  const sheet = document.createElement('canvas'); sheet.width = S.W; sheet.height = S.H;
  const ctx = sheet.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, S.W, S.H);
  ctx.drawImage(layer, 0, 0); ctx.fillStyle = '#52606d'; ctx.font = '16px sans-serif';
  sizes.forEach((size, row) => ctx.fillText(`${size} px`, 12, row * 180 + 24));
  return sheet.toDataURL('image/png').split(',')[1];
}
