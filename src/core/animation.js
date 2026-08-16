import { S, cloneFx, cloneLayer } from './state.js';
import * as bus from './bus.js';
import { dirtyAll } from './layer-cache.js';
import { paintStack } from './composite.js';
import { makeCanvas } from './canvas.js';
import { ANIMATION } from '../config/animation.js';
import { t } from '../i18n/index.js';
import {
  activeFrameId as modelActiveFrameId, activeTimeline as modelActiveTimeline,
  collectUnusedFrames, insertFrameId, makeAnimator, makeFrameMeta, makeTimeline,
  normalizeAnimator, removeFrameId, reorderFrameIds,
} from '../logic/animation-data.js';

const cloneBg = (bg) => ({ color: bg?.color ? bg.color.slice(0, 3) : null, visible: bg?.visible !== false });
const cloneFolders = (fs = []) => fs.map((f) => ({ ...f, effects: cloneFx(f.effects) }));
const clearTransient = () => {
  S.sel = S.selMask = S.selFloat = S.cropMode = S.rotMode = S.moveDrag = null;
  S.fxSel.clear(); S.fxCur = null; S.fxDraft = null; S.marked.clear(); S.markedFolders.clear();
};

export const activeTimeline = () => modelActiveTimeline(S.animator);
export const activeFrameId = () => modelActiveFrameId(S.animator);
export const liveFrameId = () => S.animator?.liveFrameId || activeFrameId();

export function frameFromLive(over = {}) {
  return {
    layers: S.layers.map((L) => cloneLayer(L)),
    folders: cloneFolders(S.folders),
    bg: cloneBg(S.bg), cur: S.cur, layerSeq: S.layerSeq, folderSeq: S.folderSeq,
    ...over,
  };
}

export function cloneFrame(frame, over = {}) {
  return {
    id: frame.id, name: frame.name, duration: frame.duration ?? null, rev: frame.rev || 0,
    layers: (frame.layers || []).map((L) => cloneLayer(L)),
    folders: cloneFolders(frame.folders),
    bg: cloneBg(frame.bg), cur: frame.cur || 0,
    layerSeq: frame.layerSeq || 1, folderSeq: frame.folderSeq || 0,
    ...over,
  };
}

export function cloneAnimator(anim = S.animator) {
  if (!anim) return null;
  const frames = {};
  for (const [id, fr] of Object.entries(anim.frames || {})) frames[id] = cloneFrame(fr);
  return normalizeAnimator({
    open: !!anim.open, activeTimelineId: anim.activeTimelineId,
    frameSeq: anim.frameSeq || 0, timelineSeq: anim.timelineSeq || 0,
    timelines: (anim.timelines || []).map((tl) => ({ ...tl, frameIds: (tl.frameIds || []).slice() })),
    frames, onion: { ...ANIMATION.onion, ...(anim.onion || {}) },
    liveFrameId: anim.liveFrameId || null, playheadFrameId: anim.playheadFrameId || null,
  });
}

export function ensureAnimator() {
  if (!S.animator) {
    S.animator = makeAnimator(frameFromLive());
    const id = activeFrameId(), tl = activeTimeline();
    if (id && S.animator.frames[id]) S.animator.frames[id].name = t('animation.frameName', { n: 1 });
    if (tl) tl.name = t('animation.timelineName', { n: 1 });
  }
  else S.animator = normalizeAnimator(S.animator);
  return S.animator;
}

export function saveActiveFrame() {
  const anim = S.animator; if (!anim) return null;
  const id = liveFrameId(); if (!id || !anim.frames[id]) return null;
  anim.frames[id] = cloneFrame({ ...frameFromLive(), id, name: anim.frames[id].name, duration: anim.frames[id].duration, rev: (anim.frames[id].rev || 0) + 1 });
  return anim.frames[id];
}

export function loadFrame(id, opts = {}) {
  const anim = ensureAnimator(), frame = anim.frames[id]; if (!frame) return false;
  clearTransient(); S.layers = frame.layers.map((L) => cloneLayer(L)); S.folders = cloneFolders(frame.folders);
  S.bg = cloneBg(frame.bg); S.cur = Math.min(frame.cur || 0, S.layers.length - 1);
  S.layerSeq = frame.layerSeq || S.layerSeq || 1; S.folderSeq = frame.folderSeq || S.folderSeq || 0;
  anim.liveFrameId = id; anim.playheadFrameId = opts.select === false ? id : null;
  if (opts.select !== false) activeTimeline().selectedFrameId = id;
  dirtyAll(); if (opts.emit !== false) { bus.emit('layers'); bus.emit('selection'); bus.emit('render'); bus.emit(opts.select === false ? 'animation-playhead' : 'animation-frame-loaded', id); }
  return true;
}

export function selectFrame(id) { ensureAnimator(); if (id === activeFrameId()) return true;
  saveActiveFrame(); const ok = loadFrame(id, { select: true }); if (ok) bus.emit('animation'); return ok; }

function addFrameFrom(source, nearId, after = true) {
  const anim = ensureAnimator(), tl = activeTimeline(), meta = makeFrameMeta(anim);
  anim.frames[meta.id] = cloneFrame(source, { ...meta, name: t('animation.frameName', { n: anim.frameSeq }) });
  insertFrameId(tl, meta.id, nearId, after); loadFrame(meta.id, { select: true }); bus.emit('animation'); return meta.id;
}

export function createFrame() { saveActiveFrame(); return addFrameFrom(S.animator.frames[activeFrameId()], activeFrameId(), true); }
export function duplicateFrame(id = activeFrameId()) { saveActiveFrame(); return addFrameFrom(S.animator.frames[id], id, true); }
export function insertFrame(id = activeFrameId(), after = true) { saveActiveFrame(); return addFrameFrom(S.animator.frames[id], id, after); }

export function deleteFrame(id = activeFrameId()) {
  const anim = ensureAnimator(), tl = activeTimeline(), next = removeFrameId(tl, id);
  if (!next) return false;
  for (const fid of collectUnusedFrames(anim)) delete anim.frames[fid];
  loadFrame(next, { select: true }); bus.emit('animation'); return true;
}

export function setFrameDuration(id, ms) { const fr = ensureAnimator().frames[id]; if (!fr) return false;
  fr.duration = ms > 0 ? Math.round(ms) : null; fr.rev = (fr.rev || 0) + 1; bus.emit('animation'); return true; }
export function reorderFrames(ids) { const ok = reorderFrameIds(activeTimeline(), ids); if (ok) bus.emit('animation'); return ok; }
export function setTimelineMode(mode) { activeTimeline().mode = mode; bus.emit('animation'); }
export function setTimelineFps(fps) { activeTimeline().fps = Math.max(1, Math.round(fps || ANIMATION.fps)); bus.emit('animation'); }

export function createTimeline(name) {
  saveActiveFrame(); const anim = ensureAnimator(), meta = makeFrameMeta(anim), source = anim.frames[activeFrameId()];
  anim.frames[meta.id] = cloneFrame(source, { ...meta, name: t('animation.frameName', { n: anim.frameSeq }) });
  const tl = makeTimeline(anim, [meta.id], { name: name || t('animation.timelineName', { n: anim.timelineSeq }) });
  anim.timelines.push(tl); anim.activeTimelineId = tl.id; loadFrame(meta.id, { select: true }); bus.emit('animation'); return tl.id;
}

export function renameTimeline(id, name) { const tl = ensureAnimator().timelines.find((x) => x.id === id); if (tl && name) { tl.name = name; bus.emit('animation'); } }
export function switchTimeline(id) { const anim = ensureAnimator(), tl = anim.timelines.find((x) => x.id === id); if (!tl) return false;
  saveActiveFrame(); anim.activeTimelineId = id; loadFrame(tl.selectedFrameId, { select: true }); bus.emit('animation'); return true; }

export function renderFrameToCanvas(id) {
  const anim = ensureAnimator(), live = frameFromLive(), frame = anim.frames[id]; if (!frame) return null;
  S.layers = frame.layers.map((L) => cloneLayer(L)); S.folders = cloneFolders(frame.folders); S.bg = cloneBg(frame.bg); S.cur = frame.cur || 0;
  dirtyAll(); const c = makeCanvas(S.W, S.H), x = c.getContext('2d'); x.imageSmoothingEnabled = false; paintStack(x, false, { bg: true });
  S.layers = live.layers; S.folders = live.folders; S.bg = live.bg; S.cur = live.cur; S.layerSeq = live.layerSeq; S.folderSeq = live.folderSeq; dirtyAll();
  return c;
}

export function syncHistoryFrame(ref) { if (!S.animator || !ref?.frameId || !S.animator.frames[ref.frameId]) return;
  S.animator.activeTimelineId = ref.timelineId || S.animator.activeTimelineId; const tl = activeTimeline(); if (tl) tl.selectedFrameId = ref.frameId;
  S.animator.liveFrameId = ref.frameId; S.animator.frames[ref.frameId] = cloneFrame({ ...frameFromLive(), id: ref.frameId, name: S.animator.frames[ref.frameId].name, duration: S.animator.frames[ref.frameId].duration });
}

export const historyRef = () => (S.animator ? { frameId: liveFrameId(), timelineId: S.animator.activeTimelineId } : null);
