import { S } from '../../core/state.js';
import { attachReorder } from '../../core/reorder-drag.js';
import { activeFrameId, activeTimeline, renderFrameToCanvas, reorderFrames, selectFrame } from '../../core/animation.js';
import { ANIMATION } from '../../config/animation.js';
import { t } from '../../i18n/index.js';
import { openFrameMenu } from './frame-menu.js';

let squelchClick = false;

function paintThumb(canvas, frameId) {
  const src = renderFrameToCanvas(frameId), size = ANIMATION.thumb, x = canvas.getContext('2d');
  canvas.width = size; canvas.height = size; x.imageSmoothingEnabled = false; x.clearRect(0, 0, size, size);
  if (!src) return;
  const k = Math.min(size / S.W, size / S.H), w = Math.max(1, Math.floor(S.W * k)), h = Math.max(1, Math.floor(S.H * k));
  x.drawImage(src, Math.floor((size - w) / 2), Math.floor((size - h) / 2), w, h);
}

function frameEl(id, i, tl, rerender) {
  const fr = S.animator.frames[id], b = document.createElement('button');
  b.type = 'button'; b.className = 'anim-frame'; b.dataset.frameId = id;
  b.classList.toggle('on', id === activeFrameId());
  const c = document.createElement('canvas'), name = document.createElement('span'), dur = document.createElement('em');
  name.textContent = fr.name || t('animation.frameName', { n: i + 1 });
  dur.textContent = t('animation.ms', { n: fr.duration || Math.round(1000 / tl.fps) });
  b.append(c, name, dur); paintThumb(c, id);
  b.onclick = () => { if (squelchClick) return; selectFrame(id); rerender(); };
  b.addEventListener('contextmenu', (e) => { e.preventDefault(); openFrameMenu(id, e.clientX, e.clientY); });
  attachReorder(b, {
    dropSel: '#anim-strip', itemSel: '.anim-frame',
    squelch: () => { squelchClick = true; setTimeout(() => { squelchClick = false; }, 250); },
    save: () => reorderFrames([...b.parentElement.querySelectorAll('.anim-frame')].map((el) => el.dataset.frameId)),
  });
  return b;
}

export function renderTimeline(strip, rerender) {
  const tl = activeTimeline(); if (!strip || !tl) return;
  strip.textContent = '';
  tl.frameIds.forEach((id, i) => strip.appendChild(frameEl(id, i, tl, rerender)));
}
