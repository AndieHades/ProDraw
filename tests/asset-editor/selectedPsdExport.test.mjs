import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { newLayer, S } from '../../src/core/state.js';
import { runExport } from '../../src/systems/export/pipeline.js';
import { SELECTED_PSD_EXPORT_OPTIONS, exportSelectedPsd } from
  '../../src/systems/export/selected-psd.js';

function selectedDocument() {
  S.W = 4; S.H = 3; S.docName = 'characters'; S.cur = 2;
  S.layers = ['Base', 'Shadow', 'Highlight'].map((name) => newLayer(name, 4, 3));
  S.layers[1].visible = false;
  S.marked = new Set([0, 2]); S.markedFolders = new Set(); S.selFolder = null;
}

describe('selected layered PSD export', () => {
  it('uses one selected-layer PSD contract from the context menu', async () => {
    selectedDocument();
    const previousDocument = globalThis.document;
    globalThis.document = { getElementById: () => null };
    const documents = [], saved = [];
    const original = { ...SELECTED_PSD_EXPORT_OPTIONS };
    const format = { encodeLayered: async (document, name) => {
      documents.push({ document, name });
      return { name: `${name}.psd`, blob: new globalThis.Blob(['PSD']), mime: 'image/vnd.adobe.photoshop', desc: 'PSD' };
    } };
    try {
      const result = await runExport(SELECTED_PSD_EXPORT_OPTIONS,
        async (output) => saved.push(output), undefined, { psd: format });
      expect(result).toEqual([{ name: 'characters.psd', mime: 'image/vnd.adobe.photoshop', desc: 'PSD' }]);
      expect(documents[0].document.root.map((node) => node.name)).toEqual(['Base', 'Highlight']);
      expect(saved).toHaveLength(1);
      expect(SELECTED_PSD_EXPORT_OPTIONS).toEqual(original);
    } finally { globalThis.document = previousDocument; }
  });

  it('routes the context command and main export dialog through the same options', () => {
    const calls = [];
    exportSelectedPsd((options) => calls.push(options));
    expect(calls).toEqual([SELECTED_PSD_EXPORT_OPTIONS]);
    expect(readFileSync('index.html', 'utf8')).toContain('id="lctx-psd"');
  });
});
