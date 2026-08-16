// Поле расстояний (чамфер) от пустых клеток до контента и мягкий ореол по нему.
// Чисто: на входе сетка + размеры.
export function glowField(grid, W, H) { const d = new Float32Array(W * H), INF = 1e9;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) d[y * W + x] = grid[y][x] ? 0 : INF;
  const upd = (i, j, c) => { if (d[j] + c < d[i]) d[i] = d[j] + c; };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x;
    if (x > 0) upd(i, i - 1, 3); if (y > 0) upd(i, i - W, 3);
    if (x > 0 && y > 0) upd(i, i - W - 1, 4); if (x < W - 1 && y > 0) upd(i, i - W + 1, 4); }
  for (let y = H - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) { const i = y * W + x;
    if (x < W - 1) upd(i, i + 1, 3); if (y < H - 1) upd(i, i + W, 3);
    if (x < W - 1 && y < H - 1) upd(i, i + W + 1, 4); if (x > 0 && y < H - 1) upd(i, i + W - 1, 4); }
  return d; }

export function computeGlow(grid, W, H, range, intensity) { const d = glowField(grid, W, H), out = []; // [x, y, alpha]
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const dist = d[y * W + x] / 3;
    if (dist > 0 && dist <= range) { const a = Math.round(255 * intensity * Math.pow(1 - dist / range, 1.5));
      if (a > 0) out.push([x, y, a]); } }
  return out; }
