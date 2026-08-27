// Raster cells are immutable values. Large imported PSDs often repeat the same
// RGBA value millions of times, so one shared cell per colour avoids heap blowup.
const rgbaKey = (red, green, blue, alpha) =>
  ((((red & 255) << 24) >>> 0) | ((green & 255) << 16) |
    ((blue & 255) << 8) | (alpha & 255)) >>> 0;
const rgbKey = (red, green, blue) =>
  ((red & 255) << 16) | ((green & 255) << 8) | (blue & 255);

export function createRasterCellInterner() {
  const rgb = new Map(), rgba = new Map();
  const rgbCell = (red, green, blue) => {
    const key = rgbKey(red, green, blue), known = rgb.get(key);
    if (known) return known;
    const cell = Object.freeze([red, green, blue]); rgb.set(key, cell); return cell;
  };
  const rgbaCell = (red, green, blue, alpha) => {
    const key = rgbaKey(red, green, blue, alpha), known = rgba.get(key);
    if (known) return known;
    const cell = Object.freeze([red, green, blue, alpha]);
    rgba.set(key, cell); return cell;
  };
  return { rgba: rgbaCell, copy: (cell) => cell.length > 3
    ? rgbaCell(cell[0], cell[1], cell[2], cell[3])
    : rgbCell(cell[0], cell[1], cell[2]) };
}
