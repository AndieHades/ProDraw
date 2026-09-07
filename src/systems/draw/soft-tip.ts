// Твёрдые формы Pencil и Eraser с мягким краем и субпиксельным центром.
// Раньше отпечаток был бинарной маской по целым клеткам, и штрих собирался
// ступеньками Брезенхема; здесь покрытие пикселя считается по расстоянию до
// центра, поэтому край остаётся ровным на любом наклоне.
export type TipPaint = (x: number, y: number, opacity: number) => void;

const clamp01 = (value: number): number => value < 0 ? 0 : value > 1 ? 1 : value;

// Радиус в непрерывных координатах: центр пикселя `n` лежит в `n + 0.5`.
export const tipRadius = (size: number): number => Math.max(0.5, size / 2);

// Шаг между отпечатками вдоль пути: меньше пикселя, чтобы соседние отпечатки
// перекрывались и быстрое движение не давало разрывов.
export const tipSpacing = (radius: number): number =>
  Math.max(0.2, Math.min(1, radius * 0.25));

export function stampTip(centreX: number, centreY: number, radius: number,
  square: boolean, opacity: number, paint: TipPaint): void {
  const reach = radius + 0.5;
  const fromX = Math.floor(centreX - reach), toX = Math.ceil(centreX + reach);
  const fromY = Math.floor(centreY - reach), toY = Math.ceil(centreY + reach);
  for (let y = fromY; y <= toY; y++) for (let x = fromX; x <= toX; x++) {
    const dx = x + 0.5 - centreX, dy = y + 0.5 - centreY;
    const coverage = square
      ? clamp01(reach - Math.abs(dx)) * clamp01(reach - Math.abs(dy))
      : clamp01(reach - Math.sqrt(dx * dx + dy * dy));
    if (coverage > 0) paint(x, y, coverage * opacity);
  }
}
