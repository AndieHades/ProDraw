import { File } from 'node:buffer';
import { describe, expect, it } from 'vitest';
import * as actions from '../../src/core/actions.ts';
import { importPsdSelection } from '../../src/systems/gallery/index.js';
import { importPsd } from '../../src/systems/import/editor.js';
import { dropImage } from '../../src/systems/import/index.js';
import { structuredPsd } from './psdFixture.ts';

describe('PSD entry routing', () => {
  it('uses the same new-document action for editor import, gallery and drop', async () => {
    const file = new File([structuredPsd()], 'routed.psd');
    let completed = null, routed = 0;
    actions.registerOrReplace('gallery.beginPsdImport', () => 17);
    actions.registerOrReplace('gallery.completePsdImport',
      async (token, document, name) => {
        completed = { token, document, name }; return 'opened';
      });
    expect(await importPsd(file)).toBe(true);
    expect(completed).toMatchObject({ token: 17, name: 'routed',
      document: { width: 3, height: 2 } });

    actions.registerOrReplace('import.psdFile', async (value) => {
      expect(value).toBe(file); routed++; return true;
    });
    await importPsdSelection(file);
    const dropped = dropImage(file);
    expect(routed).toBe(2);
    await dropped;
    expect(routed).toBe(2);
  });
});
