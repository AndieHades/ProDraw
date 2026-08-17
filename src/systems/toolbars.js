import { S } from '../core/state.js';
import * as bus from '../core/bus.ts';
import * as actions from '../core/actions.ts';
import { setTool } from '../core/tools.js';
import { ensureSymmetryDefaults } from '../core/layers.js';
import { ToolPanelPresenter } from '../ui/shell/ToolPanelPresenter.ts';

const presenter = new ToolPanelPresenter({
  state: () => ({
    backgroundSelected: S.bgSel,
    fillShape: S.fillShape,
    lineMode: S.lineMode,
    rotationActive: Boolean(S.rotMode),
    selectionActive: Boolean(S.sel),
    shadingActive: Boolean(S.shading?.on || S.shading?.picking),
    shadingColorCount: S.shading?.colors?.length || 0,
    shapeTool: S.shapeTool,
    symEnabled: S.symEnabled !== false,
    symFlags: { sym: Boolean(S.sym), symH: Boolean(S.symH),
      symD1: Boolean(S.symD1), symD2: Boolean(S.symD2) },
    symLineMode: S.symLines?.mode ?? null,
    tool: S.tool,
  }),
  setTool,
  setLineMode: (mode) => { S.lineMode = mode; },
  setShape: (tool, fill) => { S.shapeTool = tool; S.fillShape[tool] = fill; },
  setSymEnabled: (enabled) => { S.symEnabled = enabled; },
  setSymLineMode: (mode) => {
    S.symLines ||= { x: null, y: null, d1: null, d2: null, mode: null, hover: null };
    S.symLines.mode = mode; S.symLines.hover = null;
  },
  toggleSymmetry: (flag) => { S[flag] = !S[flag]; return S[flag]; },
  ensureSymmetryDefaults,
  changed: (...events) => { for (const event of events) bus.emit(event); },
  subscribe: (event, listener) => { bus.on(event, listener); },
  run: (name, ...args) => actions.run(name, ...args),
  registerAction: (name, action) => { actions.register(name, action); },
  replaceAction: (name, action) => { actions.replace(name, action); },
});

presenter.registerActions();
export const mount = () => presenter.mount();
