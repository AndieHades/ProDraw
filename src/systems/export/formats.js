// Реестр форматов экспорта. Каждый формат сам объявляет возможности
// (supportsFlattened/Layered/SeparateFiles/Folders/LayerEffects/HiddenLayers),
// поэтому UI и пайплайн ничего о форматах не «хардкодят». Новый формат — добавить
// модуль и одну строку здесь; логика экспорта не меняется.
import { PNG } from './png.js';
import { PSD } from './psd.js';

export const FORMAT_LIST = [PNG, PSD];
export const FORMATS = Object.fromEntries(FORMAT_LIST.map((f) => [f.id, f]));
// какая возможность отвечает за каждый режим экспорта
export const MODE_CAP = { flattened: 'supportsFlattened', layered: 'supportsLayered', separate: 'supportsSeparateFiles' };
