import './app.js';
import { registerLegacyClose } from './app/registerLegacyClose.ts';
import { saveCurrent } from './systems/gallery/doc.js';
import { interrupt } from './systems/input/index.js';

registerLegacyClose(window.prodrawDesktop, { finishInput: () => interrupt(), saveCurrent });
