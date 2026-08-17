// Галерея: сборка экрана, кнопки (Photo/Convert/Import/Select), навигация,
// автосохранение, инициализация (на старте открываем галерею).
import * as bus from '../../core/bus.ts';
import * as actions from '../../core/actions.ts';
import { $, t, toast } from '../../ui/dom/ShellDom.ts';
import { imageData, looksPixelArt } from '../../core/image.js';
import { newWorkFromImage, beginConvertedWork, saveCurrent,
  autosave, autosaveInputStarted, beginPsdImport, completePsdImport } from './doc.js';
import { configure, render, goBack, setSelecting, isSelecting, stackSelected, dupSelected, delSelected } from './screen.js';

let galleryChange = 0, readyTask = Promise.resolve(true), mounted = false;
function setGalleryOpen(on) {
  $('gallery').classList.toggle('on', on);
  document.body.classList.toggle('gallery-open', on);
}

async function finishShow(change) { const saved = await saveCurrent();
  if (change !== galleryChange) return false;
  await render(); return saved && change === galleryChange; }
export function show() { const change = ++galleryChange; setGalleryOpen(true);
  bus.emit('document-transition');
  readyTask = finishShow(change).catch(() => {
    toast(t('toast.documentSaveFailed')); return false;
  }); return readyTask; }
export const whenReady = () => readyTask;
// выходя в эдитор, гасим ВСЕ галерейные оверлеи (.gallery-only) — системно, без
// списка id: новый галерейный элемент с этим классом закрывается автоматически
export function hide() { galleryChange++; setGalleryOpen(false);
  document.querySelectorAll('.gallery-only.on').forEach((el) => el.classList.remove('on')); }

function pick(accept, fn) { const i = document.createElement('input'); i.type = 'file'; i.accept = accept;
  i.onchange = (e) => { const f = e.target.files[0]; e.target.value = ''; if (f) fn(f); }; i.click(); }

// картинка → новый проект: пиксель-арт сразу как есть, иначе через Pixelize (конвертер)
function fromFile(f) { const im = new Image(), url = URL.createObjectURL(f);
  im.onerror = () => { URL.revokeObjectURL(url); toast(t('toast.imgOpenFail')); };
  im.onload = () => { URL.revokeObjectURL(url);
    if (looksPixelArt(im)) { const d = imageData(im, im.naturalWidth, im.naturalHeight, false); hide(); newWorkFromImage(d.width, d.height, d.data, f.name.replace(/\.\w+$/, '')); }
    else { beginConvertedWork(); actions.run('import.openFile', f); } }; im.src = url; } // конвертер поверх галереи; уйдём по «Применить»
function photo() { pick('image/*', fromFile); } // не-пиксельная графика уходит в конвертер автоматически (fromFile)
export const importPsdSelection = (file) => actions.run('import.psdFile', file);
function importPsd() { pick('.psd,.psb,image/vnd.adobe.photoshop', importPsdSelection); }

export async function mount() {
  if (mounted) return whenReady(); mounted = true;
  configure({ onOpen: hide });
  $('gal-photo').onclick = photo; $('gal-import').onclick = importPsd;
  $('gal-select').onclick = () => setSelecting(!isSelecting());
  $('gal-stack').onclick = stackSelected; $('gal-dup').onclick = dupSelected; $('gal-del').onclick = delSelected;
  $('gal-back').onclick = goBack;
  $('docsbtn').onclick = show;
  actions.register('gallery.hide', hide); // конвертер/импорт после «Применить» уводят с галереи в редактор
  actions.register('gallery.importDrop', fromFile); // drop картинки в галерею → новый проект (через Pixelize)
  actions.register('gallery.beginPsdImport', beginPsdImport);
  actions.register('gallery.completePsdImport', async (token, document, name) => {
    const result = await completePsdImport(token, document, name);
    if (result.status === 'opened') { hide(); toast(document.warnings.length
      ? t('toast.psdCompatibility') : t('toast.psdImported', { n: result.layerCount })); }
    return result.status;
  });
  bus.on('stroke-begin', autosaveInputStarted);
  bus.on('snapshot', autosave); bus.on('layers', autosave); bus.on('reference', autosave); bus.on('grid', autosave);
  await show(); // старт не открывает скрытый документ: пользователь явно выбирает файл или New
}
