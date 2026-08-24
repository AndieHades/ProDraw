// Сохранение открытого PSD идёт в исходный desktop path, а не в download.
import { S } from '../core/state.js';
import { buildExportDoc, docName } from './export/tree.js';
import { PSD } from './export/psd.js';

const writablePsd = (state) => state.sourceFormat === 'psd' &&
  /\.psd$/i.test(state.sourceLocation || '') ? state.sourceLocation : null;

export function createPsdSaver(encode, write, state = S) {
  return async () => {
    const location = writablePsd(state); if (!location || !write) return false;
    try { const output = await encode(buildExportDoc('project', false), docName());
      return Boolean(await write(location, new Uint8Array(await output.blob.arrayBuffer())));
    } catch { return false; }
  };
}

const desktopWrite = (location, bytes) => window.prodrawDesktop?.writeBinary(location,
  bytes.buffer);
export const saveActivePsd = createPsdSaver(PSD.encodeLayered.bind(PSD), desktopWrite);
