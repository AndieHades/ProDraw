/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { psdGalleryPreview } from '../../src/systems/gallery/psd-preview.ts';

describe('PSD gallery preview', () => {
  afterEach(() => vi.restoreAllMocks());

  it('encodes the embedded composite at gallery size', () => {
    const contexts = new WeakMap(), drawImage = vi.fn(), putImageData = vi.fn();
    vi.spyOn(globalThis.HTMLCanvasElement.prototype, 'getContext')
      .mockImplementation(function () {
        if (!contexts.has(this)) contexts.set(this, { drawImage, putImageData,
          createImageData: (width, height) => ({ width, height,
            data: new Uint8ClampedArray(width * height * 4) }) });
        return contexts.get(this);
      });
    vi.spyOn(globalThis.HTMLCanvasElement.prototype, 'toDataURL')
      .mockReturnValue('data:image/png;base64,preview');
    const preview = psdGalleryPreview({ width: 2, height: 2,
      composite: { left: 0, top: 0, width: 2, height: 2,
        rgba: new Uint8ClampedArray(16).fill(255) } });
    expect(preview).toBe('data:image/png;base64,preview');
    expect(putImageData).toHaveBeenCalledTimes(1);
    expect(drawImage).toHaveBeenCalledTimes(1);
  });

  it('keeps import usable when no composite is available', () => {
    expect(psdGalleryPreview({ width: 2, height: 2 })).toBeNull();
  });
});
