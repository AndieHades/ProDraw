import { sortGalleryItems } from "../../logic/gallery-grid.ts";
import type { GalleryGridItem } from "../../logic/gallery-grid.ts";

const mounted = new WeakSet<HTMLElement>();
const pixels = (value: string, fallback: number): number => {
  const parsed = Number.parseFloat(value); return Number.isFinite(parsed) ? parsed : fallback;
};
function metrics(grid: HTMLElement) {
  const view = grid.ownerDocument.defaultView ?? window;
  const style = view.getComputedStyle(grid);
  return { gap: pixels(style.getPropertyValue("--gal-grid-gap"), 14),
    min: pixels(style.getPropertyValue("--gal-tile-min"), 112),
    max: pixels(style.getPropertyValue("--gal-tile-max"), 156),
    left: pixels(style.paddingLeft, 0), right: pixels(style.paddingRight, 0) };
}
export function updateGalleryGrid(grid: HTMLElement): void {
  const values = metrics(grid), view = grid.ownerDocument.defaultView ?? window;
  const inner = Math.max(0, (grid.clientWidth || view.innerWidth || 0) -
    values.left - values.right);
  const columns = Math.max(1, Math.floor((inner + values.gap) /
    (values.min + values.gap)));
  const tile = Math.max(values.min, Math.min(values.max,
    Math.floor((inner - values.gap * (columns - 1)) / columns)));
  grid.style.setProperty("--gal-tile", `${tile}px`);
}
export function mountGalleryGrid(grid: HTMLElement): void {
  if (mounted.has(grid)) return; mounted.add(grid);
  const view = grid.ownerDocument.defaultView ?? window;
  const update = (): void => updateGalleryGrid(grid);
  const observer = (view as Window & { ResizeObserver?: typeof ResizeObserver }).ResizeObserver;
  if (observer) new observer(update).observe(grid);
  else view.addEventListener("resize", update); update();
}
export async function renderGalleryGrid<T extends GalleryGridItem>(grid: HTMLElement,
  items: readonly T[], createTile: (item: T) => Promise<Node>): Promise<void> {
  mountGalleryGrid(grid); updateGalleryGrid(grid); grid.innerHTML = "";
  for (const item of sortGalleryItems(items)) grid.appendChild(await createTile(item));
}
