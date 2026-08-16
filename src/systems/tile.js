// Tile Mode: бесшовный 3×3-повтор холста с заворотом рисования (как в Aseprite).
// Кнопка-тумблер в сайдбаре рядом с сеткой. Сам повтор рисует render, заворот
// координат — слой рисования (cells/flood) и перемещение; здесь только режим.
import { S } from '../core/state.js';
import * as bus from '../core/bus.js';
import * as actions from '../core/actions.js';
import { $ } from '../core/dom.js';

const sync = () => { const b = $('tile-btn'); if (b) b.classList.toggle('on', !!(S.tile && S.tile.on)); };

export function toggleTile() { S.tile.on = !S.tile.on; sync(); bus.emit('render'); }

export function mount() {
  sync();
  $('tile-btn').onclick = toggleTile;
  actions.register('view.tile', toggleTile);
}
