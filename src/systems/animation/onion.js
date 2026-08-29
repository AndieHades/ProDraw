import { S } from '../../core/state.js';
import * as bus from '../../core/bus.ts';
import { makeCanvas } from '../../core/canvas.js';
import { activeFrameId, activeTimeline, renderFrameToCanvas, saveActiveFrame } from '../../core/animation.js';
import { C } from '../../styles/canvas-colors.ts';
import { onionFrameIds } from '../../logic/AnimationPresentation.ts';

function tinted(c) {
  const out = makeCanvas(c.width, c.height), x = out.getContext('2d');
  x.drawImage(c, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = C.accent; x.fillRect(0, 0, c.width, c.height);
  return out;
}

function drawOnion({ ctx, ox, oy, z }) {
  const anim = S.animator, onion = anim?.onion; if (!onion?.on) return;
  const tl = activeTimeline(), id = activeFrameId(); if (!tl || !id) return;
  saveActiveFrame();
  const neighbours = onionFrameIds(tl.frameIds, id, onion.prev, onion.next);
  ctx.save(); ctx.globalAlpha = onion.opacity;
  for (const previous of neighbours.previous) { const c = renderFrameToCanvas(previous);
    if (c) ctx.drawImage(tinted(c), ox, oy, S.W * z, S.H * z); }
  for (const next of neighbours.next) { const c = renderFrameToCanvas(next);
    if (c) ctx.drawImage(c, ox, oy, S.W * z, S.H * z); }
  ctx.restore();
}

export function mountOnion() { bus.on('overlay', drawOnion); }
