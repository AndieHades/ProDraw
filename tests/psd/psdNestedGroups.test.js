import { describe, expect, it } from 'vitest';
import { decodePsdDocument } from '../../src/core/psd/decodePsdDocument.ts';
import { buildPsdGalleryRecord } from '../../src/systems/gallery/psd-record.js';
import { nestedPsd } from './psdFixture.ts';

describe('PSD nested groups', () => {
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
});
