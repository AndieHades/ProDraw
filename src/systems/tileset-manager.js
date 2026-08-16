// Менеджер тайлсетов (как менеджер палитр): сохранить текущий тайлсет под
// именем, переименовать, загрузить, список с превью, удалить. Хранится в
// localStorage. Окно строится в JS (без правок index.html).
import { S } from '../core/state.js';
import * as bus from '../core/bus.js';
import * as actions from '../core/actions.js';
import { $, toast, t } from '../core/dom.js';
import { createLibraryDialog } from '../core/library-dialog.js';
import { makeCanvas } from '../core/canvas.js';
import { cloneTileset } from '../logic/tileset-data.js';
import { isTilemap, rasterLayer } from '../core/tilemap.js';
import { activeTileset } from './tile-palette/ops.js';

const STORE = 'tilesetsLib';
const lib = () => { try { return JSON.parse(localStorage.getItem(STORE)) || {}; } catch (e) { return {}; } };
const save = (o) => { try { localStorage.setItem(STORE, JSON.stringify(o)); } catch (e) {} };

let dlg = null, nameIn = null;

// мини-превью тайлсета: первые тайлы подряд
function setPreview(ts) { const n = Math.min(ts.tiles.length, 8), c = makeCanvas(Math.max(1, n) * 10, 10), x = c.getContext('2d');
  x.imageSmoothingEnabled = false; c.className = 'pswatches';
  ts.tiles.slice(0, 8).forEach((tile, i) => { const b = makeCanvas(ts.tileW, ts.tileH), bx = b.getContext('2d'), id = bx.createImageData(ts.tileW, ts.tileH);
    for (let y = 0; y < ts.tileH; y++) for (let xx = 0; xx < ts.tileW; xx++) { const cc = tile.grid[y][xx]; if (!cc) continue;
      const o = (y * ts.tileW + xx) * 4; id.data[o] = cc[0]; id.data[o + 1] = cc[1]; id.data[o + 2] = cc[2]; id.data[o + 3] = cc.length > 3 ? cc[3] : 255; }
    bx.putImageData(id, 0, 0); x.drawImage(b, i * 10, 0, 10, 10); });
  return c; }

function saveCurrent() { const ts = activeTileset(); if (!ts) { toast(t('toast.noTilemap')); return; }
  if (!ts.tiles.length) { toast(t('toast.tilesetEmpty')); return; }
  const nm = (nameIn.value.trim() || ts.name || t('tile.palette')).slice(0, 24); ts.name = nm;
  const st = lib(); st[nm] = cloneTileset(ts); save(st); listUI(); bus.emit('tileset-changed'); }

// загрузить: импортируем как новый тайлсет; если активный слой — tilemap без
// нарисованных клеток, привязываем к нему, иначе кладём в библиотеку проекта
function load(name) { const data = lib()[name]; if (!data) return;
  const nts = { ...cloneTileset(data), id: ++S.tilesetSeq }; S.tilesets.push(nts);
  const L = S.layers[S.cur];
  if (isTilemap(L) && L.tilemap.cells.every((c) => !c)) { L.tilemap.tilesetId = nts.id; rasterLayer(S.cur); }
  S.activeTile = { tilesetId: nts.id, tileId: nts.tiles[0] ? nts.tiles[0].id : null };
  bus.emit('tileset-changed'); bus.emitDoc(); toast(t('toast.tilesetLoaded', { name })); close();
}

function listUI() { const box = dlg && dlg.list; if (!box) return; box.innerHTML = '';
  const st = lib(), names = Object.keys(st);
  if (!names.length) { box.innerHTML = '<p class="hint" style="margin:10px 2px">' + t('tile.noSets') + '</p>'; return; }
  for (const nm of names) { const row = document.createElement('div'); row.className = 'prow';
    const head = document.createElement('div'); head.className = 'prow-top';
    const name = document.createElement('span'); name.className = 'pname'; name.textContent = nm;
    const del = document.createElement('button'); del.className = 'prow-del'; del.title = t('tile.delete');
    del.innerHTML = '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>';
    del.onclick = (e) => { e.stopPropagation(); const s2 = lib(); delete s2[nm]; save(s2); listUI(); };
    head.append(name, del);
    const prev = setPreview(st[nm]); prev.onclick = () => load(nm);
    row.append(head, prev); box.appendChild(row); } }

function build() { if (dlg) return;
  dlg = createLibraryDialog({ overlayId: 'tsetm-ovl', sheetId: 'tsetm-sheet', titleKey: 'tile.loadSet',
    nameId: 'tsetm-name', saveId: 'tsetm-save', saveRowId: 'tsetm-save-row', listId: 'tsetm-list',
    placeholderKey: 'tile.setName', nameMax: 24 });
  nameIn = dlg.name; dlg.save.onclick = saveCurrent; }

const close = () => dlg && dlg.close();
export function open() { build(); const ts = activeTileset(); if (ts) nameIn.value = ts.name || ''; listUI(); dlg.open(); }
export function mount() { build(); actions.register('tileset.manager', open); bus.on('locale', () => { dlg.refresh(); listUI(); }); const b = $('tset-lib'); if (b) b.onclick = open; }
