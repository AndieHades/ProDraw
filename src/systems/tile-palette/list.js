// Рендер списка тайлов как свотчей: превью В РЕАЛЬНОМ размере тайла (16×16,
// 48×48 — без масштабирования), индекс, имя, метка группы, состояния
// active/marked. Выбор/перестановка/паттерн — select.js, меню — menu.js.
import { S } from '../../core/state.js';
import { $ } from '../../core/dom.js';
import { makeCanvas } from '../../core/canvas.js';
import { inlineRename } from '../../core/inline-rename.js';
import { snapshot } from '../../core/history.js';
import { C } from '../../styles/canvas-colors.js';
import { activeTileset } from './ops.js';
import { renameTile } from '../../core/tileset.js';
import { wireTile } from './select.js';

// превью тайла в его реальном пиксельном размере (1:1), с шахматкой под альфой
function tilePreview(ts, tile) {
  const w = ts.tileW, h = ts.tileH, c = makeCanvas(w, h); c.className = 'tile-th';
  c.style.width = w + 'px'; c.style.height = h + 'px';
  const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
  x.fillStyle = C.checkA; x.fillRect(0, 0, w, h); x.fillStyle = C.checkB;
  for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) if ((xx + yy) & 1) x.fillRect(xx, yy, 1, 1);
  const id = x.getImageData(0, 0, w, h);
  for (let y = 0; y < h; y++) for (let xx = 0; xx < w; xx++) { const cc = tile.grid[y][xx]; if (!cc) continue;
    const o = (y * w + xx) * 4; id.data[o] = cc[0]; id.data[o + 1] = cc[1]; id.data[o + 2] = cc[2]; id.data[o + 3] = cc.length > 3 ? cc[3] : 255; }
  x.putImageData(id, 0, 0); return c;
}

function tileCell(ts, tile, index) {
  const cell = document.createElement('div'); cell.className = 'tile-cell'; cell.dataset.tid = tile.id;
  const a = S.activeTile;
  if (a && a.tilesetId === ts.id && a.tileId === tile.id && a.groupId == null) cell.classList.add('on');
  if (S.tileMarks.has(tile.id)) cell.classList.add('marked');
  cell.appendChild(tilePreview(ts, tile));
  const cap = document.createElement('span'); cap.className = 'tile-idx'; cap.textContent = index; cell.appendChild(cap);
  const nm = document.createElement('span'); nm.className = 'tile-nm'; nm.textContent = tile.name || ''; cell.appendChild(nm);
  if (tile.groupId != null) cell.classList.add('grouped');
  wireTile(cell, ts, tile.id); // выбор/перестановка/меню — те же механики, что у свотчей
  return cell;
}

export function renderTiles() {
  const box = $('tile-list'); if (!box) return; box.innerHTML = '';
  const ts = activeTileset(); if (!ts) return;
  ts.tiles.forEach((tile, i) => box.appendChild(tileCell(ts, tile, i)));
}

// инлайн-переименование тайла по id (из меню)
export function startTileRename(tileId) {
  const ts = activeTileset(); if (!ts) return;
  const cell = document.querySelector('#tile-list .tile-cell[data-tid="' + tileId + '"]');
  const span = cell && cell.querySelector('.tile-nm'); const tile = ts.tiles.find((x) => x.id === tileId); if (!span || !tile) return;
  inlineRename(span, tile.name || '', (v) => { if (v != null) { snapshot(); renameTile(ts, tileId, v); } renderTiles(); });
}
