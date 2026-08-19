// Temporary one-way seam: the preserved interface owns gestures while typed
// brush services own .brush files and Brush Studio. Delete after full UI port.
import './app.js';
import * as actions from './core/actions.ts';
import * as bus from './core/bus.ts';
import { showMenuAt } from './ui/dom/ShellDom.ts';
import { floatingWindow } from './ui/windows/FloatingWindow.ts';
import { attachReorder } from './ui/shell/ReorderGesture.ts';
import { selectLoadedStampBrush } from './core/stamp-brush.js';
import { legacyBrushStamp } from './logic/brush/legacyBrushAdapter.ts';
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
    selectLoadedStampBrush(mode, id, brush, legacyBrushStamp(brush));
    bus.emit('brush'); bus.emit('brushlib'); bus.emit('render');
  },
};

mountOriginalInterfaceBridge(compactBrushShell).catch((error) => {
  console.error('ProDraw compact brush library failed', error);
});
