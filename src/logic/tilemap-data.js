// Структура данных tilemap-слоя: глубокая копия и (де)сериализация в формат
// tilemap.json (§15 задачи). Чистая логика — без DOM и state.

// глубокая копия tilemap слоя: { tilesetId, mapW, mapH, cells: [cell|null] }
export const cloneCell = (c) => (c && c.tileId != null
  ? { tileId: c.tileId, flipX: !!c.flipX, flipY: !!c.flipY, diagonalFlip: !!c.diagonalFlip, rotation: c.rotation || 0, ...(c.local ? { local: true } : {}) }
  : null);

export const cloneTilemap = (tm) => ({
  tilesetId: tm.tilesetId, mapW: tm.mapW, mapH: tm.mapH,
  cells: tm.cells.map(cloneCell),
});

// плоские cells → массив непустых клеток с координатами (для tilemap.json)
export function cellsToList(tm) {
  const out = [];
  for (let i = 0; i < tm.cells.length; i++) { const c = tm.cells[i]; if (!c || c.tileId == null) continue;
    const cell = cloneCell(c); delete cell.local;
    out.push({ x: i % tm.mapW, y: Math.floor(i / tm.mapW), ...cell }); }
  return out;
}

// собрать объект tilemap.json по слоям и размеру тайла
export function buildTilemapJson(tileW, tileH, layers) {
  const mapW = layers[0] ? layers[0].mapW : 0, mapH = layers[0] ? layers[0].mapH : 0;
  return {
    tileWidth: tileW, tileHeight: tileH, mapWidth: mapW, mapHeight: mapH,
    layers: layers.map((l) => ({ name: l.name, cells: cellsToList(l) })),
  };
}
