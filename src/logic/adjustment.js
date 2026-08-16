import { bcAdjust, contrastFactor } from './bc.js';
import { hsvToRgb, rgbToHsv } from './color.js';
import { clamp } from './math.js';

export function adjustColor(c, params = {}) {
  const brightness = Number(params.brightness) || 0;
  const contrast = Number(params.contrast) || 0;
  const saturation = Number(params.saturation) || 0;
  const hue = Number(params.hue) || 0;
  let out = bcAdjust(c, brightness * 1.27, contrastFactor(contrast * 1.27));
  if (saturation || hue) {
    const [h, s, v] = rgbToHsv(out[0], out[1], out[2]);
    const rgb = hsvToRgb(h + hue, clamp(s + saturation, 0, 100), v);
    out = out.length > 3 ? [...rgb, out[3]] : rgb;
  }
  return out;
}

export function adjustmentParams(params = {}) {
  return {
    brightness: Number(params.brightness) || 0,
    contrast: Number(params.contrast) || 0,
    saturation: Number(params.saturation) || 0,
    hue: Number(params.hue) || 0,
  };
}
