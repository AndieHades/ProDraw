// GalleryGrid: adaptive square, left-aligned tiles fed by gallery items.
import { sortGalleryItems } from '../../logic/gallery-grid.js';

const px = (value, fallback) => {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : fallback;
};

function metrics(grid) {
  const win = grid.ownerDocument.defaultView || window;
  const st = win.getComputedStyle(grid);
  return {
    gap: px(st.getPropertyValue('--gal-grid-gap'), 14),
    min: px(st.getPropertyValue('--gal-tile-min'), 112),
    max: px(st.getPropertyValue('--gal-tile-max'), 156),
    padL: px(st.paddingLeft, 0),
    padR: px(st.paddingRight, 0),
  };
}

export function updateGalleryGrid(grid) {
  const m = metrics(grid);
  const win = grid.ownerDocument.defaultView || window;
  const inner = Math.max(0, (grid.clientWidth || win.innerWidth || 0) - m.padL - m.padR);
  const cols = Math.max(1, Math.floor((inner + m.gap) / (m.min + m.gap)));
  const tile = Math.max(m.min, Math.min(m.max, Math.floor((inner - m.gap * (cols - 1)) / cols)));
  grid.style.setProperty('--gal-tile', tile + 'px');
}

export function mountGalleryGrid(grid) {
  if (grid.__galleryGridMounted) return;
  grid.__galleryGridMounted = true;
  const win = grid.ownerDocument.defaultView || window;
  const update = () => updateGalleryGrid(grid);
  if ('ResizeObserver' in win) new win.ResizeObserver(update).observe(grid);
  else win.addEventListener('resize', update);
  update();
}

export async function renderGalleryGrid(grid, items, createTile) {
  mountGalleryGrid(grid);
  updateGalleryGrid(grid);
  grid.innerHTML = '';
  for (const item of sortGalleryItems(items)) {
    grid.appendChild(await createTile(item));
  }
}
