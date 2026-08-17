import { sparseGridRows, sparseGridShape } from './sparse-grid.js';

const indexOf = (key, length) => { const index = Number(key);
  return Number.isInteger(index) && index >= 0 && index < length &&
    String(index) === key ? index : -1; };

export function sparseGridStats(grid) {
  const shape = sparseGridShape(grid), rows = sparseGridRows(grid);
  if (!shape || !rows) return null;
  let contentRows = 0, storedCells = 0, allocatedCells = 0;
  for (const [, row] of rows) { let content = 0;
    for (const key of Object.keys(row || [])) {
      const x = indexOf(key, row.length); if (x < 0) continue;
      allocatedCells++; if (row[x]) { storedCells++; content++; }
    }
    if (content) contentRows++;
  }
  return { ...shape, materializedRows: rows.length,
    contentRows, storedCells, allocatedCells };
}
