import { activeFrameId, activeTimeline, loadFrame, saveActiveFrame } from '../../core/animation.js';
import * as bus from '../../core/bus.ts';
import { S } from '../../core/state.js';
import { framePlaybackDuration, nextPlaybackPosition } from '../../logic/AnimationPlayback.ts';

let playing = false, timer = null, idx = 0, dir = 1;

export const isPlaying = () => playing;
const ids = () => activeTimeline()?.frameIds || [];
const duration = (id, tl) => framePlaybackDuration(SFrame(id)?.duration, tl.fps);
const SFrame = (id) => S.animator?.frames?.[id] || null;

function advance() {
  if (!playing) return;
  const tl = activeTimeline(), list = ids(); if (!tl || !list.length) return stopPlayback();
  const next = nextPlaybackPosition(idx, dir, list.length, tl.mode);
  if (next.stopped) return stopPlayback();
  idx = next.index; dir = next.direction;
  loadFrame(list[idx], { select: false });
  timer = setTimeout(advance, duration(list[idx], tl));
}

export function startPlayback() {
  const list = ids(); if (!list.length || playing) return;
  saveActiveFrame(); playing = true; dir = 1; idx = Math.max(0, list.indexOf(activeFrameId()));
  loadFrame(list[idx], { select: false }); bus.emit('animation'); timer = setTimeout(advance, duration(list[idx], activeTimeline()));
}

export function stopPlayback() {
  clearTimeout(timer); timer = null;
  if (!playing) return;
  playing = false; loadFrame(activeFrameId(), { select: true }); bus.emit('animation');
}

export function togglePlayback() { if (playing) stopPlayback(); else startPlayback(); }
