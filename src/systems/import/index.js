// Импорт картинки: выбор файла или drag-n-drop → вставка как есть.
// Растровый редактор не пикселизует изображение.
import { S } from '../../core/state.ts';
import * as bus from '../../core/bus.ts';
import * as actions from '../../core/actions.ts';
import { snapshot, restore } from '../../core/history.js';
import { expandCanvas, placeImageLayer, addImageLayerTop } from '../../core/document.js';
import { MAX_LAYERS, IMPORT_MAX_SIDE } from '../../config/limits.ts';
import { $, toast, t } from '../../core/shell.ts';
import { imageData } from '../../core/image.ts';
import { hasPsdIdentity, isPsdFile } from './psd-file.ts';
import { droppedFileLocation } from './desktop-file.ts';
import { requestPngDropDestination } from '../../ui/import/PngDropDestinationPresenter.ts';
import { beginGalleryImportProgress } from '../../ui/import/GalleryImportProgressPresenter.ts';
import { runGalleryImportProgress } from '../../core/import/GalleryImportProgressRunner.ts';
import { bindFileDrop } from './file-drop.ts';

export function insertPixelImage(im) { // вставить как есть в натуральном размере
  const iw = im.naturalWidth, ih = im.naturalHeight, d = imageData(im, iw, ih, false).data;
  snapshot();
  const nW = Math.max(S.W, iw), nH = Math.max(S.H, ih);
  if (nW !== S.W || nH !== S.H) { const pl = (nW - S.W) >> 1, pt = (nH - S.H) >> 1; expandCanvas(pl, pt, nW - S.W - pl, nH - S.H - pt); }
  if (S.layers.length >= MAX_LAYERS) { restore(S.undoStack.pop()); toast(t('toast.maxLayersDel')); return; }
  placeImageLayer(iw, ih, d); bus.emit('layers'); bus.emit('fit'); toast(t('toast.inserted', { w: iw, h: ih }));
}

// картинку — верхним слоем текущего холста (натуральные пиксели, перебор → ext);
// общий путь для кнопки Import/Photo/File и «Вставить как есть» при drag в редактор
export function insertImageTop(im, name) {
  if (S.layers.length >= MAX_LAYERS) { toast(t('toast.maxLayers')); return; }
  const k = Math.min(1, IMPORT_MAX_SIDE / Math.max(im.naturalWidth, im.naturalHeight));
  const w = Math.max(1, Math.round(im.naturalWidth * k)), h = Math.max(1, Math.round(im.naturalHeight * k));
  const d = imageData(im, w, h, k < 1).data; snapshot(); addImageLayerTop(w, h, d, name);
  bus.emitDoc(); bus.emit('fit'); toast(t('toast.imgImported'));
}

// drop в галерею → новый проект; drop в редактор → верхним слоем (не стирая холст).
const isPngFile = (file) => file.type.toLowerCase() === 'image/png' || /\.png$/i.test(file.name);
const baseName = (name) => name.replace(/\.png$/i, '');
export function insertPngFileAsLayer(file) {
  return new Promise((resolve) => { const url = URL.createObjectURL(file), im = new Image();
    im.onerror = () => { URL.revokeObjectURL(url); toast(t('toast.imgOpenFail')); resolve(false); };
    im.onload = () => { URL.revokeObjectURL(url); insertImageTop(im, baseName(file.name)); resolve(true); };
    im.src = url; });
}
export async function dropImage(file, locationFor = droppedFileLocation, dependencies = {}) { if (!file) return;
  const sourceLocation = locationFor(file);
  const galleryOpen = typeof document !== 'undefined' &&
    Boolean($('gallery')?.classList.contains('on'));
  const runForGallery = (operation) => runGalleryImportProgress(file.name,
    dependencies.beginGalleryProgress ?? beginGalleryImportProgress, operation);
  if (hasPsdIdentity(file) || await isPsdFile(file)) {
    if (galleryOpen) return runForGallery((progress) =>
      actions.run('import.psdFile', file, sourceLocation, progress));
    await actions.run('import.psdFile', file, sourceLocation); return;
  }
  if (!file.type.startsWith('image/') && !/\.(?:png|jpe?g|gif|webp|bmp|avif)$/i.test(file.name)) {
    toast(t('toast.notImage')); return; }
  if (isPngFile(file)) {
    if (galleryOpen) return runForGallery((progress) =>
      actions.run('gallery.importDrop', file, sourceLocation, progress));
    const destination = await (dependencies.choosePngDestination ?? requestPngDropDestination)();
    if (destination === 'document') await actions.run('gallery.importDrop', file, sourceLocation);
    else if (destination === 'layer') await (dependencies.insertPngLayer ?? insertPngFileAsLayer)(file);
    return destination;
  }
  if (galleryOpen) {
    return runForGallery((progress) => actions.run('gallery.importDrop', file, null, progress)); }
  const im = new Image(); im.onerror = () => toast(t('toast.imgOpenFail'));
  im.onload = () => insertImageTop(im); // растровый редактор вставляет как есть
  im.src = URL.createObjectURL(file); }

export function mount() {
  // кнопка импорта редактора и хоткей живут в ./editor.js (единый путь Import)
  bindFileDrop(window, (on) => $('dropmask').classList.toggle('on', on),
    (file) => void dropImage(file));
}
