// Панель Freehand Selection: режим контура (Continuous/Segment) и операция
// выделения (New/Add/Subtract/Intersect) + отмена незавершённого контура.
// Перетаскиваемость даёт общий toolpops (панель свёрстана как .toolpop).
import { S } from '../../core/state.js';
import * as bus from '../../core/bus.js';
import * as actions from '../../core/actions.js';
import { $ } from '../../core/dom.js';

const syncChips = (box, val) => { for (const b of $(box).children) b.classList.toggle('on', b.dataset.v === val); };

function sync() {
  $('lassopop').classList.toggle('on', S.tool === 'lasso');
  syncChips('lasso-mode', S.lassoMode); syncChips('lasso-op', S.lassoOp);
}

export function mount() {
  for (const b of $('lasso-mode').children) b.onclick = () => { S.lassoMode = b.dataset.v; actions.run('lasso.cancel'); sync(); };
  for (const b of $('lasso-op').children) b.onclick = () => { S.lassoOp = b.dataset.v; sync(); };
  bus.on('tool', sync); sync();
}
