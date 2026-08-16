// Глубокая копия тайлсета (для истории/галереи/сериализации). Чистые данные:
// тайлы с пиксельными сетками, группы вариантов, счётчик стабильных id.
import { cloneGrid } from './raster.js';

export const cloneTile = (t) => ({ id: t.id, name: t.name || '', groupId: t.groupId ?? null, weight: t.weight, grid: cloneGrid(t.grid) });
export const cloneGroup = (g) => ({ id: g.id, name: g.name || '', baseTileId: g.baseTileId ?? null });

// подпись битмапа тайла (для дедупликации: одинаковые тайлы не добавляются)
export const tileGridKey = (g) => g.map((row) => row.map((c) => (c ? c[0] + ',' + c[1] + ',' + c[2] + ',' + (c.length > 3 ? c[3] : 255) : '_')).join('|')).join(';');

export const cloneTileset = (ts) => ({
  id: ts.id, name: ts.name, tileW: ts.tileW, tileH: ts.tileH, tileSeq: ts.tileSeq,
  tiles: ts.tiles.map(cloneTile), groups: (ts.groups || []).map(cloneGroup),
});
