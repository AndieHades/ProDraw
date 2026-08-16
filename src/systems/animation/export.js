import { S } from '../../core/state.js';
import { saveFile } from '../../core/io.js';
import { makeCanvas } from '../../core/canvas.js';
import { activeTimeline, renderFrameToCanvas, saveActiveFrame } from '../../core/animation.js';
import { toast, t } from '../../core/dom.js';

const safeName = () => (S.docName || 'animation').replace(/[^\w.-]+/g, '_');

function frameMeta(tl, cols) {
  const dur = (id) => S.animator.frames[id]?.duration || Math.round(1000 / tl.fps);
  return tl.frameIds.map((id, i) => ({
    id, name: S.animator.frames[id]?.name || id, duration: dur(id),
    x: (i % cols) * S.W, y: Math.floor(i / cols) * S.H, w: S.W, h: S.H,
  }));
}

export async function exportSpriteSheet() {
  if (!S.animator) return;
  saveActiveFrame();
  const tl = activeTimeline(), n = tl.frameIds.length, cols = Math.ceil(Math.sqrt(n)), rows = Math.ceil(n / cols);
  const sheet = makeCanvas(cols * S.W, rows * S.H), x = sheet.getContext('2d'); x.imageSmoothingEnabled = false;
  tl.frameIds.forEach((id, i) => {
    const c = renderFrameToCanvas(id); if (c) x.drawImage(c, (i % cols) * S.W, Math.floor(i / cols) * S.H);
  });
  const json = { timeline: tl.name, frameW: S.W, frameH: S.H, fps: tl.fps, mode: tl.mode, columns: cols, frames: frameMeta(tl, cols) };
  const base = safeName() + '_' + tl.name.replace(/[^\w.-]+/g, '_');
  await new Promise((res) => sheet.toBlob(async (b) => { await saveFile(b, base + '.png', 'image/png', t('file.pngDesc')); res(); }, 'image/png'));
  await saveFile(new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' }), base + '.json', 'application/json', 'JSON');
  toast(t('toast.animationExported'));
}
