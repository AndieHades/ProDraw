// Палитра из растрового источника: точный набор цветов, пока их немного, и
// выборка с уменьшением, когда изображение крупное.
import { makeCanvas } from "./canvas.ts";
import { exactPaletteFromRgba, samplesFromRgba,
  sourcePaletteFromSamples } from "../logic/palette-samples.ts";
import { PALETTE_EXACT_LIMIT, PALETTE_EXACT_MAX_PIXELS,
  PALETTE_QUANTIZED_COLORS, PALETTE_SAMPLE_MAX_SIDE } from "../config/palette-sampling.ts";

export type PaletteColor = number[];
export interface PaletteSampleSize {
  readonly width: number; readonly height: number; readonly scale: number;
}
export interface PaletteSampleResult extends PaletteSampleSize {
  readonly colors: PaletteColor[];
  readonly cancelled: boolean;
}
export interface PaletteSampleOptions {
  readonly maxSide?: number;
  readonly limit?: number;
  readonly smoothing?: boolean;
  readonly isCancelled?: () => boolean;
  readonly createCanvas?: (width: number, height: number) => HTMLCanvasElement;
}

const stopped = (isCancelled?: () => boolean): boolean => Boolean(isCancelled?.());

export function paletteFromImageData(data: Uint8ClampedArray,
  limit: number = PALETTE_EXACT_LIMIT): PaletteColor[] {
  const exact = exactPaletteFromRgba(data, limit);
  if (!exact.overflow) return exact.colors.slice(0, limit);
  const samples = samplesFromRgba(data);
  const count = limit === PALETTE_EXACT_LIMIT ? PALETTE_QUANTIZED_COLORS : limit;
  return samples.length ? sourcePaletteFromSamples(samples, count) : [];
}

export function paletteSampleSize(width: number, height: number,
  maxSide: number = PALETTE_SAMPLE_MAX_SIDE): PaletteSampleSize {
  const w = Math.max(1, Math.round(width) || 1);
  const h = Math.max(1, Math.round(height) || 1);
  const scale = Math.min(1, Math.max(1, maxSide) / Math.max(w, h));
  return { width: Math.max(1, Math.round(w * scale)),
    height: Math.max(1, Math.round(h * scale)), scale };
}

const cancelledResult = (size: PaletteSampleSize): PaletteSampleResult =>
  ({ colors: [], cancelled: true, ...size });

export function paletteFromCanvasSource(source: CanvasImageSource, width: number,
  height: number, options: PaletteSampleOptions = {}): PaletteSampleResult {
  const size = paletteSampleSize(width, height, options.maxSide);
  if (stopped(options.isCancelled)) return cancelledResult(size);
  const createCanvas = options.createCanvas ?? makeCanvas;
  const canvas = createCanvas(size.width, size.height);
  const context = canvas?.getContext?.("2d");
  if (!context) return { colors: [], cancelled: false, ...size };
  context.imageSmoothingEnabled = options.smoothing ?? size.scale < 1;
  context.drawImage(source, 0, 0, size.width, size.height);
  if (stopped(options.isCancelled)) return cancelledResult(size);
  const data = context.getImageData(0, 0, size.width, size.height).data;
  if (stopped(options.isCancelled)) return cancelledResult(size);
  return { colors: paletteFromImageData(data, options.limit),
    cancelled: false, ...size };
}

export function paletteFromPointSource(width: number, height: number,
  pointAt: (x: number, y: number) => readonly number[] | null | undefined,
  options: PaletteSampleOptions = {}): PaletteSampleResult {
  const size = paletteSampleSize(width, height, options.maxSide);
  if (stopped(options.isCancelled)) return cancelledResult(size);
  const data = new Uint8ClampedArray(size.width * size.height * 4);
  for (let y = 0; y < size.height; y++) {
    if (stopped(options.isCancelled)) return cancelledResult(size);
    const sy = Math.min(height - 1, Math.floor((y + 0.5) * height / size.height));
    for (let x = 0; x < size.width; x++) {
      const sx = Math.min(width - 1, Math.floor((x + 0.5) * width / size.width));
      const color = pointAt(sx, sy); if (!color) continue;
      const offset = (y * size.width + x) * 4;
      data[offset] = color[0] ?? 0; data[offset + 1] = color[1] ?? 0;
      data[offset + 2] = color[2] ?? 0; data[offset + 3] = color[3] ?? 255;
    }
  }
  if (stopped(options.isCancelled)) return cancelledResult(size);
  return { colors: paletteFromImageData(data, options.limit),
    cancelled: false, ...size };
}

export function paletteFromImageSource(image: HTMLImageElement,
  limit: number = PALETTE_EXACT_LIMIT): PaletteColor[] {
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  const exact = width * height <= PALETTE_EXACT_MAX_PIXELS;
  const maxSide = exact ? Math.max(width, height) : PALETTE_SAMPLE_MAX_SIDE;
  return paletteFromCanvasSource(image, width, height, { limit, maxSide }).colors;
}
