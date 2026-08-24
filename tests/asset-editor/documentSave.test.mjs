import { describe, expect, it } from 'vitest';
import { createDocumentSaver } from '../../src/systems/document-save.js';
import { createPsdSaver } from '../../src/systems/psd-save.js';

describe('current document save', () => {
  it('saves the working document once and reports its result', async () => {
    const results = [], save = createDocumentSaver(async () => true,
      (result) => results.push(result));
    await expect(save()).resolves.toBe(true);
    expect(results).toEqual([true]);
  });

  it('does not start a second persistence operation while one is pending', async () => {
    let release, starts = 0;
    const save = createDocumentSaver(() => new Promise((resolve) => {
      starts++; release = () => resolve(true);
    }), () => undefined);
    const first = save(), second = save();
    expect(await second).toBe(false); release();
    await expect(first).resolves.toBe(true); expect(starts).toBe(1);
  });
});

describe('opened PSD save', () => {
  it('writes the layered PSD bytes back to the remembered source path', async () => {
    const writes = [], state = { sourceFormat: 'psd', sourceLocation: 'C:/art/hero.psd' };
    const save = createPsdSaver(async () => ({ blob: new globalThis.Blob(['PSD']) }),
      async (location, bytes) => { writes.push({ location, bytes: [...bytes] }); return true; }, state);
    await expect(save()).resolves.toBe(true);
    expect(writes).toEqual([{ location: 'C:/art/hero.psd', bytes: [80, 83, 68] }]);
  });

  it('refuses a PSD without a durable desktop source path', async () => {
    const save = createPsdSaver(() => { throw new Error('must not encode'); }, null,
      { sourceFormat: 'psd', sourceLocation: null });
    await expect(save()).resolves.toBe(false);
  });
});
