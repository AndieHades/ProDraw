import { File } from 'node:buffer';
import { describe, expect, it, vi } from 'vitest';
import * as actions from '../../src/core/actions.ts';
import { importPsdSelection } from '../../src/systems/gallery/index.js';
import { importPsd } from '../../src/systems/import/editor.js';
import { dropImage } from '../../src/systems/import/index.js';
import { structuredPsd } from './psdFixture.ts';

describe('PSD entry routing', () => {
  it('uses the same new-document action for editor import, gallery and drop', async () => {
    const file = new File([structuredPsd()], 'routed.psd');
    const progress = { stage: vi.fn(), finish: vi.fn() };
    let completed = null, routed = 0;
    actions.registerOrReplace('gallery.beginPsdImport', () => ({ generation: 17 }));
    actions.registerOrReplace('gallery.completePsdImport',
      async (token, document, name, sourceLocation, receivedProgress) => {
        completed = { token, document, name, sourceLocation, receivedProgress };
        return 'opened';
      });
    expect(await importPsd(file, null, progress)).toBe(true);
    expect(completed).toMatchObject({ token: { generation: 17 }, name: 'routed', receivedProgress: progress,
      document: { width: 3, height: 2 } });
    expect(progress.stage).toHaveBeenCalledWith('decoding');

    const selectionProgress = { ready: vi.fn(async () => undefined),
      stage: vi.fn(), finish: vi.fn() };
    const beginProgress = vi.fn(() => selectionProgress);
    actions.registerOrReplace('import.psdFile', async (value, location, receivedProgress) => {
      expect(value).toBe(file);
      if (routed === 0) expect(receivedProgress).toBe(selectionProgress);
      if (routed === 1) expect(location).toBe('C:\\assets\\routed.psd');
      routed++; return true;
    });
    await importPsdSelection(file, null, beginProgress);
    expect(beginProgress).toHaveBeenCalledWith('routed.psd');
    expect(selectionProgress.ready).toHaveBeenCalledOnce();
    expect(selectionProgress.finish).toHaveBeenCalledWith(true);
    const dropped = dropImage(file, () => 'C:\\assets\\routed.psd');
    expect(routed).toBe(2);
    await dropped;
    expect(routed).toBe(2);
  });
});
