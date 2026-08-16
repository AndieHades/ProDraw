// Кольца обводки: пустые клетки, прилегающие к контенту, за size проходов.
// Чисто (для превью); применение с расширением холста — в системе.
export const N8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];

export function outlineRings(grid, W, H, size) {
  const filled = Array.from({ length: H }, (_, y) => Array.from({ length: W }, (_, x) => !!grid[y][x]));
  const pre = [];
  for (let pass = 0; pass < size; pass++) { const ring = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { if (filled[y][x]) continue;
      let near = false;
      for (const [dx, dy] of N8) { const x2 = x + dx, y2 = y + dy; if (x2 < 0 || y2 < 0 || x2 >= W || y2 >= H) continue; if (filled[y2][x2]) { near = true; break; } }
      if (near) ring.push([x, y]); }
    for (const [x, y] of ring) { filled[y][x] = true; pre.push([x, y]); } }
  return pre;
}
