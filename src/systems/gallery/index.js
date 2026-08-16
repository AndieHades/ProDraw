// Галерея: сборка экрана, кнопки (Photo/Convert/Import/Select), навигация,
// автосохранение, инициализация (на старте открываем галерею).
import * as bus from '../../core/bus.js';
import * as actions from '../../core/actions.js';
import { $ } from '../../core/dom.js';
import { imageData, looksPixelArt } from '../../core/image.js';
import { newWorkFromImage, newWorkFromLayers, beginConvertedWork, saveCurrent, autosave, openWork } from './doc.js';
import { listAll } from './store.js';
import { configure, render, goBack, setSelecting, isSelecting, stackSelected, dupSelected, delSelected } from './screen.js';
import { readPsd } from '../../logic/psd.js';

function setGalleryOpen(on) {
  $('gallery').classList.toggle('on', on);
  document.body.classList.toggle('gallery-open', on);
}

export function show() { saveCurrent(); render(); setGalleryOpen(true); }
// выходя в эдитор, гасим ВСЕ галерейные оверлеи (.gallery-only) — системно, без
// списка id: новый галерейный элемент с этим классом закрывается автоматически
export function hide() { setGalleryOpen(false);
  document.querySelectorAll('.gallery-only.on').forEach((el) => el.classList.remove('on')); }

function pick(accept, fn) { const i = document.createElement('input'); i.type = 'file'; i.accept = accept;
  i.onchange = (e) => { const f = e.target.files[0]; e.target.value = ''; if (f) fn(f); }; i.click(); }

// картинка → новый проект: пиксель-арт сразу как есть, иначе через Pixelize (конвертер)
function fromFile(f) { const im = new Image(); im.onerror = () => {};
  im.onload = () => { if (looksPixelArt(im)) { const d = imageData(im, im.naturalWidth, im.naturalHeight, false); hide(); newWorkFromImage(d.width, d.height, d.data, f.name.replace(/\.\w+$/, '')); }
    else { beginConvertedWork(); actions.run('import.openFile', f); } }; im.src = URL.createObjectURL(f); } // конвертер поверх галереи; уйдём по «Применить»
function photo() { pick('image/*', fromFile); } // не-пиксельная графика уходит в конвертер автоматически (fromFile)
function importPsd() { pick('.psd,image/vnd.adobe.photoshop', async (f) => { try { const psd = readPsd(await f.arrayBuffer());
  if (psd && psd.layers.length) { hide(); newWorkFromLayers(psd.W, psd.H, psd.layers, f.name.replace(/\.psd$/i, '')); } } catch (e) {} }); }

export async function mount() {
  configure({ onOpen: hide });
  $('gal-photo').onclick = photo; $('gal-import').onclick = importPsd;
  $('gal-select').onclick = () => setSelecting(!isSelecting());
  $('gal-stack').onclick = stackSelected; $('gal-dup').onclick = dupSelected; $('gal-del').onclick = delSelected;
  $('gal-back').onclick = goBack;
  $('docsbtn').onclick = show;
  actions.register('gallery.hide', hide); // конвертер/импорт после «Применить» уводят с галереи в редактор
  actions.register('gallery.importDrop', fromFile); // drop картинки в галерею → новый проект (через Pixelize)
  bus.on('snapshot', autosave); bus.on('layers', autosave); bus.on('reference', autosave); bus.on('grid', autosave);
  try { const docs = (await listAll()).filter((d) => d.kind !== 'folder'); // последнюю работу грузим под галереей (для «продолжить»)
    if (docs.length) { const last = docs.sort((a, b) => b.updated - a.updated)[0]; await openWork(last.id); } } catch (e) {}
  show(); // на старте всегда открываем галерею, что бы ни случилось при чтении
}
