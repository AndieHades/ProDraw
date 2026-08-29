import { IDBFactory } from 'fake-indexeddb';
import { describe, expect, it } from 'vitest';
import { decodePsdDocument } from '../../src/core/psd/decodePsdDocument.ts';
import { getDoc, listDocs } from '../../src/core/storage.ts';
import { S } from '../../src/core/state.js';
import { beginPsdImport, completePsdImport, curWorkId } from
  '../../src/systems/gallery/doc.js';
import { structuredPsd } from './psdFixture.ts';

describe('PSD gallery transaction', () => {
  it('persists a fresh work before opening and ignores a superseded import', async () => {
    globalThis.indexedDB = new IDBFactory();
    const decoded = decodePsdDocument(structuredPsd());
    const token = beginPsdImport();
    const stages = [];
    const result = await completePsdImport(token, decoded, 'Imported',
      'C:/assets/Imported.psd', { stage: (value) => stages.push(value) });
    expect(result).toEqual({ status: 'opened', layerCount: 1, warningCount: 1 });
    expect(stages).toEqual(['preparing', 'saving', 'opening']);
    expect(S).toMatchObject({ W: 3, H: 2, dpi: 300, docName: 'Imported',
      sourceFormat: 'psd', sourceLocation: 'C:/assets/Imported.psd' });
    expect(S.layers[0]).toMatchObject({ name: 'Masked α', visible: false,
      blendMode: 'multiply', clip: true, lock: true, alphaLock: true });
    expect(S.layers[0].grid[0][1]).toEqual([255, 0, 0, 1]);
    expect(S.layers[0].masks[0].alpha).toEqual(new Uint8Array([0, 64, 128, 255]));
    expect(S.layers[0].psdBounds).toEqual({ left: 1, top: 0, width: 2, height: 2 });
    expect(S.layers[0].effects.map(({ type }) => type))
      .toEqual(['dropShadow', 'colorOverlay']);
    expect(S.layers[0].effects[0]).toMatchObject({ opacity: 0.6,
      params: { size: 3, dx: 1, dy: 2, color: '#010203' } });
    expect(S.layers[0].effects[1]).toMatchObject({ opacity: 0.4,
      params: { color: '#0a141e' } });
    expect(S.folders[0]).toMatchObject({ name: 'Group Ю', open: false,
      blendMode: 'pass through' });
    const stored = await getDoc(curWorkId());
    expect(stored).toMatchObject({ kind: 'doc', name: 'Imported', dpi: 300,
      sourceFormat: 'psd', sourceLocation: 'C:/assets/Imported.psd' });
    expect(stored.layers[0].masks[0].alpha).toEqual(new Uint8Array([0, 64, 128, 255]));
    expect(stored.layers[0].psdBounds).toEqual({ left: 1, top: 0, width: 2, height: 2 });
    expect(stored.layers[0].effects.map(({ type }) => type))
      .toEqual(['dropShadow', 'colorOverlay']);
    expect(stored.psdWarnings).toEqual(['mask.feather.approximate']);

    const stale = beginPsdImport(); beginPsdImport();
    expect(await completePsdImport(stale, decoded, 'Stale')).toEqual({
      status: 'superseded', layerCount: 0, warningCount: 0 });
    expect((await listDocs()).map(({ name }) => name)).toEqual(['Imported']);
  });
});
