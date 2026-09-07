// Aseprite-like shading brush: the selected palette ramp is ordered from the
// desired target side to the opposite side. Each stroke moves a pixel one step
// toward the first color in the ramp.
import { S, G } from '../../core/state.js';
import { inSel } from '../../core/selection.js';
import { symmetryConfig } from '../../core/layers.js';
import { mirrorPoints } from '../../logic/symmetry.ts';
import { markDirty } from '../../core/layer-cache.js';
import { previousRampColor } from '../../logic/PaletteRamp.ts';
import { brushStampWith } from './brush.js';
import { strokeSeen } from './seen.ts';

const colors = () => (S.shading && S.shading.colors) || [];
export const shadingActive = () => !!(S.shading && S.shading.on && colors().length > 1);

export function shadeCell(x, y) {
  if (!shadingActive()) return;
  if (x < 0 || y < 0 || x >= S.W || y >= S.H || !inSel(x, y)) return;
  const L = S.layers[S.cur]; if (L.lock) return;
  const key = y * S.W + x; if (strokeSeen.has(key)) return; strokeSeen.add(key);
  const g = G(), cur = g[y][x]; if (!cur) return;
  const ramp = colors();
  const to = previousRampColor(cur, ramp); if (!to) return;
  const a = cur.length > 3 ? cur[3] : 255;
  g[y][x] = [to[0], to[1], to[2], a];
  markDirty(S.cur);
}

// Отпечаток больше не зеркалит сам, поэтому симметрию затенения применяет
// обёртка с конфигурацией, посчитанной один раз на отпечаток.
export function shadingStamp(x, y) {
  const symmetry = symmetryConfig();
  brushStampWith(x, y, 'pencil', (px, py) => {
    for (const [mx, my] of mirrorPoints(px, py, S.W, S.H, false, false, symmetry)) {
      shadeCell(mx, my);
    }
  });
}
