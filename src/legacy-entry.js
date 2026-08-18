// Temporary one-way seam: the preserved interface owns gestures while typed
// brush services own .brush files and Brush Studio. Delete after full UI port.
import './app.js';
import * as actions from './core/actions.ts';
import * as bus from './core/bus.ts';
import { showMenuAt } from './ui/dom/ShellDom.ts';
import { floatingWindow } from './ui/windows/FloatingWindow.ts';
import { attachReorder } from './ui/shell/ReorderGesture.ts';
import { setStampBrush } from './core/stamp-brush.js';
import { S } from './core/state.js';
import { saveBrushPrefs } from './core/brush-prefs.js';
import { BP_SMAX } from './config/limits.ts';
import { legacyBrushStamp } from './logic/brush/legacyBrushAdapter.ts';
import { savedBrushControls } from './logic/brush/savedBrushControls.ts';
import { mountOriginalInterfaceBridge } from './main.ts';

const compactBrushShell = {
  registerOpen(handler) { actions.registerOrReplace('ui.brushLibrary', handler); },
  mountFloating(panel, grip, handle, onClose) {
    floatingWindow(panel, { grip, handle, storeKey: 'brushwin', minW: 240,
      minH: 220, onClose });
  },
  showMenu(menu, x, y, preferAbove = false) { showMenuAt(menu, x, y, preferAbove); },
  attachReorder(tile, save, squelch) {
    attachReorder(tile, { dropSel: '#brush-list', itemSel: '.btile', save, squelch });
  },
  selectLegacyBrush(id, brush, mode) {
    const changed = S.stampBrush[mode]?.id !== id;
    const stamp = legacyBrushStamp(brush);
    setStampBrush(mode, { id, name: brush.name, source: 'prodraw-raster',
      shape: 'shape', cov: stamp.coverage, grain: stamp.grain,
      params: stamp.params, smudge: brush.smudge, loaded: brush });
    if (changed && S.brushes[mode]) {
      const controls = savedBrushControls(brush, BP_SMAX);
      S.brushes[mode].size = controls.size;
      S.brushes[mode].op = controls.opacity;
      saveBrushPrefs(S);
    }
    bus.emit('brush'); bus.emit('brushlib'); bus.emit('render');
  },
};

mountOriginalInterfaceBridge(compactBrushShell).catch((error) => {
  console.error('ProDraw compact brush library failed', error);
});
