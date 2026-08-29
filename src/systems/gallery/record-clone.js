import { cloneFx, cloneLayerRecord } from '../../core/state.js';
import { ANIMATION } from '../../config/animation.ts';
import { AUTOSAVE_CLONE_YIELD_ROWS, AUTOSAVE_IDLE_TIMEOUT_MS } from '../../config/timings.ts';
import { normalizeAnimator } from '../../logic/animation-data.ts';
import { cloneGrid, sparseGridStats } from '../../logic/raster.js';
import { createRasterCellInterner } from '../../logic/raster-cell-interner.js';

export function yieldToGalleryIdle() {
  return new Promise((resolve) => {
    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(resolve, { timeout: AUTOSAVE_IDLE_TIMEOUT_MS });
    } else setTimeout(resolve, 0);
  });
}

const arrayIndex = (key, length) => { const index = Number(key);
  return Number.isInteger(index) && index >= 0 && index < length &&
    String(index) === key ? index : -1; };

function persistedSparseRows(grid) {
  if (!Array.isArray(grid) || !grid.length) return null;
  const rows = Object.keys(grid).map((key) => arrayIndex(key, grid.length))
    .filter((index) => index >= 0);
  return rows.length < grid.length ? rows : null;
}

function clonePersistedSparseGrid(grid, rows, bounds, isCurrent) {
  const output = new Array(grid.length), cells = createRasterCellInterner();
  for (const y of rows) {
    if (!isCurrent()) return null;
    const row = grid[y] || [], copy = new Array(row.length); output[y] = copy;
    if (bounds === null || (bounds && (y < bounds.miny || y > bounds.maxy))) continue;
    const minx = bounds ? Math.max(0, bounds.minx) : 0;
    const maxx = bounds ? Math.min(row.length - 1, bounds.maxx) : row.length - 1;
    for (const key of Object.keys(row)) { const x = arrayIndex(key, row.length);
      if (x >= minx && x <= maxx && row[x]) copy[x] = cells.copy(row[x]); }
  }
  return output;
}

export async function cloneGridIdle(grid, bounds, isCurrent,
  yieldWork = yieldToGalleryIdle) {
  if (!isCurrent()) return null;
  // The canonical raster backing already knows its stored rows/cells. Walking
  // every empty A4 row through requestIdleCallback made a blank New document
  // look frozen for seconds and could leave the dialog busy. Clone it directly
  // in O(painted cells); dense compatibility grids keep the cancellable path.
  if (sparseGridStats(grid)) return cloneGrid(grid, true);
  // IndexedDB preserves sparse Array holes but strips the bridge's prototype
  // metadata. Reuse those stored row/cell keys instead of yielding for every
  // empty canvas row, which made edited layered PSD files look impossible to open.
  const storedRows = persistedSparseRows(grid);
  if (storedRows) return clonePersistedSparseGrid(grid, storedRows, bounds, isCurrent);
  const output = new Array(grid.length);
  const cells = createRasterCellInterner();
  for (let y = 0; y < grid.length; y++) {
    if (!isCurrent()) return null;
    const row = grid[y] || [], copy = new Array(row.length); output[y] = copy;
    if (bounds !== null && (bounds === undefined ||
      (y >= bounds.miny && y <= bounds.maxy))) {
      const minx = bounds ? Math.max(0, bounds.minx) : 0;
      const maxx = bounds ? Math.min(row.length - 1, bounds.maxx) : row.length - 1;
      for (let x = minx; x <= maxx; x++) if (row[x]) copy[x] = cells.copy(row[x]);
    }
    if ((y + 1) % AUTOSAVE_CLONE_YIELD_ROWS === 0) await yieldWork();
  }
  return isCurrent() ? output : null;
}

export async function cloneLayersIdle(layers, boundsFor, isCurrent,
  yieldWork = yieldToGalleryIdle) {
  const output = [];
  for (let index = 0; index < layers.length; index++) {
    const grid = await cloneGridIdle(layers[index].grid, boundsFor(index),
      isCurrent, yieldWork);
    if (!grid) return null;
    output.push(cloneLayerRecord(layers[index], { grid }));
  }
  return output;
}

const cloneBg = (bg) => ({ color: bg?.color ? bg.color.slice(0, 3) : null,
  visible: bg?.visible !== false });
const cloneFolders = (folders = []) => folders.map((folder) =>
  ({ ...folder, effects: cloneFx(folder.effects),
    psdEffects: structuredClone(folder.psdEffects || []) }));

async function cloneFrameIdle(frame, live, isCurrent, yieldWork) {
  const source = live || frame;
  const layers = await cloneLayersIdle(source.layers || [], () => undefined,
    isCurrent, yieldWork);
  if (!layers) return null;
  return { id: frame.id, name: frame.name, duration: frame.duration ?? null,
    rev: (frame.rev || 0) + (live ? 1 : 0), layers,
    folders: cloneFolders(source.folders), bg: cloneBg(source.bg),
    cur: source.cur || 0, layerSeq: source.layerSeq || 1,
    folderSeq: source.folderSeq || 0 };
}

export async function cloneAnimatorIdle(animator, liveFrameId, liveFrame,
  isCurrent, yieldWork = yieldToGalleryIdle) {
  if (!animator) return null;
  const frames = {};
  for (const [id, frame] of Object.entries(animator.frames || {})) {
    const clone = await cloneFrameIdle(frame, id === liveFrameId ? liveFrame : null,
      isCurrent, yieldWork);
    if (!clone) return undefined;
    frames[id] = clone;
  }
  return normalizeAnimator({ open: !!animator.open,
    activeTimelineId: animator.activeTimelineId, frameSeq: animator.frameSeq || 0,
    timelineSeq: animator.timelineSeq || 0,
    timelines: (animator.timelines || []).map((timeline) =>
      ({ ...timeline, frameIds: (timeline.frameIds || []).slice() })),
    frames, onion: { ...ANIMATION.onion, ...(animator.onion || {}) },
    liveFrameId: animator.liveFrameId || null,
    playheadFrameId: animator.playheadFrameId || null });
}
