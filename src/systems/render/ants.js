// «Бегущие муравьи» вокруг выделения: SVG-оверлей поверх холста (рамка или
// контур маски). Бег пунктира — чистый CSS (stroke-dashoffset), без цикла
// перерисовок; рендер лишь обновляет геометрию путей и ручки выделения.
import { S } from '../../core/state.js';
import { parseKey } from '../../logic/raster.js';

let svg = null, bgP = null, fgP = null, handlesG = null;
const NS = 'http://www.w3.org/2000/svg';

function el() { if (svg) return svg;
  svg = document.createElementNS(NS, 'svg'); svg.id = 'sel-ants';
  bgP = document.createElementNS(NS, 'path'); bgP.setAttribute('class', 'bg');
  fgP = document.createElementNS(NS, 'path'); fgP.setAttribute('class', 'fg');
  handlesG = document.createElementNS(NS, 'g'); handlesG.setAttribute('class', 'handles');
  svg.append(bgP, fgP, handlesG); document.body.appendChild(svg); return svg; }

// контур маски: только внешние грани клеток (как в оверлеях ранее)
function maskPath(ox, oy, z, dx, dy) { const seg = [];
  for (const k of S.selMask) { const [x, y] = parseKey(k); const sx = ox + x * z + dx, sy = oy + y * z + dy;
    if (!S.selMask.has(x + ',' + (y - 1))) seg.push('M' + sx + ' ' + sy + 'H' + (sx + z));
    if (!S.selMask.has(x + ',' + (y + 1))) seg.push('M' + sx + ' ' + (sy + z) + 'H' + (sx + z));
    if (!S.selMask.has((x - 1) + ',' + y)) seg.push('M' + sx + ' ' + sy + 'V' + (sy + z));
    if (!S.selMask.has((x + 1) + ',' + y)) seg.push('M' + (sx + z) + ' ' + sy + 'V' + (sy + z)); }
  return seg.join(''); }

function drawHandles(sel, ox, oy, z, dx, dy) {
  const x = ox + sel.x0 * z + dx, y = oy + sel.y0 * z + dy;
  const w = (sel.x1 - sel.x0 + 1) * z, h = (sel.y1 - sel.y0 + 1) * z;
  const pts = [[x, y], [x + w, y], [x, y + h], [x + w, y + h], [x + w / 2, y], [x + w / 2, y + h], [x, y + h / 2], [x + w, y + h / 2]];
  handlesG.replaceChildren();
  for (const p of pts) {
    const c = document.createElementNS(NS, 'circle');
    c.setAttribute('cx', p[0]); c.setAttribute('cy', p[1]); c.setAttribute('r', 5);
    handlesG.appendChild(c);
  }
}

export function updateAnts(ox, oy, z) {
  if (!S.sel) { if (svg) { svg.style.display = 'none'; handlesG.replaceChildren(); } return; }
  // при перетаскивании слоя инструментом move рамка едет вместе с содержимым
  const mdx = (S.moveDrag && S.tool === 'move') ? S.moveDrag.dx * z : 0;
  const mdy = (S.moveDrag && S.tool === 'move') ? S.moveDrag.dy * z : 0;
  let d = '';
  if (!S.selMask) { const x = ox + S.sel.x0 * z + mdx, y = oy + S.sel.y0 * z + mdy;
    const w = (S.sel.x1 - S.sel.x0 + 1) * z, h = (S.sel.y1 - S.sel.y0 + 1) * z;
    d = 'M' + x + ' ' + y + 'H' + (x + w) + 'V' + (y + h) + 'H' + x + 'Z'; }
  else if (!S.selFloat) d = maskPath(ox, oy, z, mdx, mdy);
  el().style.display = d ? '' : 'none';
  bgP.setAttribute('d', d); fgP.setAttribute('d', d);
  if (d && !S.selFloat) drawHandles(S.sel, ox, oy, z, mdx, mdy);
  else handlesG.replaceChildren();
}
