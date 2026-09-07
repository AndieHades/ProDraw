import './app.js';
import { registerLegacyClose } from './app/registerLegacyClose.ts';
import { saveCurrent } from './systems/gallery/doc.js';

registerLegacyClose(window.prodrawDesktop, saveCurrent);
