export function markMovingSwatches(
  palette: HTMLElement, indices: readonly number[], moving: boolean
): void {
  const selected = new Set(indices);
  for (const swatch of palette.querySelectorAll<HTMLElement>(".sw:not(.plus)")) {
    swatch.classList.toggle("dragging", moving && selected.has(Number(swatch.dataset.i)));
  }
}

export function clearPendingShade(palette: HTMLElement): void {
  palette.querySelectorAll(".shade-pending").forEach((swatch) =>
    swatch.classList.remove("shade-pending"));
}

export function updateShadeDrag(
  palette: HTMLElement, chip: HTMLElement, source: HTMLElement,
  target: HTMLElement | null, selecting: boolean, range: (to: number) => number[]
): { readonly indices: number[]; readonly selecting: boolean } {
  if (target && target !== source) {
    selecting = true; source.classList.remove("dragging"); chip.classList.remove("on");
  }
  if (!target || !selecting) return { indices: [], selecting };
  const indices = range(Number(target.dataset.i));
  const selected = new Set(indices);
  for (const swatch of palette.querySelectorAll<HTMLElement>(".sw:not(.plus)")) {
    swatch.classList.toggle("shade-pending", selected.has(Number(swatch.dataset.i)));
  }
  return { indices, selecting };
}
