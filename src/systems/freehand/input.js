// Selection Tool: разбирает указатель (мышь/перо/палец) в построение контура.
// Continuous — один мазок с авто-замыканием на отпускании; Segment — контур по
// частям, замыкается возвратом к стартовой точке. Отмена — Escape/кнопка панели.
import { S } from '../../core/state.js';
import * as bus from '../../core/bus.js';
import * as actions from '../../core/actions.js';
import { registerTool } from '../../core/canvas-handlers.js';
import { beginPath, addPoint, resetPath, pathActive, nearStart } from './path.js';
import { closePath } from './apply.js';
import { clamp } from '../../logic/math.js';

const clampX = (x) => clamp(x, 0, S.W - 1);
const clampY = (y) => clamp(y, 0, S.H - 1);

function down({ gx, gy }) { const x = clampX(gx), y = clampY(gy);
  if (S.lassoMode === 'segment' && pathActive()) { addPoint(x, y); return; } // продолжаем из конца предыдущего сегмента
  if (S.lassoOp === 'replace' && S.sel) actions.run('select.none'); // New Selection — старое выделение сбрасывается сразу, не дожидаясь нового
  beginPath(x, y); }

function move({ gx, gy }) { if (pathActive()) addPoint(clampX(gx), clampY(gy)); }

function up() { if (!pathActive()) return;
  if (S.lassoMode === 'continuous') closePath();      // отпустили — система сама замыкает контур
  else if (nearStart()) closePath();                  // segment: замыкаем у старта, иначе ждём следующий сегмент
}

export function cancelPath() { if (!pathActive()) return false; resetPath(); return true; }

registerTool('lasso', { down, move, up });
actions.register('lasso.cancel', cancelPath);

bus.on('tool', () => { if (S.tool !== 'lasso') resetPath(); }); // контур не переживает смену инструмента
// Escape отменяет незавершённый контур (как Enter/Esc в кропе — вне data-keymap)
window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && S.tool === 'lasso' && cancelPath()) e.preventDefault(); });
