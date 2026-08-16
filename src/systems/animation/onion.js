import { S } from '../../core/state.js';
import * as bus from '../../core/bus.js';
import { makeCanvas } from '../../core/canvas.js';
import { activeFrameId, activeTimeline, renderFrameToCanvas, saveActiveFrame } from '../../core/animation.js';
import { C } from '../../styles/canvas-colors.js';

function tinted(c) {
  const out = makeCanvas(c.width, c.height), x = out.getContext('2d');
  x.drawImage(c, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = C.accent; x.fillRect(0, 0, c.width, c.height);
  return out;
}

function drawOnion({ ctx, ox, oy, z }) {
  const anim = S.animator, onion = anim?.onion; if (!onion?.on) return;
  const tl = activeTimeline(), id = activeFrameId(); if (!tl || !id) return;
  saveActiveFrame();
  const at = tl.frameIds.indexOf(id), prev = tl.frameIds[at - 1], next = tl.frameIds[at + 1];
  ctx.save(); ctx.globalAlpha = onion.opacity;
  if (prev && onion.prev) { const c = renderFrameToCanvas(prev); if (c) ctx.drawImage(tinted(c), ox, oy, S.W * z, S.H * z); }
  if (next && onion.next) { const c = renderFrameToCanvas(next); if (c) ctx.drawImage(c, ox, oy, S.W * z, S.H * z); }
  ctx.restore();
}

export function mountOnion() { bus.on('overlay', drawOnion); }
