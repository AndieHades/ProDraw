import { activeFrameId, activeTimeline, loadFrame, saveActiveFrame } from '../../core/animation.js';
import * as bus from '../../core/bus.js';
import { S } from '../../core/state.js';

let playing = false, timer = null, idx = 0, dir = 1;

export const isPlaying = () => playing;
const ids = () => activeTimeline()?.frameIds || [];
const duration = (id, tl) => Math.max(16, SFrame(id)?.duration || Math.round(1000 / (tl.fps || 12)));
const SFrame = (id) => S.animator?.frames?.[id] || null;

function advance() {
  if (!playing) return;
  const tl = activeTimeline(), list = ids(); if (!tl || !list.length) return stopPlayback();
  idx += dir;
  if (idx >= list.length || idx < 0) {
    if (tl.mode === 'once') return stopPlayback();
    if (tl.mode === 'pingpong') { dir *= -1; idx = Math.max(0, Math.min(list.length - 1, idx + dir * 2)); }
    else idx = 0;
  }
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
