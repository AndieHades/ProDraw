// Галерея: сборка экрана, кнопки (Photo/Convert/Import/Select), навигация,
// автосохранение, инициализация (на старте открываем галерею).
import * as bus from '../../core/bus.ts';
import * as actions from '../../core/actions.ts';
import { $, t, toast } from '../../ui/dom/ShellDom.ts';
import { imageData, looksPixelArt } from '../../core/image.js';
import { beginConvertedWork, newWorkFromImage, saveCurrent,
  autosave, autosaveInputStarted, beginPsdImport, completePsdImport } from './doc.js';
import { configure, render, goBack, setSelecting, isSelecting, stackSelected, dupSelected, delSelected } from './screen.js';
import { openDesktopFile, PSD_FILTERS } from '../import/desktop-file.js';

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
const isPngFile = (file) => file.type.toLowerCase() === 'image/png' || /\.png$/i.test(file.name);
function fromFile(f, sourceLocation = null) { const im = new Image(), url = URL.createObjectURL(f);
  im.onerror = () => { URL.revokeObjectURL(url); toast(t('toast.imgOpenFail')); };
  im.onload = async () => { URL.revokeObjectURL(url);
    if (isPngFile(f)) { const d = imageData(im, im.naturalWidth, im.naturalHeight, false);
      if (await newWorkFromImage(d.width, d.height, d.data,
        f.name.replace(/\.png$/i, ''), 'png', sourceLocation)) hide();
      else toast(t('toast.documentOpenFailed')); }
    else if (looksPixelArt(im)) { const d = imageData(im, im.naturalWidth, im.naturalHeight, false);
      if (await newWorkFromImage(d.width, d.height, d.data,
        f.name.replace(/\.\w+$/, ''), null, null)) hide(); }
    else { beginConvertedWork(); actions.run('import.openFile', f); } }; im.src = url; } // конвертер поверх галереи; уйдём по «Применить»
function photo() { pick('image/*', fromFile); } // не-пиксельная графика уходит в конвертер автоматически (fromFile)
export const importPsdSelection = (file, location = null) => actions.run('import.psdFile', file, location);
function importPsd() { void openDesktopFile(PSD_FILTERS).then((opened) => {
  if (opened !== undefined) return opened && importPsdSelection(opened.file, opened.location);
  pick('.psd,.psb,image/vnd.adobe.photoshop', importPsdSelection);
}); }

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
  actions.register('gallery.completePsdImport', async (token, document, name, sourceLocation) => {
    const result = await completePsdImport(token, document, name, sourceLocation);
    if (result.status === 'opened') { hide(); toast(result.warningCount
      ? t('toast.psdCompatibility') : t('toast.psdImported', { n: result.layerCount })); }
    return result.status;
  });
  bus.on('stroke-begin', autosaveInputStarted);
  bus.on('snapshot', autosave); bus.on('layers', autosave); bus.on('reference', autosave); bus.on('grid', autosave);
  await show(); // старт не открывает скрытый документ: пользователь явно выбирает файл или New
}
