// Raster cells are immutable values. Large imported PSDs often repeat the same
// RGBA value millions of times, so one shared cell per colour avoids heap blowup.
export type InternedCell = readonly number[];

export interface RasterCellInterner {
  rgba(red: number, green: number, blue: number, alpha: number): InternedCell;
  copy(cell: readonly number[]): InternedCell;
}

const rgbaKey = (red: number, green: number, blue: number, alpha: number): number =>
  ((((red & 255) << 24) >>> 0) | ((green & 255) << 16) |
    ((blue & 255) << 8) | (alpha & 255)) >>> 0;
const rgbKey = (red: number, green: number, blue: number): number =>
  ((red & 255) << 16) | ((green & 255) << 8) | (blue & 255);

export function createRasterCellInterner(): RasterCellInterner {
  const rgb = new Map<number, InternedCell>(), rgba = new Map<number, InternedCell>();
  const rgbCell = (red: number, green: number, blue: number): InternedCell => {
    const key = rgbKey(red, green, blue), known = rgb.get(key);
    if (known) return known;
    const cell = Object.freeze([red, green, blue]); rgb.set(key, cell); return cell;
  };
  const rgbaCell = (red: number, green: number, blue: number,
    alpha: number): InternedCell => {
    const key = rgbaKey(red, green, blue, alpha), known = rgba.get(key);
    if (known) return known;
    const cell = Object.freeze([red, green, blue, alpha]);
    rgba.set(key, cell); return cell;
  };
  return { rgba: rgbaCell, copy: (cell) => cell.length > 3
    ? rgbaCell(cell[0] ?? 0, cell[1] ?? 0, cell[2] ?? 0, cell[3] ?? 255)
    : rgbCell(cell[0] ?? 0, cell[1] ?? 0, cell[2] ?? 0) };
}
