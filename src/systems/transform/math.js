// Геометрия свободной трансформации над состоянием m (рамка/поворот/масштаб).
// Чисто (без DOM/S): экранные координаты считает система выше.
export function rotCenter(m) { return { x: m.b.x0 + m.b.w / 2 + m.tx, y: m.b.y0 + m.b.h / 2 + m.ty }; }

export function rotLocalToWorld(m, lx, ly) { const c = rotCenter(m), ca = Math.cos(m.ang), sa = Math.sin(m.ang);
  const x = (lx - m.b.w / 2) * m.sx, y = (ly - m.b.h / 2) * m.sy;
  return { x: c.x + x * ca - y * sa, y: c.y + x * sa + y * ca }; }

export function rotWorldToLocal(m, x, y) { const c = rotCenter(m), ca = Math.cos(m.ang), sa = Math.sin(m.ang);
  const dx = x - c.x, dy = y - c.y;
  return { x: (dx * ca + dy * sa) / m.sx + m.b.w / 2, y: (-dx * sa + dy * ca) / m.sy + m.b.h / 2 }; }

export const rotState = (m) => ({ ang: m.ang, sx: m.sx, sy: m.sy, tx: m.tx, ty: m.ty });
export const rotHasChanges = (m) => Math.abs(m.ang) > 1e-4 || Math.abs(m.sx - 1) > 1e-4 || Math.abs(m.sy - 1) > 1e-4 || Math.abs(m.tx) > 1e-4 || Math.abs(m.ty) > 1e-4;
export function rotRestoreState(m, s) { m.ang = s.ang; m.sx = s.sx; m.sy = s.sy; m.tx = s.tx; m.ty = s.ty; m.changed = rotHasChanges(m); }

export function rotFrame(m) { if (!m) return null;
  const p = [rotLocalToWorld(m, 0, 0), rotLocalToWorld(m, m.b.w, 0), rotLocalToWorld(m, m.b.w, m.b.h), rotLocalToWorld(m, 0, m.b.h)];
  return { p, sides: [
    { kind: 'scale-y', sign: -1, p: { x: (p[0].x + p[1].x) / 2, y: (p[0].y + p[1].y) / 2 } },
    { kind: 'scale-x', sign: 1, p: { x: (p[1].x + p[2].x) / 2, y: (p[1].y + p[2].y) / 2 } },
    { kind: 'scale-y', sign: 1, p: { x: (p[2].x + p[3].x) / 2, y: (p[2].y + p[3].y) / 2 } },
    { kind: 'scale-x', sign: -1, p: { x: (p[3].x + p[0].x) / 2, y: (p[3].y + p[0].y) / 2 } } ] }; }

export function rotBuildCells(m, src) { const f = rotFrame(m), xs = f.p.map((p) => p.x), ys = f.p.map((p) => p.y);
  const x0 = Math.floor(Math.min(...xs)) - 1, x1 = Math.ceil(Math.max(...xs)) + 1, y0 = Math.floor(Math.min(...ys)) - 1, y1 = Math.ceil(Math.max(...ys)) + 1;
  const cells = []; let minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const q = rotWorldToLocal(m, x + 0.5, y + 0.5), sx = Math.floor(q.x), sy = Math.floor(q.y);
    if (sx < 0 || sy < 0 || sx >= m.b.w || sy >= m.b.h) continue;
    const c = src[sy][sx]; if (!c) continue;
    cells.push([x, y, c]); if (x < minx) minx = x; if (x > maxx) maxx = x; if (y < miny) miny = y; if (y > maxy) maxy = y; }
  return cells.length ? { cells, minx, miny, maxx, maxy } : null; }

// результат трансформации + его зеркальные копии (m.sym = {sx,sy}); источник —
// одна сторона, зеркала достраиваются → перенос/масштаб/поворот выходят симметричными
export function rotBuildCellsSym(m, src, W, H) { const r = rotBuildCells(m, src), sx = m.sym && m.sym.sx, sy = m.sym && m.sym.sy;
  if (!r || (!sx && !sy)) return r;
  const seen = new Set(), cells = []; let minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity;
  const put = (x, y, c) => { if (x < 0 || y < 0 || x >= W || y >= H) return; const k = x + ',' + y; if (seen.has(k)) return; seen.add(k);
    cells.push([x, y, c]); if (x < minx) minx = x; if (x > maxx) maxx = x; if (y < miny) miny = y; if (y > maxy) maxy = y; };
  for (const [x, y, c] of r.cells) { put(x, y, c); if (sx) put(W - 1 - x, y, c); if (sy) put(x, H - 1 - y, c); if (sx && sy) put(W - 1 - x, H - 1 - y, c); }
  return cells.length ? { cells, minx, miny, maxx, maxy } : null; }
