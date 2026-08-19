export function shouldSmoothViewportScale(scale: number): boolean {
  return Number.isFinite(scale) && scale > 0 && scale !== 1;
}
