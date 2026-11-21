import type { GridBounds } from "../raster-grid.ts";
import { boundsWithExt } from "../raster.ts";
import { alphaComponents, type AlphaComponent } from "./alphaComponents.ts";
import { layersAlphaPlane, type AlphaPlane, type AlphaSource } from "./alphaPlane.ts";

// Правила отделения остатков стирания от рисунка (значения — src/config).
export interface ContentFitRules {
  readonly residueMaxPixels: number;
  readonly residueMaxAlpha: number;
  readonly faintMaxAlpha: number;
  readonly maxScanPixels: number;
  readonly maxScanRuns: number;
}

// Остаток — пятно, едва видимое целиком, или крошечное и полупрозрачное.
// Непрозрачный пиксель остатком не бывает: его поставили намеренно.
export const isResidue = (component: AlphaComponent, rules: ContentFitRules): boolean =>
  component.peak <= rules.faintMaxAlpha || (component.peak <= rules.residueMaxAlpha &&
    component.pixels <= rules.residueMaxPixels);

const planeBounds = (plane: AlphaPlane): GridBounds => ({ minx: plane.minx,
  miny: plane.miny, maxx: plane.minx + plane.width - 1, maxy: plane.miny + plane.height - 1 });

function merge(left: GridBounds | null, right: GridBounds): GridBounds {
  return left ? { minx: Math.min(left.minx, right.minx), miny: Math.min(left.miny, right.miny),
    maxx: Math.max(left.maxx, right.maxx), maxy: Math.max(left.maxy, right.maxy) } : { ...right };
}

// Охват значимых пятен плана. Если всё содержимое — остатки, отличать не от
// чего: возвращается охват всех пятен. Слишком шумный план — весь план.
export function meaningfulAlphaBounds(plane: AlphaPlane,
  rules: ContentFitRules): GridBounds | null {
  const components = alphaComponents(plane, rules.maxScanRuns);
  if (!components) return planeBounds(plane);
  let kept: GridBounds | null = null, all: GridBounds | null = null;
  for (const component of components) {
    const bounds = { minx: component.minx, miny: component.miny,
      maxx: component.maxx, maxy: component.maxy };
    all = merge(all, bounds);
    if (!isResidue(component, rules)) kept = merge(kept, bounds);
  }
  return kept ?? all;
}

// Рамка значимого содержимого набора слоёв, включая пиксели за краем холста.
export function meaningfulLayerBounds(layers: readonly AlphaSource[],
  rules: ContentFitRules): GridBounds | null {
  let raw: GridBounds | null = null;
  for (const layer of layers) {
    const bounds = boundsWithExt(layer.grid, layer.ext); if (bounds) raw = merge(raw, bounds);
  }
  if (!raw) return null;
  const area = (raw.maxx - raw.minx + 1) * (raw.maxy - raw.miny + 1);
  if (area > rules.maxScanPixels) return raw;
  return meaningfulAlphaBounds(layersAlphaPlane(layers, raw), rules);
}
