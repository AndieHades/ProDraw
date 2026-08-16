// Variant groups: тайлы, считающиеся вариантами одного материала/объекта,
// с весами для Random Variant Brush. CRUD поверх ts.groups и поля tile.groupId.
import { weightedPick } from '../logic/tile-variants.js';

let groupSeq = 0;

export function createGroup(ts, name, baseTileId = null) {
  groupSeq = Math.max(groupSeq, ...(ts.groups || []).map((g) => g.id || 0));
  const g = { id: ++groupSeq, name: name || '', baseTileId };
  ts.groups = ts.groups || []; ts.groups.push(g); return g;
}

export const getGroup = (ts, groupId) => (ts.groups || []).find((g) => g.id === groupId) || null;
export const groupTiles = (ts, groupId) => ts.tiles.filter((tl) => tl.groupId === groupId);

export function addToGroup(ts, tileId, groupId) {
  const tl = ts.tiles.find((x) => x.id === tileId); if (tl) tl.groupId = groupId;
}
export function setWeight(ts, tileId, weight) {
  const tl = ts.tiles.find((x) => x.id === tileId); if (tl) tl.weight = Math.max(0, weight | 0);
}

// случайный tileId из группы с учётом весов; null — если группа пуста
export function pickVariant(ts, groupId, rng = Math.random) {
  const tiles = groupTiles(ts, groupId);
  return weightedPick(tiles.map((tl) => ({ id: tl.id, weight: tl.weight })), rng);
}
