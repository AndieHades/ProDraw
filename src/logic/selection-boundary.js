import { isSelectionMask } from './selection-mask.js';
import { parseKey } from './raster.js';

const compactCache = new WeakMap();

const addCandidate = (set, x, y, width, height) => {
  if (x >= 0 && y >= 0 && x < width && y < height) set.add(y * width + x);
};
function addRectCandidates(set, rect, width, height) {
  for (let x = rect.x0; x <= rect.x1; x++) {
    addCandidate(set, x, rect.y0, width, height); addCandidate(set, x, rect.y0 - 1, width, height);
    addCandidate(set, x, rect.y1, width, height); addCandidate(set, x, rect.y1 + 1, width, height); }
  for (let y = rect.y0; y <= rect.y1; y++) {
    addCandidate(set, rect.x0, y, width, height); addCandidate(set, rect.x0 - 1, y, width, height);
    addCandidate(set, rect.x1, y, width, height); addCandidate(set, rect.x1 + 1, y, width, height); }
}
function addOuterCandidates(set, width, height) {
  for (let x = 0; x < width; x++) { addCandidate(set, x, 0, width, height);
    addCandidate(set, x, height - 1, width, height); }
  for (let y = 0; y < height; y++) { addCandidate(set, 0, y, width, height);
    addCandidate(set, width - 1, y, width, height); }
}
function addExceptionCandidates(set, tiles, width, height) { tiles.forEachPoint((x, y) => {
  addCandidate(set, x, y, width, height); addCandidate(set, x - 1, y, width, height);
  addCandidate(set, x + 1, y, width, height); addCandidate(set, x, y - 1, width, height);
  addCandidate(set, x, y + 1, width, height); }); }

function compactBoundary(mask) {
  const candidates = new Set(); if (mask.complement) addOuterCandidates(candidates, mask.width, mask.height);
  for (const rect of mask.rects) addRectCandidates(candidates, rect, mask.width, mask.height);
  addExceptionCandidates(candidates, mask.include, mask.width, mask.height);
  addExceptionCandidates(candidates, mask.exclude, mask.width, mask.height); const edges = [];
  for (const id of candidates) { const x = id % mask.width, y = Math.floor(id / mask.width);
    if (!mask.hasXY(x, y)) continue;
    if (!mask.hasXY(x, y - 1)) edges.push([x, y, x + 1, y]);
    if (!mask.hasXY(x, y + 1)) edges.push([x, y + 1, x + 1, y + 1]);
    if (!mask.hasXY(x - 1, y)) edges.push([x, y, x, y + 1]);
    if (!mask.hasXY(x + 1, y)) edges.push([x + 1, y, x + 1, y + 1]); }
  return edges;
}
function legacyBoundary(mask) { const edges = [];
  for (const key of mask) { const [x, y] = parseKey(key);
    if (!mask.has(x + ',' + (y - 1))) edges.push([x, y, x + 1, y]);
    if (!mask.has(x + ',' + (y + 1))) edges.push([x, y + 1, x + 1, y + 1]);
    if (!mask.has((x - 1) + ',' + y)) edges.push([x, y, x, y + 1]);
    if (!mask.has((x + 1) + ',' + y)) edges.push([x + 1, y, x + 1, y + 1]); }
  return edges;
}

function coalesceAxisEdges(edges, horizontal) {
  const groups = new Map();
  for (const edge of edges) {
    if ((edge[1] === edge[3]) !== horizontal) continue;
    const fixed = horizontal ? edge[1] : edge[0];
    const start = horizontal ? edge[0] : edge[1];
    if (!groups.has(fixed)) groups.set(fixed, []);
    groups.get(fixed).push(start);
  }
  const output = [];
  for (const [fixed, starts] of groups) {
    starts.sort((left, right) => left - right);
    let start = starts[0];
    let end = start + 1;
    for (let index = 1; index < starts.length; index++) {
      if (starts[index] <= end) end = Math.max(end, starts[index] + 1);
      else {
        output.push(horizontal ? [start, fixed, end, fixed] : [fixed, start, fixed, end]);
        start = starts[index];
        end = start + 1;
      }
    }
    output.push(horizontal ? [start, fixed, end, fixed] : [fixed, start, fixed, end]);
  }
  return output;
}

function coalesced(edges) {
  return coalesceAxisEdges(edges, true).concat(coalesceAxisEdges(edges, false));
}

export function selectionBoundaryEdges(mask) {
  if (!isSelectionMask(mask)) return coalesced(legacyBoundary(mask));
  const cached = compactCache.get(mask);
  if (cached?.revision === mask.revision) return cached.edges;
  const edges = coalesced(compactBoundary(mask));
  compactCache.set(mask, { revision: mask.revision, edges });
  return edges;
}
