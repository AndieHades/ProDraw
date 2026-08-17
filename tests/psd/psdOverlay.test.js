import { describe, expect, it } from 'vitest';
import { applyPsdOverlays } from '../../src/logic/psd/effectOverlay.ts';
import { blendPixel } from '../../src/logic/psd/blendMode.ts';

describe('PSD effect overlays', () => {
  it('renders color and gradient overlays without changing source alpha', () => {
    const color = new Uint8ClampedArray([100, 100, 100, 1]);
    applyPsdOverlays(color, 1, 1, [{ type: 'colorOverlay', visible: true,
      opacity: 0.5, params: { color: '#ff0000', blendMode: 'normal' } }]);
    expect([...color]).toEqual([178, 50, 50, 1]);
    const gradient = new Uint8ClampedArray([100, 100, 100, 128,
      100, 100, 100, 128]);
    applyPsdOverlays(gradient, 2, 1, [{ type: 'gradientOverlay', visible: true,
      opacity: 1, params: { angle: 0, type: 'linear', gradient: { colorStops: [
        { location: 0, color: { r: 0, g: 0, b: 0 } },
        { location: 4096, color: { r: 255, g: 255, b: 255 } }] } } }]);
    expect(gradient[0]).toBeLessThan(gradient[4]);
    expect([gradient[3], gradient[7]]).toEqual([128, 128]);
  });

  it('keeps mask, clipping, opacity, group opacity, effect and blend order stable', () => {
    const source = new Uint8ClampedArray([200, 100, 50, 255]);
    applyPsdOverlays(source, 1, 1, [{ type: 'colorOverlay', visible: true,
      opacity: 0.4, params: { color: '#0a141e', blendMode: 'normal' } }]);
    expect([...source]).toEqual([124, 68, 42, 255]);
    const maskedAndClippedAlpha = Math.round(255 * (128 / 255) * (128 / 255));
    expect(blendPixel([80, 160, 240, 255],
      [source[0], source[1], source[2], maskedAndClippedAlpha], 0.5 * 0.75,
      'multiply')).toEqual([76, 149, 221, 255]);
  });
});
