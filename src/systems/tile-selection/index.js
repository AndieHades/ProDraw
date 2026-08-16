// Tile Selection: инструмент-рамка выделяет клетки tilemap-слоя (отдельная
// логика от pixel-выделения). Регистрирует операции (make-unique/delete/copy/
// paste) как именованные действия.
import { S } from '../../core/state.js';
import * as bus from '../../core/bus.js';
import * as actions from '../../core/actions.js';
import { registerTool } from '../../core/canvas-handlers.js';
import { setTool } from '../../core/tools.js';
import { toast, t } from '../../core/dom.js';
import { getTileset } from '../../core/tileset.js';
import { isTilemap, inMap } from '../../core/tilemap.js';
import { makeUnique, deleteSel, copySel, pasteSel } from './ops.js';

function cutSel() { copySel(); deleteSel(); }

function toCell(gx, gy) { const L = S.layers[S.cur]; if (!isTilemap(L)) return null;
  const ts = getTileset(L.tilemap.tilesetId); if (!ts) return null;
  const cx = Math.floor(gx / ts.tileW), cy = Math.floor(gy / ts.tileH);
  return inMap(L.tilemap, cx, cy) ? { cx, cy } : null; }

const tool = {
  down({ gx, gy }) { const c = toCell(gx, gy);
    if (!c) { if (!isTilemap(S.layers[S.cur])) toast(t('toast.needTilemapLayer')); return; }
    S.tileSel = { li: S.cur, x0: c.cx, y0: c.cy, x1: c.cx, y1: c.cy }; bus.emit('render'); },
  move({ gx, gy }) { if (!S.tileSel) return; const c = toCell(gx, gy); if (!c) return;
    S.tileSel.x1 = c.cx; S.tileSel.y1 = c.cy; bus.emit('render'); },
  up() {},
};

registerTool('tileselect', tool);
actions.register('tool.tileselect', () => setTool('tileselect'));
actions.register('tile.makeUnique', makeUnique);
actions.register('tile.sel.delete', deleteSel);
actions.register('tile.sel.copy', copySel);
actions.register('tile.sel.cut', cutSel);
actions.register('tile.sel.paste', pasteSel);
actions.register('tile.sel.clear', () => { S.tileSel = null; bus.emit('render'); });
