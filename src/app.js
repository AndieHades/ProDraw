import { S } from './core/state.js';
import * as bus from './core/bus.ts';
import { floatingWindow, nextFloatingZ } from './core/floating-window.js';
import { fitView } from './systems/render/index.js';
import { detect, applyDom } from './i18n/index.ts';
import { applyTheme } from './styles/theme.ts';
import { refreshColors } from './styles/canvas-colors.ts';
import * as palette from './systems/palette.js';
import * as brushBar from './systems/brush-bar.js';
import * as brushResize from './systems/brush-resize.js';
import * as colorPicker from './systems/color-picker.js';
import * as toolbars from './systems/toolbars.js';
import * as grid from './systems/grid.js';
import * as tile from './systems/tile.js';
import * as symmetryLines from './systems/symmetry-lines.js';
import * as layersUI from './systems/layers/index.js';
import * as fontLibrary from './systems/font-library/index.js';
import * as importSys from './systems/import/index.js';
import * as importEditor from './systems/import/editor.js';
import * as exportSys from './systems/export/index.js';
import * as palManager from './systems/palette-manager.js';
import * as shading from './systems/shading.js';
import * as tintShade from './systems/tint-shade/index.js';
import * as preview from './systems/preview-window.js';
import * as reference from './systems/reference-window.js';
import * as input from './systems/input/index.js';
import * as crop from './systems/crop.js';
import * as transform from './systems/transform/index.js';
import * as effects from './systems/effects/index.js';
import * as bc from './systems/brightness-contrast.js';
import * as adjust from './systems/draw/adjust.js';
import * as gallery from './systems/gallery/index.js';
import * as newCanvas from './systems/new-canvas.js';
import * as settings from './systems/settings.js';
import * as panels from './ui/shell/PanelOrderPresenter.ts';
import * as selBar from './systems/selection/bar.js';
import * as lasso from './systems/freehand/panel.js';
import * as eyedropper from './systems/eyedropper/index.js';
import * as penButton from './systems/pen-button.js';
import * as status from './systems/status.js';
import * as toolpops from './systems/toolpops.js';
import * as textTool from './systems/text-tool/index.js';
import * as animation from './systems/animation/index.js';
import { mountPreservedShellLayout } from './ui/shell/PreservedShellLayout.ts';
import './systems/draw/tools.js';
import './systems/move-tool.js';
import './systems/selection/input.js';
import './systems/selection/handles.js';
import './systems/selection/clipboard.js';
import './systems/freehand/input.js';
import './systems/rotate-canvas.js';
import './systems/flip.js';
import './systems/trim.js';
import './systems/layer-center.js';
import './systems/mono.js';
import './systems/recolor.js';
import './systems/free-rotate.js';
import { mount as mountKeyboard } from './systems/keyboard/index.js';
import * as xMirror from './systems/x-mirror.js';

const MOUNTS = [palette, brushBar, brushResize, colorPicker, toolbars, grid, symmetryLines, layersUI, fontLibrary, importSys, importEditor, exportSys, palManager, shading, tintShade, preview, reference, animation, input, crop, transform, effects, bc, adjust, gallery, newCanvas, settings, panels, selBar, lasso, eyedropper, penButton, status, toolpops, xMirror, tile, textTool];

export function start() {
  detect(); applyTheme(); refreshColors();
  for (const m of MOUNTS) if (m.mount) m.mount();
  mountKeyboard();
  applyDom(); // проставить переводы в статичный UI

  mountPreservedShellLayout({ fitView, floatingWindow, nextFloatingZ });
}

start();
window.__app = { S, bus, start }; // для headless-boot теста
