// Слои, реально содержащие непрозрачный пиксель в координате документа.
// Видимость намеренно не учитывается: скрытый слой тоже можно выбрать и раскрыть.
import { S } from './state.js';

export function layerIndicesAt(x, y) {
  if (x < 0 || y < 0 || x >= S.W || y >= S.H) return [];
  const hits = [];
  for (let index = 0; index < S.layers.length; index++) {
    const pixel = S.layers[index]?.grid[y]?.[x];
    if (pixel && (pixel[3] ?? 255) > 0) hits.push(index);
  }
  return hits;
}
