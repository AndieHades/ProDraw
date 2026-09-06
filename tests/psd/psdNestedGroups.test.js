import { describe, expect, it } from 'vitest';
import { decodePsdDocument } from '../../src/core/psd/decodePsdDocument.ts';
import { buildPsdGalleryRecord } from '../../src/systems/gallery/psd-record.js';
import { nestedPsd, structuredPsd } from './psdFixture.ts';

describe('PSD nested groups', () => {
  it('keeps a collapsed PSD group collapsed in the gallery record', () => {
    const document = decodePsdDocument(structuredPsd());
    const record = buildPsdGalleryRecord('collapsed', 'Collapsed', document);
    expect(record.folders[0]).toMatchObject({ name: 'Group Ю', open: false });
  });

  it('keeps isolated/pass-through hierarchy in the editable gallery record', () => {
    const document = decodePsdDocument(nestedPsd());
    const record = buildPsdGalleryRecord('nested', 'Nested', document);
    expect(record.folders).toMatchObject([
      { id: 1, parent: null, name: 'Outer', blendMode: 'normal' },
      { id: 2, parent: 1, name: 'Inner', blendMode: 'pass through' },
    ]);
    expect(record.layers[0]).toMatchObject({ name: 'Pixel', fid: 2,
      blendMode: 'normal' });
    expect(record.layers[0].grid[0][0]).toEqual([40, 80, 120, 192]);
  });

  it('converts either decoded direction into the bottom-first runtime stack', () => {
    const leaf = (name, rgba) => ({ kind: 'layer', name, visible: true,
      opacity: 1, blendMode: 'normal', effects: [], bitmap: { left: 0, top: 0,
        width: 1, height: 1, rgba: new Uint8ClampedArray(rgba) }, masks: [],
      clipping: false, locked: false, alphaLocked: false });
    const bottom = leaf('Bottom', [0, 0, 255, 255]);
    const top = leaf('Top', [255, 0, 0, 255]);
    const record = (stackOrder, children) => buildPsdGalleryRecord('order', 'Order',
      { width: 1, height: 1, dpi: 72, stackOrder, children, warnings: [] });
    expect(record('top-first', [top, bottom]).layers.map(({ name }) => name))
      .toEqual(['Bottom', 'Top']);
    expect(record('bottom-first', [bottom, top]).layers.map(({ name }) => name))
      .toEqual(['Bottom', 'Top']);
  });
});
