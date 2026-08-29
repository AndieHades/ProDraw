// Legacy composition bridge. Trim decisions live in typed TrimSystem; this file
// only injects the current state, bounds, history and feedback owners.
import { S } from '../core/state.js';
import * as actions from '../core/actions.ts';
import { activeTimelineBounds } from '../core/animation-canvas.js';
import { boundsFor, canvasContentBounds } from '../core/canvas-bounds.js';
import { applyCropRect } from '../core/document.js';
import { selectedFolderTargets, selectedLayerTargets } from '../core/targets.js';
import { toast, t } from '../ui/dom/ShellDom.ts';
import { TrimSystem } from './trim/TrimSystem.ts';

const system = new TrimSystem({
  apply: (bounds) => applyCropRect(bounds.minx, bounds.miny, bounds.maxx, bounds.maxy),
  canvasBounds: () => activeTimelineBounds((layers, folders) =>
    boundsFor(layers, folders), canvasContentBounds),
  dimensions: () => ({ width: S.W, height: S.H }),
  feedback: (key) => toast(t(`toast.${key}`)),
  selectedBounds: () => boundsFor(selectedLayerTargets(), selectedFolderTargets()),
});

export const trimCanvas = () => system.trimCanvas();
export const trimSelectedLayers = () => system.trimSelectedLayers();
actions.register('canvas.trim', trimCanvas);
actions.register('canvas.trimSelected', trimSelectedLayers);
