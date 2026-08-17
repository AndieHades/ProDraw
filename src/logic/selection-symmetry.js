import { isSelectionMask } from './selection-mask.js';
import { symmetrizeSimpleSelectionMask } from './selection-mask-transform.js';

function reflectionFunctions(config) {
  const output = [];
  if (config.x) output.push(([x, y]) => [Math.round(2 * config.axisX - x), y]);
  if (config.y) output.push(([x, y]) => [x, Math.round(2 * config.axisY - y)]);
  if (config.d1) {
    output.push(([x, y]) => [Math.round(y - config.diagP), Math.round(x + config.diagP)]);
  }
  if (config.d2) {
    output.push(([x, y]) => [Math.round(config.diagN - y), Math.round(config.diagN - x)]);
  }
  return output;
}

function pointOrbit(x, y, width, height, reflections) {
  const queue = [[x, y]];
  const output = [];
  const seen = new Set();
  for (let index = 0; index < queue.length && index < 64; index++) {
    const point = queue[index];
    const id = point[1] * width + point[0];
    if (seen.has(id)) continue;
    seen.add(id);
    output.push(point);
    for (const reflect of reflections) {
      const next = reflect(point);
      if (next[0] < 0 || next[1] < 0 || next[0] >= width || next[1] >= height) continue;
      const nextId = next[1] * width + next[0];
      if (!seen.has(nextId)) queue.push(next);
    }
  }
  return output;
}

export function symmetrizeSelectionMask(mask, config) {
  if (!isSelectionMask(mask)) return null;
  const reflections = reflectionFunctions(config);
  if (!reflections.length) return mask.clone();
  const simple = symmetrizeSimpleSelectionMask(mask, config);
  if (simple) return simple;
  const output = mask.clone();
  const inverse = mask.inverted();
  if (mask.size <= inverse.size) {
    for (const [x, y] of mask.points()) {
      for (const point of pointOrbit(x, y, mask.width, mask.height, reflections)) {
        output.forceSelected(point[0], point[1]);
      }
    }
    return output;
  }
  for (const [x, y] of inverse.points()) {
    const selectedReflection = pointOrbit(x, y, mask.width, mask.height, reflections)
      .some((point) => mask.hasXY(point[0], point[1]));
    if (selectedReflection) output.forceSelected(x, y);
  }
  return output;
}
