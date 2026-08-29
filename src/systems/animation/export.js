import { S } from '../../core/state.js';
import { saveFile } from '../../core/io.js';
import { makeCanvas } from '../../core/canvas.js';
import { activeTimeline, renderFrameToCanvas, saveActiveFrame } from '../../core/animation.js';
import { toast, t } from '../../ui/dom/ShellDom.ts';
import { animationExportMetadata, safeAnimationFileSegment,
  spriteSheetPlan } from '../../logic/AnimationPresentation.ts';

export async function exportSpriteSheet() {
  if (!S.animator) return;
  saveActiveFrame();
  const tl = activeTimeline();
  const plan = spriteSheetPlan(tl.frameIds, S.W, S.H, tl.fps, S.animator.frames);
  const sheet = makeCanvas(plan.width, plan.height), x = sheet.getContext('2d'); x.imageSmoothingEnabled = false;
  tl.frameIds.forEach((id, i) => {
    const c = renderFrameToCanvas(id); if (c) x.drawImage(c,
      (i % plan.columns) * S.W, Math.floor(i / plan.columns) * S.H);
  });
  const json = animationExportMetadata(tl, plan, S.W, S.H);
  const base = safeAnimationFileSegment(S.docName || 'animation', 'animation') + '_' +
    safeAnimationFileSegment(tl.name, 'timeline');
  await new Promise((res) => sheet.toBlob(async (b) => { await saveFile(b, base + '.png', 'image/png', t('file.pngDesc')); res(); }, 'image/png'));
  await saveFile(new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' }), base + '.json', 'application/json', 'JSON');
  toast(t('toast.animationExported'));
}
