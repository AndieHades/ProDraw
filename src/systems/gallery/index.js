// Галерея: сборка экрана, кнопки (Photo/Convert/Import/Select), навигация,
// автосохранение, инициализация (на старте открываем галерею).
import * as bus from '../../core/bus.ts';
import * as actions from '../../core/actions.ts';
import { $, t, toast } from '../../ui/dom/ShellDom.ts';
import { imageData, looksPixelArt } from '../../core/image.js';
import { beginConvertedWork, newWorkFromImage, saveCurrent,
  autosave, autosaveInputStarted, beginPsdImport, completePsdImport } from './doc.js';
import { configure, render, goBack, setSelecting, isSelecting, stackSelected, dupSelected, delSelected } from './screen.js';
import { openDesktopFile, PSD_FILTERS } from '../import/desktop-file.ts';
import { decodeImageFile, runGalleryImageImport } from '../import/GalleryImageImport.ts';
import { beginGalleryImportProgress } from '../../ui/import/GalleryImportProgressPresenter.ts';
import { runGalleryImportProgress } from '../../core/import/GalleryImportProgressRunner.ts';

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
const imageImportPorts = () => ({ decodeImage: decodeImageFile, imageData, looksPixelArt,
  newWorkFromImage, beginConvertedWork, onOpened: hide,
  openConverter: (file) => actions.run('import.openFile', file) });
export async function importGalleryImage(f, sourceLocation = null, progress = null,
  dependencies = imageImportPorts()) {
  const result = await runGalleryImageImport(f, sourceLocation, progress, dependencies);
  if (result === 'save-failed') toast(t('toast.documentOpenFailed'));
  else if (result === 'decode-failed') toast(t('toast.imgOpenFail'));
  return result === 'opened' || result === 'converted';
}
function photo() { pick('image/*', (file) => void importGalleryImage(file)); }
export const importPsdSelection = (file, location = null,
  beginProgress = beginGalleryImportProgress) => runGalleryImportProgress(file.name,
  beginProgress, (progress) => actions.run('import.psdFile', file, location, progress));
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
  actions.register('gallery.importDrop', importGalleryImage);
  actions.register('gallery.beginPsdImport', beginPsdImport);
  actions.register('gallery.completePsdImport', async (token, document, name, sourceLocation, progress) => {
    const result = await completePsdImport(token, document, name, sourceLocation, progress);
    if (result.status === 'opened') { hide(); toast(result.warningCount
      ? t('toast.psdCompatibility') : t('toast.psdImported', { n: result.layerCount })); }
    return result.status;
  });
  bus.on('stroke-begin', autosaveInputStarted);
  bus.on('snapshot', autosave); bus.on('layers', autosave); bus.on('reference', autosave); bus.on('grid', autosave);
  await show(); // старт не открывает скрытый документ: пользователь явно выбирает файл или New
}
