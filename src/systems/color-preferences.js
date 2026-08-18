import { S } from '../core/state.js';
import * as bus from '../core/bus.ts';
import { saveActiveColor } from '../core/color-prefs.ts';

export function mount() {
  const save = () => saveActiveColor(S.active);
  bus.on('color-sync', save); bus.on('palette', save);
}
