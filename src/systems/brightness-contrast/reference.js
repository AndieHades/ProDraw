import { S } from '../../core/state.js';
import { snapshotRasterReferences } from '../../core/history.js';
import { rasterizeTextTargets } from '../../core/text-rasterize.js';
import { isTextLayer } from '../../logic/text-model.ts';
import { forkRasterRows } from '../../logic/raster-row-fork.js';

export function beginCanvasReference(backup, indices) {
  const layers = backup.map(({ L }) => L);
  if (layers.some((layer) => !isTextLayer(layer) && layer.kind &&
    layer.kind !== 'pixel') || !snapshotRasterReferences(indices)) return false;
  const text = layers.filter(isTextLayer), textSet = new Set(text);
  rasterizeTextTargets(text);
  for (const item of backup) {
    if (textSet.has(item.L)) continue;
    const fork = forkRasterRows(item.L.grid, item.bounds);
    item.L.grid = fork.grid;
    const rows = new Set([...item.cells.keys()].map((key) =>
      Math.floor(key / S.W)));
    for (const y of rows) fork.writableRow(y);
  }
  return true;
}
