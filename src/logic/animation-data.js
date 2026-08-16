import { ANIMATION, ANIMATION_MODES } from '../config/animation.js';

const frameName = (n) => 'Frame ' + n;
const timelineName = (n) => 'Timeline ' + n;
const frameId = (n) => 'fr-' + n;
const timelineId = (n) => 'tl-' + n;

export const nextFrameId = (anim) => frameId((anim.frameSeq || 0) + 1);
export const nextTimelineId = (anim) => timelineId((anim.timelineSeq || 0) + 1);
export const safeMode = (mode) => (ANIMATION_MODES.includes(mode) ? mode : ANIMATION.mode);

export function makeFrameMeta(anim, over = {}) {
  const n = (anim.frameSeq || 0) + 1;
  anim.frameSeq = n;
  return { id: frameId(n), name: over.name || frameName(n), duration: over.duration ?? null, rev: 0 };
}

export function makeTimeline(anim, frameIds, over = {}) {
  const n = (anim.timelineSeq || 0) + 1;
  anim.timelineSeq = n;
  return {
    id: timelineId(n),
    name: over.name || timelineName(n),
    frameIds: frameIds.slice(),
    fps: over.fps || ANIMATION.fps,
    mode: safeMode(over.mode),
    selectedFrameId: over.selectedFrameId || frameIds[0],
  };
}

export function makeAnimator(firstFrame) {
  const anim = {
    open: false, activeTimelineId: null, frameSeq: 0, timelineSeq: 0,
    timelines: [], frames: {}, onion: { ...ANIMATION.onion },
    liveFrameId: null, playheadFrameId: null,
  };
  const meta = makeFrameMeta(anim, { name: frameName(1) });
  anim.frames[meta.id] = { ...firstFrame, ...meta };
  const tl = makeTimeline(anim, [meta.id], { name: timelineName(1) });
  anim.timelines.push(tl); anim.activeTimelineId = tl.id; anim.liveFrameId = meta.id;
  return anim;
}

export function activeTimeline(anim) {
  if (!anim) return null;
  return anim.timelines.find((tl) => tl.id === anim.activeTimelineId) || anim.timelines[0] || null;
}

export const activeFrameId = (anim) => {
  const tl = activeTimeline(anim);
  return tl ? (tl.selectedFrameId || tl.frameIds[0]) : null;
};

export function normalizeAnimator(anim) {
  if (!anim || !anim.frames || !anim.timelines || !anim.timelines.length) return null;
  anim.frameSeq ||= Object.keys(anim.frames).length;
  anim.timelineSeq ||= anim.timelines.length;
  anim.onion = { ...ANIMATION.onion, ...(anim.onion || {}) };
  for (const tl of anim.timelines) {
    tl.frameIds = (tl.frameIds || []).filter((id) => anim.frames[id]);
    if (!tl.frameIds.length) continue;
    tl.fps = tl.fps || ANIMATION.fps; tl.mode = safeMode(tl.mode);
    if (!tl.frameIds.includes(tl.selectedFrameId)) tl.selectedFrameId = tl.frameIds[0];
  }
  anim.timelines = anim.timelines.filter((tl) => tl.frameIds.length);
  anim.activeTimelineId = activeTimeline(anim)?.id || anim.timelines[0]?.id || null;
  anim.liveFrameId = anim.liveFrameId || activeFrameId(anim);
  return anim.timelines.length ? anim : null;
}

export function insertFrameId(tl, id, nearId = tl.selectedFrameId, after = true) {
  const at = Math.max(0, tl.frameIds.indexOf(nearId));
  tl.frameIds.splice(at + (after ? 1 : 0), 0, id);
  tl.selectedFrameId = id;
}

export function reorderFrameIds(tl, ids) {
  const set = new Set(tl.frameIds);
  if (ids.length !== tl.frameIds.length || ids.some((id) => !set.has(id))) return false;
  tl.frameIds = ids.slice();
  return true;
}

export function removeFrameId(tl, id) {
  if (tl.frameIds.length <= 1) return null;
  const i = tl.frameIds.indexOf(id);
  if (i < 0) return null;
  tl.frameIds.splice(i, 1);
  tl.selectedFrameId = tl.frameIds[Math.min(i, tl.frameIds.length - 1)];
  return tl.selectedFrameId;
}

export function collectUnusedFrames(anim) {
  const used = new Set(anim.timelines.flatMap((tl) => tl.frameIds));
  return Object.keys(anim.frames).filter((id) => !used.has(id));
}
