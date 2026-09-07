// Слои, реально содержащие непрозрачный пиксель в координате документа.
// Видимость намеренно не учитывается: скрытый слой тоже можно выбрать и раскрыть.
import { S } from "./state.ts";
import { rasterOwnerForLayer } from "./raster/legacyRasterOwner.ts";

export function layerIndicesAt(x: number, y: number): number[] {
  if (x < 0 || y < 0 || x >= S.W || y >= S.H) return [];
  const hits: number[] = [];
  for (let index = 0; index < S.layers.length; index++) {
    const layer = S.layers[index]; if (!layer) continue;
    const pixel = rasterOwnerForLayer(layer)?.getCell(x, y);
    if (pixel && (pixel[3] ?? 255) > 0) hits.push(index);
  }
  return hits;
}
