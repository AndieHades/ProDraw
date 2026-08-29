import { cellsSelectionMask, isSelectionMask, SelectionMask } from './selection-mask.ts';
import {
  clipSelectionRect,
  outsideSelectionStrips,
} from './selection-rects.ts';

function mappedRect(rect, mapPoint, width, height) {
  const points = [
    mapPoint(rect.x0, rect.y0),
    mapPoint(rect.x1, rect.y0),
    mapPoint(rect.x0, rect.y1),
    mapPoint(rect.x1, rect.y1),
  ];
  return clipSelectionRect({
    x0: Math.min(...points.map((point) => point[0])),
    y0: Math.min(...points.map((point) => point[1])),
    x1: Math.max(...points.map((point) => point[0])),
    y1: Math.max(...points.map((point) => point[1])),
  }, width, height);
}

export function mapSelectionMask(mask, sourceBounds, mapPoint, width, height) {
  const source = isSelectionMask(mask)
    ? mask
    : cellsSelectionMask(mask, width, height);
  const targetBounds = mappedRect(sourceBounds, mapPoint, width, height);
  const mappedRects = source.rects.map((rect) => mappedRect(rect, mapPoint, width, height))
    .filter(Boolean);
  const rects = source.complement
    ? mappedRects.concat(outsideSelectionStrips(targetBounds, width, height))
    : mappedRects;
  const output = new SelectionMask(width, height, rects, source.complement);
  source.include.forEachPoint((x, y) => {
    const [nextX, nextY] = mapPoint(x, y);
    output.forceSelected(nextX, nextY);
  });
  source.exclude.forEachPoint((x, y) => {
    const [nextX, nextY] = mapPoint(x, y);
    output.forceUnselected(nextX, nextY);
  });
  return output;
}
