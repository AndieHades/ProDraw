// Контекст-меню тайла в палитре: dup/rename/variant/delete.
// Variant дёргается по имени через actions — без прямого импорта систем.
import * as actions from '../../core/actions.js';
import { $, showMenuAt, t } from '../../core/dom.js';
import { dupTile, delTile, transformTile } from './ops.js';
import { startTileRename } from './list.js';

let menu = null;

function item(label, fn) { const b = document.createElement('button'); b.textContent = label;
  b.onclick = () => { menu.classList.remove('on'); fn(); }; return b; }

function build() {
  if (menu) return menu;
  menu = document.createElement('div'); menu.id = 'tile-menu'; menu.className = 'menu';
  document.body.appendChild(menu); return menu;
}

export function openTileMenu(x, y, tileId) {
  build(); menu.innerHTML = '';
  menu.append(
    item(t('tile.dup'), () => dupTile(tileId)),
    item(t('tile.rename'), () => startTileRename(tileId)),
    item(t('tile.flipH'), () => transformTile(tileId, 'flipH')),
    item(t('tile.flipV'), () => transformTile(tileId, 'flipV')),
    item(t('tile.rot90'), () => transformTile(tileId, 'rot90')),
    item(t('tile.variant'), () => actions.run('tile.variant')),
    item(t('tile.delete'), () => delTile(tileId)),
  );
  showMenuAt(menu, x, y);
}

export const menuEl = () => $('tile-menu');
