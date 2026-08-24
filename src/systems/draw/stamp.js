// Диспетчер штампа: по активному инструменту кладёт кисть/ластик/коррекцию
// или заливает. Пипетка — отдельная Eyedropper System (Hot Key), не инструмент.
import { S } from '../../core/state.js';
import { brushStamp } from './brush.js';
import { adjustStamp } from './adjust.js';
import { flood } from './fill.js';

export function stamp(x, y) {
  if (S.tool === 'select' || S.tool === 'move') return;
  if (S.tool === 'pencil' || S.tool === 'line' || S.tool === 'rect' || S.tool === 'ellipse') brushStamp(x, y, false);
  else if (S.tool === 'eraser') brushStamp(x, y, true);
  else if (S.tool === 'adjust') adjustStamp(x, y);
  else if (S.tool === 'fill') flood(x, y);
}
