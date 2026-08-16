// Импорт кисти Procreate (.brush): ZIP → кончик (Shape.png) и дизер-тайл (Grain.png).
// Нет Shape.png (типично для пиксельных кистей) — форма дефолтная круглая.
// Grain берём только мелкий (дизер-решётка); крупную бумажную текстуру игнорируем.
import { unzip } from '../zip.js';
import { blobToCoverage } from '../brush-decode.js';
import { unarchiveBrush } from './bplist.js';
import { coverageToTile } from '../../logic/brush-mask.js';
import { BRUSH_MASK, BRUSH_SRC_MAX, BRUSH_GRAIN_DECODE_MAX } from '../../config/brush-import.js';

export async function importProcreate(buf, name) {
  const files = await unzip(buf);
  const shapePng = files.get('Shape.png') || files.get('shape.png');
  let cov = null, kind = 'round';
  if (shapePng) { cov = await blobToCoverage(new Blob([shapePng]), BRUSH_SRC_MAX); kind = 'shape'; }
  const grainPng = files.get('Grain.png') || files.get('grain.png');
  // grain декодим в натив и сразу сводим в бинарный дизер-тайл (поиск периода)
  const grain = grainPng ? coverageToTile(await blobToCoverage(new Blob([grainPng]), BRUSH_GRAIN_DECODE_MAX), BRUSH_MASK.threshold) : null;
  let title = name, params = {};
  const arch = files.get('Brush.archive');
  if (arch) { try { const a = unarchiveBrush(arch); // имя и параметры штриха из bplist
    if (a.name) title = a.name;
    params = { spacing: +a.plotSpacing || 0, jitter: +a.plotJitter || 0 };
  } catch (e) { /* битый архив не должен ронять импорт формы */ } }
  return [{ name: title, source: 'procreate', shape: kind, cov, grain, params }];
}
