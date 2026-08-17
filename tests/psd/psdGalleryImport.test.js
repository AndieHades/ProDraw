import { IDBFactory } from 'fake-indexeddb';
import { describe, expect, it } from 'vitest';
import { decodePsdDocument } from '../../src/core/psd/decodePsdDocument.ts';
import { getDoc, listDocs } from '../../src/core/storage.js';
import { S } from '../../src/core/state.js';
import { beginPsdImport, completePsdImport, curWorkId } from
  '../../src/systems/gallery/doc.js';
import { structuredPsd } from './psdFixture.ts';

describe('PSD gallery transaction', () => {
  it('persists a fresh work before opening and ignores a superseded import', async () => {
    globalThis.indexedDB = new IDBFactory();
    const decoded = decodePsdDocument(structuredPsd());
    const token = beginPsdImport();
    const result = await completePsdImport(token, decoded, 'Imported');
    expect(result).toEqual({ status: 'opened', layerCount: 1 });
    expect(S).toMatchObject({ W: 3, H: 2, dpi: 300, docName: 'Imported',
      sourceFormat: 'psd' });
    expect(S.layers[0]).toMatchObject({ name: 'Masked α', visible: false,
      blendMode: 'multiply', clip: true, lock: true, alphaLock: true });
    expect(S.layers[0].grid[0][1]).toEqual([255, 0, 0, 1]);
    expect(S.layers[0].masks[0].alpha).toEqual(new Uint8Array([0, 64, 128, 255]));
    expect(S.folders[0]).toMatchObject({ name: 'Group Ю', open: false,
      blendMode: 'pass through' });
    const stored = await getDoc(curWorkId());
    expect(stored).toMatchObject({ kind: 'doc', name: 'Imported', dpi: 300,
      sourceFormat: 'psd' });
    expect(stored.layers[0].masks[0].alpha).toEqual(new Uint8Array([0, 64, 128, 255]));

    const stale = beginPsdImport(); beginPsdImport();
    expect(await completePsdImport(stale, decoded, 'Stale')).toEqual({
      status: 'superseded', layerCount: 0 });
    expect((await listDocs()).map(({ name }) => name)).toEqual(['Imported']);
  });
});
