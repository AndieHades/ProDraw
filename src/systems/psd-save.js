// Сохранение открытого PSD идёт в исходный desktop path, а не в download.
import { S } from '../core/state.js';
import { buildExportDoc, docName } from './export/tree.js';
import { PSD } from './export/psd.js';
import { PNG } from './export/png.ts';
import { flattenNodes } from './export/render.js';
import { createSourceFileSaver } from './SourceFileSave.ts';

export function createPsdSaver(encode, write, state = S) {
  return createSourceFileSaver({ state, format: 'psd', extension: /\.psd$/i, write,
    encode: () => encode(buildExportDoc('project', false), docName()) });
}

export function createPngSaver(encode, write, state = S) {
  return createSourceFileSaver({ state, format: 'png', extension: /\.png$/i,
    write, encode });
}

const desktopWrite = (location, bytes) => window.prodrawDesktop?.writeBinary(location,
  bytes.buffer);
export const saveActivePsd = createPsdSaver(PSD.encodeLayered.bind(PSD), desktopWrite);
const encodePng = () => { const doc = buildExportDoc('project', false);
  return PNG.encode(flattenNodes(doc.root, false, true), docName()); };
export const saveActivePng = createPngSaver(encodePng, desktopWrite);
