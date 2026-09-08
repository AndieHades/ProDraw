export async function penBrushProperties() {
  const { S } = await import('/src/core/state.ts');
  const actions = await import('/src/core/actions.ts');
  const { presetBrushForShape } = await import('/src/systems/draw/preset-brush.ts');
  const { newWork } = await import('/src/systems/gallery/doc.js');
  const { hide } = await import('/src/systems/gallery/index.js');
  const { layerCanvas } = await import('/src/core/layer-cache.js');
  const { rememberBrushToolControls } = await import('/src/core/brush/liveBrushToolControls.ts');
  const { presetStrokeActive } = await import('/src/systems/draw/preset-stroke.ts');
  const assert = (ok, message) => { if (!ok) throw new Error(message); };
  const frame = () => new Promise(requestAnimationFrame);
  S.tool = 'pencil'; S.brushShape.pencil = 'preset:lineart';
  actions.run('ui.brushLibrary');
  for (let i = 0; i < 240 && document.querySelector('#brush-edit')?.disabled; i++) await frame();
  const edit = document.querySelector('#brush-edit');
  assert(edit && !edit.disabled, 'Settings button is unavailable'); edit.click();
  for (let i = 0; i < 240 && !document.querySelector('#live-brush-settings'); i++) await frame();
  const change = (path, value) => {
    const control = document.querySelector(`[data-brush-control="${path}"]`);
    assert(control, 'Missing control ' + path); control.value = String(value);
    control.dispatchEvent(new Event('input', { bubbles: true }));
  };
  const originalFlow = presetBrushForShape(S.brushShape.pencil).rendering.flow;
  change('rendering.flow', 0.2); document.querySelector('[data-brush-reset]').click();
  assert(presetBrushForShape(S.brushShape.pencil).rendering.flow === originalFlow, 'Reset failed');
  change('rendering.flow', 0);
  assert(presetBrushForShape(S.brushShape.pencil).rendering.flow === 0, 'Flow was not applied');
  document.querySelector('#live-brush-settings').close();
  const paint = async () => {
    newWork(240, 160, 'Live property verification'); hide();
    S.pencilSize = 24; S.brushOpacity.pencil = 1;
    await frame();
    const canvas = document.getElementById('cv'), rect = canvas.getBoundingClientRect();
    for (let i = 0; i <= 20; i++) {
      const type = i === 0 ? 'pointerdown' : i === 20 ? 'pointerup' : 'pointermove';
      const event = new PointerEvent(type, { bubbles: true, pointerId: 9,
        pointerType: 'pen', button: i > 0 && i < 20 ? -1 : 0, buttons: i === 20 ? 0 : 1,
        pressure: i === 20 ? 0 : 0.8, tiltX: 15, tiltY: -8,
        clientX: rect.left + S.view.ox + (40 + i * 8) * S.view.zoom,
        clientY: rect.top + S.view.oy + 80 * S.view.zoom });
      Object.defineProperty(event, 'timeStamp', { value: i * 8 }); canvas.dispatchEvent(event);
      if (i === 0) assert(presetStrokeActive(), 'Property check bypassed the brush engine');
    }
    await frame();
    const rgba = layerCanvas(S.cur).getContext('2d').getImageData(0, 0, S.W, S.H).data;
    return rgba.reduce((sum, value, index) => sum + (index % 4 === 3 ? value : 0), 0);
  };
  assert(await paint() === 0, 'Zero flow still paints');
  actions.run('ui.brushSettings');
  for (let i = 0; i < 120 && !document.querySelector('#live-brush-settings'); i++) await frame();
  change('rendering.flow', 0.6); change('strokePath.spacing', 0.08);
  change('dynamics.sizeByPressure', 0.7);
  document.querySelector('#live-brush-settings').close();
  assert(await paint() > 0, 'Restored flow does not paint');
  S.pencilSize = 27; S.brushOpacity.pencil = 0.65; rememberBrushToolControls();
  localStorage.setItem('simpleBrushShapes', JSON.stringify(S.brushShape));
  actions.run('ui.brushSettings');
  for (let i = 0; i < 120 && !document.querySelector('#live-brush-settings'); i++) await frame();
  const dialog = document.querySelector('#live-brush-settings').getBoundingClientRect();
  const controls = document.querySelector('.live-brush-controls');
  assert(controls.scrollWidth === controls.clientWidth, 'Settings have horizontal overflow');
  for (const button of document.querySelectorAll('#live-brush-settings footer button')) {
    const rect = button.getBoundingClientRect();
    assert(rect.bottom <= dialog.bottom && rect.right <= dialog.right, 'Settings button is clipped');
  }
  return { flowPaintVerified: true, resetVerified: true, selected: S.brushShape.pencil };
}

export async function verifyPenBrushPreferences() {
  const { S } = await import('/src/core/state.ts');
  const { restoreSelectedPresets } = await import('/src/systems/draw/brush-library-panel.ts');
  const { presetBrushForShape } = await import('/src/systems/draw/preset-brush.ts');
  await restoreSelectedPresets();
  const brush = presetBrushForShape(S.brushShape.pencil);
  if (!brush || brush.rendering.flow !== 0.6 || brush.strokePath.spacing !== 0.08 ||
    Math.abs(brush.dynamics.sizeByPressure - 0.7) > 0.0001 ||
    S.pencilSize !== 27 || S.brushOpacity.pencil !== 0.65) throw new Error('Brush preferences lost on restart');
  return { preferencesRestored: true };
}
