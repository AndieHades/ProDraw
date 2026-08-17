import { cloneFx, cloneLayer } from '../../core/state.js';
import { ANIMATION } from '../../config/animation.js';
import { AUTOSAVE_CLONE_YIELD_ROWS, AUTOSAVE_IDLE_TIMEOUT_MS } from '../../config/timings.js';
import { normalizeAnimator } from '../../logic/animation-data.js';

export function yieldToGalleryIdle() {
  return new Promise((resolve) => {
    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(resolve, { timeout: AUTOSAVE_IDLE_TIMEOUT_MS });
    } else setTimeout(resolve, 0);
  });
}

export async function cloneGridIdle(grid, bounds, isCurrent,
  yieldWork = yieldToGalleryIdle) {
  const output = new Array(grid.length);
  for (let y = 0; y < grid.length; y++) {
    if (!isCurrent()) return null;
    const row = grid[y] || [], copy = new Array(row.length); output[y] = copy;
    if (bounds !== null && (bounds === undefined ||
      (y >= bounds.miny && y <= bounds.maxy))) {
      const minx = bounds ? Math.max(0, bounds.minx) : 0;
      const maxx = bounds ? Math.min(row.length - 1, bounds.maxx) : row.length - 1;
      for (let x = minx; x <= maxx; x++) if (row[x]) copy[x] = row[x].slice();
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
    output.push(cloneLayer(layers[index], { grid }));
  }
  return output;
}

const cloneBg = (bg) => ({ color: bg?.color ? bg.color.slice(0, 3) : null,
  visible: bg?.visible !== false });
const cloneFolders = (folders = []) => folders.map((folder) =>
  ({ ...folder, effects: cloneFx(folder.effects) }));

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
